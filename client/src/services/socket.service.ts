import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

export interface SocketMessage {
  id: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  senderId: string;
  receiverId: string;
  conversationId: string;
  orderId?: string;
  gigId?: string;
  attachment?: {
    url: string;
    filename: string;
    mimetype: string;
    size: number;
  };
  status: 'sent' | 'delivered' | 'read';
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  sender: {
    id: string;
    displayName: string;
    avatar: string;
  };
  receiver?: {
    id: string;
    displayName: string;
    avatar: string;
  };
}

export interface Conversation {
  id: string;
  type: 'direct' | 'order' | 'gig_inquiry';
  orderId?: string;
  gigId?: string;
  title?: string;
  lastMessage: {
    content: string;
    senderId: string;
    timestamp: string;
    type: 'text' | 'image' | 'file' | 'system';
  };
  participant: {
    id: string;
    displayName: string;
    avatar: string;
    isOnline: boolean;
    lastSeen?: string;
  };
  unreadCount: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OnlineUser {
  userId: string;
  displayName: string;
  avatar: string;
  role: string;
  lastSeen: string;
}

export interface TypingUser {
  userId: string;
  conversationId: string;
  user: {
    displayName: string;
    avatar: string;
  };
}

export interface MessageAttachment {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
}

export type EventCallback = (...args: unknown[]) => void;

// Event payload types
export interface MessageEditedPayload {
  messageId: string;
  newContent: string;
  editedAt: string;
}

export interface MessageDeletedPayload {
  messageId: string;
}

export interface UserTypingPayload {
  userId: string;
  conversationId: string;
  user: {
    displayName: string;
    avatar: string;
  };
}

export interface UserStopTypingPayload {
  userId: string;
  conversationId: string;
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  // Event listeners
  private eventListeners: Map<string, Set<EventCallback>> = new Map();
  private onlineUserIds: Set<string> = new Set();

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const token = this.getAuthToken();
      if (!token) {
        reject(new Error('No authentication token available'));
        return;
      }

      // Disconnect existing socket if any
      if (this.socket) {
        this.socket.disconnect();
      }

      // Create new socket connection
      const apiUrl = import.meta.env.VITE_API_URL ?? '';
      this.socket = io(apiUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
      });

      // Connection events
      this.socket.on('connect', () => {
        // eslint-disable-next-line no-console
        console.log('[avatarx-client] Connected to Socket.IO server');
        this.reconnectAttempts = 0;
        this.emit('connected');
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        // eslint-disable-next-line no-console
        console.log('[avatarx-client] Disconnected from Socket.IO server:', reason);
        this.emit('disconnected', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.error('[avatarx-client] Socket.IO connection error:', error);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Failed to connect to Socket.IO server'));
        }
      });

      // Message events
      this.socket.on('new_message', (message: SocketMessage) => {
        this.emit('new_message', message);
      });

      this.socket.on('new_message_notification', (data: { conversationId: string; message: SocketMessage }) => {
        this.emit('new_message_notification', data);
      });

      this.socket.on('message_edited', (data: { messageId: string; newContent: string; editedAt: string }) => {
        this.emit('message_edited', data);
      });

      this.socket.on('message_deleted', (data: { messageId: string }) => {
        this.emit('message_deleted', data);
      });

      // Conversation events
      this.socket.on('conversation_created', (conversation: Conversation) => {
        this.emit('conversation_created', conversation);
      });

      this.socket.on('new_conversation', (conversation: Conversation) => {
        this.emit('new_conversation', conversation);
      });

      this.socket.on('conversation_exists', (conversation: Conversation) => {
        this.emit('conversation_exists', conversation);
      });

      // Typing events
      this.socket.on('user_typing', (typingUser: TypingUser) => {
        this.emit('user_typing', typingUser);
      });

      this.socket.on('user_stop_typing', (data: { userId: string; conversationId: string }) => {
        this.emit('user_stop_typing', data);
      });

      // Online users
      this.socket.on('online_users_updated', (users: OnlineUser[]) => {
        this.onlineUserIds = new Set(users.map((u) => u.userId));
        this.emit('online_users_updated', users);
      });

      // Room events
      this.socket.on('joined_conversation', (data: { conversationId: string }) => {
        this.emit('joined_conversation', data);
      });

      this.socket.on('left_conversation', (data: { conversationId: string }) => {
        this.emit('left_conversation', data);
      });

      // Messages read
      this.socket.on('messages_marked_read', (data: { conversationId: string }) => {
        this.emit('messages_marked_read', data);
      });

      // Error handling
      this.socket.on('error', (error: { message: string }) => {
        console.error('[avatarx-client] Socket.IO error:', error);
        this.emit('error', error);
      });

      // Setup cleanup on page unload
      if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => {
          this.disconnect();
        });
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventListeners.clear();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Conversation management
  joinConversation(conversationId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_conversation', conversationId);
    }
  }

  leaveConversation(conversationId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave_conversation', conversationId);
    }
  }

  createConversation(participantId: string, type: 'direct' | 'order' | 'gig_inquiry' = 'direct', orderId?: string, gigId?: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('create_conversation', { participantId, type, orderId, gigId });
    }
  }

  // Message operations
  sendMessage(data: {
    conversationId: string;
    content: string;
    type?: 'text' | 'image' | 'file';
    attachment?: MessageAttachment;
    orderId?: string;
    gigId?: string;
  }): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('send_message', data);
    }
  }

  editMessage(messageId: string, newContent: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('edit_message', { messageId, newContent });
    }
  }

  deleteMessage(messageId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('delete_message', messageId);
    }
  }

  markMessagesAsRead(conversationId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('mark_messages_read', conversationId);
    }
  }

  // Typing indicators
  startTyping(conversationId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing_start', conversationId);
    }
  }

  stopTyping(conversationId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing_stop', conversationId);
    }
  }

  // Data fetching
  getConversations(page = 1, limit = 20): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('get_conversations', page, limit);
    }
  }

  getMessages(conversationId: string, page = 1, limit = 50): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('get_messages', { conversationId, page, limit });
    }
  }

  // Event management
  on(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: string, callback?: EventCallback): void {
    if (callback) {
      this.eventListeners.get(event)?.delete(callback);
    } else {
      this.eventListeners.delete(event);
    }
  }

  private emit(event: string, ...args: unknown[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`[avatarx-client] Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Debug utility for Milestone A test console
  public triggerDevEvent(event: string, payload: unknown): void {
    if (this.socket && this.socket.connected) {
      // Emit to backend to relay across ALL tabs
      this.socket.emit('trigger_dev_event', { event, payload });
    } else {
      // Fallback to local if offline
      this.emit(event, payload);
    }
  }

  private getAuthToken(): string | null {
    try {
      const state = useAuthStore.getState() as { accessToken?: string };
      if (state.accessToken) return state.accessToken;
    } catch {
      // Auth store not available
    }

    return null;
  }

  // Utility methods
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  getOnlineUsersCount(): number {
    return this.onlineUserIds.size;
  }

  isUserOnline(userId: string): boolean {
    return this.onlineUserIds.has(userId);
  }
}

// Create singleton instance
export const socketService = new SocketService();

// Export types for use in components
export type { SocketService };
