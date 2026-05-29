import type { Request, Response } from 'express';
import { Message, Conversation } from '../models/message.model';
import { User } from '../models/user.model';
import type { AuthRequest } from '../middleware/auth.middleware';

// Get conversations
export async function getConversationsHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const {
      page = 1,
      limit = 20,
      type,
      unreadOnly = false,
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter: any = {
      participants: req.userId,
      isActive: true,
    };

    if (type) {
      filter.type = type;
    }

    if (unreadOnly === 'true') {
      filter[`unreadCounts.${req.userId}`] = { $gt: 0 };
    }

    const conversations = await Conversation.find(filter)
      .populate('participants', 'displayName avatar isOnline lastSeen')
      .populate('lastMessage.senderId', 'displayName avatar')
      .sort({ 'lastMessage.timestamp': -1 })
      .skip(skip)
      .limit(limitNum);

    // Add participant details and unread counts
    const conversationsWithDetails = conversations.map(conv => {
      const otherParticipant = conv.participants.find(
        (p: any) => p._id.toString() !== req.userId
      );
      
      return {
        id: conv._id,
        type: conv.type,
        orderId: conv.orderId,
        gigId: conv.gigId,
        title: conv.title,
        lastMessage: conv.lastMessage,
        participant: otherParticipant,
        unreadCount: conv.unreadCounts[req.userId as string] || 0,
        isArchived: conv.isArchived[req.userId as string] || false,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      };
    });

    const total = await Conversation.countDocuments(filter);

    res.json({
      ok: true,
      conversations: conversationsWithDetails,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });

  } catch (error) {
    console.error('[avatarx-server] getConversations error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

// Get single conversation
export async function getConversationHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'displayName avatar isOnline lastSeen')
      .populate('lastMessage.senderId', 'displayName avatar');

    if (!conversation) {
      res.status(404).json({ ok: false, error: { message: 'Conversation not found' } });
      return;
    }

    // Check if user is participant
    if (!conversation.participants.some((p: any) => p._id.toString() === req.userId)) {
      res.status(403).json({ ok: false, error: { message: 'Access denied' } });
      return;
    }

    const otherParticipant = conversation.participants.find(
      (p: any) => p._id.toString() !== req.userId
    );

    const conversationWithDetails = {
      id: conversation._id,
      type: conversation.type,
      orderId: conversation.orderId,
      gigId: conversation.gigId,
      title: conversation.title,
      lastMessage: conversation.lastMessage,
      participant: otherParticipant,
      unreadCount: conversation.unreadCounts[req.userId as string] || 0,
      isArchived: conversation.isArchived[req.userId as string] || false,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };

    res.json({
      ok: true,
      conversation: conversationWithDetails,
    });

  } catch (error) {
    console.error('[avatarx-server] getConversation error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

// Get messages
export async function getMessagesHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { conversationId } = req.params;
    const {
      page = 1,
      limit = 50,
      before,
      after,
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Validate conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      res.status(404).json({ ok: false, error: { message: 'Conversation not found' } });
      return;
    }

    // Check if user is participant
    if (!conversation.participants.some((p: any) => p._id.toString() === req.userId)) {
      res.status(403).json({ ok: false, error: { message: 'Access denied' } });
      return;
    }

    // Build filter
    const filter: any = {
      conversationId,
      isDeleted: false,
    };

    if (before) {
      filter.createdAt = { $lt: new Date(before as string) };
    } else if (after) {
      filter.createdAt = { $gt: new Date(after as string) };
    }

    const messages = await Message.find(filter)
      .populate('senderId', 'displayName avatar')
      .populate('receiverId', 'displayName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Mark messages as read
    await Message.updateMany(
      {
        conversationId,
        receiverId: req.userId,
        status: { $in: ['sent', 'delivered'] },
      },
      {
        status: 'read',
        readAt: new Date(),
      }
    );

    // Update conversation unread count
    await Conversation.findByIdAndUpdate(conversationId, {
      [`unreadCounts.${req.userId}`]: 0,
    });

    res.json({
      ok: true,
      messages: messages.reverse(), // Reverse to show oldest first
      hasMore: messages.length === limitNum,
    });

  } catch (error) {
    console.error('[avatarx-server] getMessages error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

// Create conversation
export async function createConversationHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const {
      participantId,
      type = 'direct',
      orderId,
      gigId,
      title,
    } = req.body;

    if (!participantId) {
      res.status(400).json({ ok: false, error: { message: 'Participant ID is required' } });
      return;
    }

    // Validate participant exists
    const participant = await User.findById(participantId);
    if (!participant) {
      res.status(404).json({ ok: false, error: { message: 'Participant not found' } });
      return;
    }

    // Check if direct conversation already exists
    if (type === 'direct') {
      const existingConversation = await Conversation.findDirectConversation(
        req.userId as any,
        participantId
      );
      
      if (existingConversation) {
        return res.json({
          ok: true,
          conversation: existingConversation,
          message: 'Conversation already exists',
        });
      }
    }

    // Create new conversation
    const conversation = new Conversation({
      participants: [req.userId, participantId],
      type,
      orderId,
      gigId,
      title,
      lastMessage: {
        content: 'Conversation started',
        senderId: req.userId,
        timestamp: new Date(),
        type: 'system',
      },
    });

    await conversation.save();

    // Populate and return
    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'displayName avatar isOnline lastSeen')
      .populate('lastMessage.senderId', 'displayName avatar');

    const otherParticipant = populatedConversation?.participants.find(
      (p: any) => p._id.toString() !== req.userId
    );

    const conversationWithDetails = {
      id: populatedConversation?._id,
      type: populatedConversation?.type,
      orderId: populatedConversation?.orderId,
      gigId: populatedConversation?.gigId,
      title: populatedConversation?.title,
      lastMessage: populatedConversation?.lastMessage,
      participant: otherParticipant,
      unreadCount: 0,
      isArchived: false,
      createdAt: populatedConversation?.createdAt,
      updatedAt: populatedConversation?.updatedAt,
    };

    res.status(201).json({
      ok: true,
      conversation: conversationWithDetails,
    });

  } catch (error) {
    console.error('[avatarx-server] createConversation error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

// Send message
export async function sendMessageHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const {
      conversationId,
      content,
      type = 'text',
      attachment,
      orderId,
      gigId,
    } = req.body;

    if (!conversationId || !content) {
      res.status(400).json({ ok: false, error: { message: 'Conversation ID and content are required' } });
      return;
    }

    // Validate conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      res.status(404).json({ ok: false, error: { message: 'Conversation not found' } });
      return;
    }

    // Check if user is participant
    if (!conversation.participants.some((p: any) => p._id.toString() === req.userId)) {
      res.status(403).json({ ok: false, error: { message: 'Access denied' } });
      return;
    }

    // Find receiver
    const receiverId = conversation.participants.find(
      (id: any) => id.toString() !== req.userId
    );
    
    if (!receiverId) {
      res.status(400).json({ ok: false, error: { message: 'No receiver found' } });
      return;
    }

    // Create message
    const message = new Message({
      content,
      type,
      senderId: req.userId,
      receiverId,
      conversationId,
      orderId,
      gigId,
      attachment,
      status: 'sent',
    });

    await message.save();

    // Update conversation last message
    await conversation.updateLastMessage(content, req.userId as any, type);

    // Increment unread count for receiver
    await conversation.incrementUnread(receiverId.toString());

    // Populate message details
    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'displayName avatar')
      .populate('receiverId', 'displayName avatar');

    res.status(201).json({
      ok: true,
      message: populatedMessage,
    });

  } catch (error) {
    console.error('[avatarx-server] sendMessage error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

// Edit message
export async function editMessageHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { messageId } = req.params;
    const { newContent } = req.body;

    if (!newContent || newContent.trim().length === 0) {
      res.status(400).json({ ok: false, error: { message: 'Content is required' } });
      return;
    }

    const message = await Message.findById(messageId);
    if (!message) {
      res.status(404).json({ ok: false, error: { message: 'Message not found' } });
      return;
    }

    // Check if user is sender
    if (message.senderId.toString() !== req.userId) {
      res.status(403).json({ ok: false, error: { message: 'Access denied' } });
      return;
    }

    // Check if message is too old to edit (e.g., 15 minutes)
    const editTimeLimit = 15 * 60 * 1000; // 15 minutes
    if (Date.now() - message.createdAt.getTime() > editTimeLimit) {
      res.status(400).json({ ok: false, error: { message: 'Message can only be edited within 15 minutes' } });
      return;
    }

    // Edit message
    await message.edit(newContent.trim());

    res.json({
      ok: true,
      message: {
        id: message._id,
        content: message.content,
        isEdited: message.isEdited,
        editedAt: message.editedAt,
      },
    });

  } catch (error) {
    console.error('[avatarx-server] editMessage error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

// Delete message
export async function deleteMessageHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      res.status(404).json({ ok: false, error: { message: 'Message not found' } });
      return;
    }

    // Check if user is sender
    if (message.senderId.toString() !== req.userId) {
      res.status(403).json({ ok: false, error: { message: 'Access denied' } });
      return;
    }

    // Soft delete message
    await message.softDelete();

    res.json({
      ok: true,
      messageId,
    });

  } catch (error) {
    console.error('[avatarx-server] deleteMessage error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

// Mark messages as read
export async function markAsReadHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { conversationId } = req.params;

    // Validate conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      res.status(404).json({ ok: false, error: { message: 'Conversation not found' } });
      return;
    }

    // Check if user is participant
    if (!conversation.participants.some((p: any) => p._id.toString() === req.userId)) {
      res.status(403).json({ ok: false, error: { message: 'Access denied' } });
      return;
    }

    // Mark messages as read
    await Message.updateMany(
      {
        conversationId,
        receiverId: req.userId,
        status: { $in: ['sent', 'delivered'] },
      },
      {
        status: 'read',
        readAt: new Date(),
      }
    );

    // Update conversation unread count
    await Conversation.findByIdAndUpdate(conversationId, {
      [`unreadCounts.${req.userId}`]: 0,
    });

    res.json({
      ok: true,
    });

  } catch (error) {
    console.error('[avatarx-server] markAsRead error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

// Archive/unarchive conversation
export async function archiveConversationHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { conversationId } = req.params;
    const { archive = true } = req.body;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      res.status(404).json({ ok: false, error: { message: 'Conversation not found' } });
      return;
    }

    // Check if user is participant
    if (!conversation.participants.some((p: any) => p._id.toString() === req.userId)) {
      res.status(403).json({ ok: false, error: { message: 'Access denied' } });
      return;
    }

    if (archive) {
      await conversation.archive(req.userId);
    } else {
      await conversation.unarchive(req.userId);
    }

    res.json({
      ok: true,
      isArchived: archive,
    });

  } catch (error) {
    console.error('[avatarx-server] archiveConversation error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

// Get unread count
export async function getUnreadCountHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const conversations = await Conversation.find({
      participants: req.userId,
      isActive: true,
    });

    const totalUnread = conversations.reduce((total, conv) => {
      return total + (conv.unreadCounts[req.userId as string] || 0);
    }, 0);

    res.json({
      ok: true,
      unreadCount: totalUnread,
    });

  } catch (error) {
    console.error('[avatarx-server] getUnreadCount error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}
