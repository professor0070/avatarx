import mongoose from 'mongoose';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { Message, Conversation } from '../models/message.model';
import { User } from '../models/user.model';
import type { IUser } from '../models/user.model';
interface TokenPayload extends JwtPayload {
  userId: string;
}

type SocketUser = Pick<IUser, 'displayName' | 'avatar' | 'role' | 'roles' | 'activeRole' | 'isOnline'>;

interface AuthenticatedSocket extends Socket {
  userId: string;
  user: SocketUser;
}

interface AttachmentData {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
}

interface OnlineUser {
  userId: string;
  socketId: string;
  user: SocketUser;
  lastSeen: Date;
}

interface TypingUser {
  userId: string;
  conversationId: string;
  timestamp: Date;
}

export class SocketService {
  private static instance: SocketService;
  private io: SocketIOServer;
  private onlineUsers: Map<string, OnlineUser> = new Map();
  private userSockets: Map<string, Set<string>> = new Map();
  private typingUsers: Map<string, TypingUser> = new Map();
  private typingTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;
    if (!SocketService.instance) {
      SocketService.instance = this;
    }
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      throw new Error('SocketService not initialized');
    }
    return SocketService.instance;
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        // Verify JWT token using access secret
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as TokenPayload;
        
        // Get user details
        const user = await User.findById(decoded.userId).select('displayName avatar role roles activeRole isOnline');
        if (!user) {
          return next(new Error('User not found'));
        }

        // Add user info to socket
        (socket as AuthenticatedSocket).userId = user._id.toString();
        (socket as AuthenticatedSocket).user = user;

        next();
      } catch (error) {
        console.error('[avatarx-server] Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {
      const authSocket = socket as AuthenticatedSocket;
      const userId = authSocket.userId;
      const user = authSocket.user;

      console.log(`[avatarx-server] User connection established`);

      // Track socket for O(1) lookup
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      // Add to online users
      this.onlineUsers.set(userId, {
        userId,
        socketId: socket.id,
        user,
        lastSeen: new Date(),
      });

      // Update user online status
      this.updateUserOnlineStatus(userId, true);

      // Join user to their personal room for private notifications
      socket.join(`user:${userId}`);

      // Join user to their conversation rooms
      this.joinUserToConversations(authSocket, userId);

      // Send online users list to all connected clients
      this.broadcastOnlineUsers();

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`[avatarx-server] User connection closed`);
        
        // Remove socket from tracked sockets
        const sockets = this.userSockets.get(userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            this.userSockets.delete(userId);
          }
        }

        // Remove from online users
        this.onlineUsers.delete(userId);
        
        // Update user online status
        this.updateUserOnlineStatus(userId, false);
        
        // Clean up typing indicators and pending timeouts
        this.cleanupTypingUser(userId);
        this.cleanupTypingTimeouts(userId);
        
        // Broadcast updated online users
        this.broadcastOnlineUsers();
      });

      // Handle joining conversations
      socket.on('join_conversation', async (conversationId: string) => {
        try {
          const conversation = await Conversation.findById(conversationId);
          if (!conversation) {
            socket.emit('error', { message: 'Conversation not found' });
            return;
          }

          // Check if user is participant
          if (!conversation.participants.some((id) => id.toString() === userId)) {
            socket.emit('error', { message: 'Access denied' });
            return;
          }

          socket.join(`conversation:${conversationId}`);
          
          // Mark messages as read
          await this.markMessagesAsRead(conversationId, userId);
          
          socket.emit('joined_conversation', { conversationId });
        } catch (error) {
          console.error('[avatarx-server] Join conversation error:', error);
          socket.emit('error', { message: 'Failed to join conversation' });
        }
      });

      // Handle leaving conversations
      socket.on('leave_conversation', (conversationId: string) => {
        socket.leave(`conversation:${conversationId}`);
        socket.emit('left_conversation', { conversationId });
      });

      // Handle sending messages
      socket.on('send_message', async (data: {
        conversationId: string;
        content: string;
        type: 'text' | 'image' | 'file';
        attachment?: AttachmentData;
        orderId?: string;
        gigId?: string;
      }) => {
        try {
          const { conversationId, content, type, attachment, orderId, gigId } = data;

          // Validate and sanitize message content
          const sanitizedContent = content.trim().replace(/<[^>]*>/g, '');
          if (!sanitizedContent) {
            socket.emit('error', { message: 'Message content is required' });
            return;
          }
          if (sanitizedContent.length > 2000) {
            socket.emit('error', { message: 'Message content exceeds 2000 characters' });
            return;
          }
          if (attachment && attachment.size > 10 * 1024 * 1024) {
            socket.emit('error', { message: 'Attachment size exceeds 10MB limit' });
            return;
          }

          // Validate conversation
          const conversation = await Conversation.findById(conversationId);
          if (!conversation) {
            socket.emit('error', { message: 'Conversation not found' });
            return;
          }

          // Check if user is participant
          if (!conversation.participants.some((id) => id.toString() === userId)) {
            socket.emit('error', { message: 'Access denied' });
            return;
          }

          // Find receiver
          const receiverId = conversation.participants.find(
            (id) => id.toString() !== userId
          );
          
          if (!receiverId) {
            socket.emit('error', { message: 'No receiver found' });
            return;
          }

          // Create message
          const message = new Message({
            content: sanitizedContent,
            type,
            senderId: userId,
            receiverId,
            conversationId,
            orderId,
            gigId,
            attachment,
            status: 'sent',
          });

          await message.save();

          // Update conversation last message
          const senderObjectId = new mongoose.Types.ObjectId(userId);
          await conversation.updateLastMessage(sanitizedContent, senderObjectId, type);

          // Increment unread count for receiver
          await conversation.incrementUnread(receiverId.toString());

          // Populate message details
          const populatedMessage = await Message.findById(message._id)
            .populate('senderId', 'displayName avatar')
            .populate('receiverId', 'displayName avatar');

          // Send to conversation room
          this.io.to(`conversation:${conversationId}`).emit('new_message', populatedMessage);

          // Send to receiver's personal room if not in conversation
          const receiverSocket = this.getSocketByUserId(receiverId.toString());
          if (receiverSocket && !receiverSocket.rooms.has(`conversation:${conversationId}`)) {
            this.io.to(`user:${receiverId.toString()}`).emit('new_message_notification', {
              conversationId,
              message: populatedMessage,
            });
          }

        } catch (error) {
          console.error('[avatarx-server] Send message error:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Handle marking messages as read
      socket.on('mark_messages_read', async (conversationId: string) => {
        try {
          await this.markMessagesAsRead(conversationId, userId);
          socket.emit('messages_marked_read', { conversationId });
        } catch (error) {
          console.error('[avatarx-server] Mark messages read error:', error);
          socket.emit('error', { message: 'Failed to mark messages as read' });
        }
      });

      // Handle typing indicators
      socket.on('typing_start', (conversationId: string) => {
        this.typingUsers.set(`${userId}:${conversationId}`, {
          userId,
          conversationId,
          timestamp: new Date(),
        });

        // Broadcast to conversation room (excluding sender)
        socket.to(`conversation:${conversationId}`).emit('user_typing', {
          userId,
          conversationId,
          user: {
            displayName: user.displayName,
            avatar: user.avatar,
          },
        });

        // Track timeout for cleanup on disconnect
        const timeoutKey = `${userId}:${conversationId}`;
        const existingTimeout = this.typingTimeouts.get(timeoutKey);
        if (existingTimeout) clearTimeout(existingTimeout);

        const timeoutId = setTimeout(() => {
          this.typingTimeouts.delete(timeoutKey);
          this.cleanupTypingUser(userId, conversationId);
        }, 5000);
        this.typingTimeouts.set(timeoutKey, timeoutId);
      });

      socket.on('typing_stop', (conversationId: string) => {
        const timeoutKey = `${userId}:${conversationId}`;
        const timeoutId = this.typingTimeouts.get(timeoutKey);
        if (timeoutId) {
          clearTimeout(timeoutId);
          this.typingTimeouts.delete(timeoutKey);
        }
        this.cleanupTypingUser(userId, conversationId);
        socket.to(`conversation:${conversationId}`).emit('user_stop_typing', {
          userId,
          conversationId,
        });
      });

      // Handle creating conversations
      socket.on('create_conversation', async (data: {
        participantId: string;
        type: 'direct' | 'order' | 'gig_inquiry';
        orderId?: string;
        gigId?: string;
      }) => {
        try {
          const { participantId, type, orderId, gigId } = data;

          const userIdObject = new mongoose.Types.ObjectId(userId);
          const participantObjectId = new mongoose.Types.ObjectId(participantId);

          // Check if direct conversation already exists
          if (type === 'direct') {
            const existingConversation = await Conversation.findDirectConversation(
              userIdObject,
              participantObjectId
            );
            
            if (existingConversation) {
              socket.emit('conversation_exists', existingConversation);
              return;
            }
          }

          // Create new conversation
          const conversation = new Conversation({
            participants: [userIdObject, participantObjectId],
            type,
            orderId,
            gigId,
            lastMessage: {
              content: 'Conversation started',
              senderId: userIdObject,
              timestamp: new Date(),
              type: 'system',
            },
          });

          await conversation.save();

          // Join both users to conversation
          socket.join(`conversation:${conversation._id}`);
          const participantSocket = this.getSocketByUserId(participantId);
          if (participantSocket) {
            participantSocket.join(`conversation:${conversation._id}`);
          }

          // Populate and send conversation details
          const populatedConversation = await Conversation.findById(conversation._id)
            .populate('participants', 'displayName avatar');

          socket.emit('conversation_created', populatedConversation);
          
          if (participantSocket) {
            participantSocket.emit('new_conversation', populatedConversation);
          }

        } catch (error) {
          console.error('[avatarx-server] Create conversation error:', error);
          socket.emit('error', { message: 'Failed to create conversation' });
        }
      });

      // Handle getting conversation list
      socket.on('get_conversations', async (page = 1, limit = 20) => {
        try {
          const userIdObject = new mongoose.Types.ObjectId(userId);
          const conversations = await Conversation.getUserConversations(
            userIdObject,
            page,
            limit
          );
          
          socket.emit('conversations_list', conversations);
        } catch (error) {
          console.error('[avatarx-server] Get conversations error:', error);
          socket.emit('error', { message: 'Failed to get conversations' });
        }
      });

      // Handle getting conversation messages
      socket.on('get_messages', async (data: {
        conversationId: string;
        page?: number;
        limit?: number;
      }) => {
        try {
          const { conversationId, page = 1, limit = 50 } = data;

          // Validate conversation
          const conversation = await Conversation.findById(conversationId);
          if (!conversation) {
            socket.emit('error', { message: 'Conversation not found' });
            return;
          }

          // Check if user is participant
          if (!conversation.participants.some((id) => id.toString() === userId)) {
            socket.emit('error', { message: 'Access denied' });
            return;
          }

          const skip = (page - 1) * limit;

          const messages = await Message.find({
            conversationId,
            isDeleted: false,
          })
          .populate('senderId', 'displayName avatar')
          .populate('receiverId', 'displayName avatar')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit);

          socket.emit('messages_list', {
            conversationId,
            messages: messages.reverse(), // Reverse to show oldest first
            hasMore: messages.length === limit,
          });

        } catch (error) {
          console.error('[avatarx-server] Get messages error:', error);
          socket.emit('error', { message: 'Failed to get messages' });
        }
      });

      // Handle editing messages
      socket.on('edit_message', async (data: {
        messageId: string;
        newContent: string;
      }) => {
        try {
          const { messageId, newContent } = data;

          // Sanitize edited content
          const sanitizedContent = newContent.trim().replace(/<[^>]*>/g, '');
          if (!sanitizedContent) {
            socket.emit('error', { message: 'Message content is required' });
            return;
          }
          if (sanitizedContent.length > 2000) {
            socket.emit('error', { message: 'Message content exceeds 2000 characters' });
            return;
          }

          const message = await Message.findById(messageId);
          if (!message) {
            socket.emit('error', { message: 'Message not found' });
            return;
          }

          // Check if user is sender
          if (message.senderId.toString() !== userId) {
            socket.emit('error', { message: 'Access denied' });
            return;
          }

          // Edit message
          await message.edit(sanitizedContent);

          // Broadcast to conversation
          this.io.to(`conversation:${message.conversationId}`).emit('message_edited', {
            messageId,
            newContent: sanitizedContent,
            editedAt: message.editedAt,
          });

        } catch (error) {
          console.error('[avatarx-server] Edit message error:', error);
          socket.emit('error', { message: 'Failed to edit message' });
        }
      });

      // Handle deleting messages
      socket.on('delete_message', async (messageId: string) => {
        try {
          const message = await Message.findById(messageId);
          if (!message) {
            socket.emit('error', { message: 'Message not found' });
            return;
          }

          // Check if user is sender
          if (message.senderId.toString() !== userId) {
            socket.emit('error', { message: 'Access denied' });
            return;
          }

          // Soft delete message
          await message.softDelete();

          // Broadcast to conversation
          this.io.to(`conversation:${message.conversationId}`).emit('message_deleted', {
            messageId,
          });

        } catch (error) {
          console.error('[avatarx-server] Delete message error:', error);
          socket.emit('error', { message: 'Failed to delete message' });
        }
      });

      // Relay debug events for cross-tab sync during testing
      socket.on('trigger_dev_event', (data: { event: string, payload: unknown }) => {
        // Broadcast the event to all sockets for this user across all their tabs
        this.io.to(`user:${userId}`).emit(data.event, data.payload);
      });
    });
  }

  private async joinUserToConversations(socket: AuthenticatedSocket, userId: string) {
    try {
      const conversations = await Conversation.find({
        participants: userId,
        isActive: true,
      });

      for (const conversation of conversations) {
        socket.join(`conversation:${conversation._id}`);
      }
    } catch (error) {
      console.error('[avatarx-server] Error joining user to conversations:', error);
    }
  }

  private async updateUserOnlineStatus(userId: string, isOnline: boolean) {
    try {
      await User.findByIdAndUpdate(userId, {
        isOnline,
        lastSeen: new Date(),
      });
    } catch (error) {
      console.error('[avatarx-server] Error updating user online status:', error);
    }
  }

  private async markMessagesAsRead(conversationId: string, userId: string) {
    try {
      await Message.updateMany(
        {
          conversationId,
          receiverId: userId,
          status: { $in: ['sent', 'delivered'] },
        },
        {
          status: 'read',
          readAt: new Date(),
        }
      );

      await Conversation.findByIdAndUpdate(conversationId, {
        [`unreadCounts.${userId}`]: 0,
      });
    } catch (error) {
      console.error('[avatarx-server] Error marking messages as read:', error);
    }
  }

  private cleanupTypingUser(userId: string, conversationId?: string) {
    const key = conversationId ? `${userId}:${conversationId}` : `${userId}:`;
    
    for (const [typingKey, typingUser] of this.typingUsers.entries()) {
      if (typingKey.startsWith(key)) {
        this.typingUsers.delete(typingKey);
        
        // Broadcast stop typing to conversation
        if (typingUser.conversationId) {
          this.io.to(`conversation:${typingUser.conversationId}`).emit('user_stop_typing', {
            userId: typingUser.userId,
            conversationId: typingUser.conversationId,
          });
        }
      }
    }
  }

  private cleanupTypingTimeouts(userId: string) {
    const prefix = `${userId}:`;
    for (const [key, timeoutId] of this.typingTimeouts.entries()) {
      if (key.startsWith(prefix)) {
        clearTimeout(timeoutId);
        this.typingTimeouts.delete(key);
      }
    }
  }

  private getSocketByUserId(userId: string): AuthenticatedSocket | null {
    const socketIds = this.userSockets.get(userId);
    if (!socketIds || socketIds.size === 0) return null;

    for (const socketId of socketIds) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) return socket as AuthenticatedSocket;
    }

    return null;
  }

  private broadcastOnlineUsers() {
    const onlineUsersList = Array.from(this.onlineUsers.values()).map(user => ({
      userId: user.userId,
      displayName: user.user.displayName,
      avatar: user.user.avatar,
      role: user.user.activeRole || user.user.role,
      roles: user.user.roles,
      activeRole: user.user.activeRole,
      lastSeen: user.lastSeen,
    }));

    this.io.emit('online_users_updated', onlineUsersList);
  }

  // Public methods for external use
  public sendNotificationToUser(userId: string, notification: Record<string, unknown>) {
    this.io.to(`user:${userId}`).emit('notification', notification);
  }

  public broadcastToConversation(conversationId: string, event: string, data: Record<string, unknown>) {
    this.io.to(`conversation:${conversationId}`).emit(event, data);
  }

  public getOnlineUserCount(): number {
    return this.onlineUsers.size;
  }

  public isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }
}
