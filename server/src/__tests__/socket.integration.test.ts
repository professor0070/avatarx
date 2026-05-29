import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as ioc, type Socket as ClientSocket } from 'socket.io-client';
import { setupTestDB, teardownTestDB, createTestApp, createSocketServer, createTestUser, createTestSeller } from '../test-utils/test-setup';
import type { Server as SocketIOServer } from 'socket.io';
import type http from 'http';
import type express from 'express';

let app: express.Express;
let httpServer: http.Server;
let io: SocketIOServer;
let buyerToken: string;
let sellerToken: string;
let buyerId: string;
let sellerId: string;
let buyerSocket: ClientSocket;
let sellerSocket: ClientSocket;

const TEST_PORT = 8899;

beforeAll(async () => {
  await setupTestDB();
  app = createTestApp();
  const server = createSocketServer(app);
  httpServer = server.httpServer;
  io = server.io;

  await new Promise<void>((resolve) => httpServer.listen(TEST_PORT, resolve));

  const buyer = await createTestUser();
  const seller = await createTestSeller();
  buyerToken = buyer.accessToken;
  sellerToken = seller.accessToken;
  buyerId = buyer.user._id.toString();
  sellerId = seller.user._id.toString();
}, 60000);

afterAll(async () => {
  if (buyerSocket?.connected) buyerSocket.disconnect();
  if (sellerSocket?.connected) sellerSocket.disconnect();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  io.close();
  await teardownTestDB();
});

function connectSocket(token: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = ioc(`http://localhost:${TEST_PORT}`, {
      auth: { token },
      transports: ['polling', 'websocket'],
      forceNew: true,
    });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (err) => {
      socket.close();
      reject(err);
    });
    setTimeout(() => {
      socket.close();
      reject(new Error('Socket connection timeout'));
    }, 10000);
  });
}

describe('Socket Authentication', () => {
  it('should connect with valid JWT token', { timeout: 15000 }, async () => {
    buyerSocket = await connectSocket(buyerToken);
    expect(buyerSocket.connected).toBe(true);

    const connected = await new Promise<{ ok: boolean; socketId: string }>((resolve) => {
      buyerSocket.once('server:connected', (data) => resolve(data));
    });
    expect(connected.ok).toBe(true);
    expect(connected.socketId).toBeDefined();
  });

  it('should reject connection without token', async () => {
    await expect(connectSocket('')).rejects.toThrow('Authentication required');
  });

  it('should reject connection with invalid token', async () => {
    await expect(connectSocket('invalid-token')).rejects.toThrow('Authentication failed');
  });
});

describe('Socket Messaging', () => {
  let conversationId: string;

  beforeAll(async () => {
    if (!buyerSocket?.connected) {
      buyerSocket = await connectSocket(buyerToken);
    }
    sellerSocket = await connectSocket(sellerToken);

    conversationId = await new Promise<string>((resolve, reject) => {
      buyerSocket.emit('create_conversation', {
        participantId: sellerId,
        type: 'direct',
      });
      buyerSocket.once('conversation_created', (conv: any) => {
        resolve(conv._id);
      });
      buyerSocket.once('error', (err: any) => reject(new Error(err.message)));
      setTimeout(() => reject(new Error('Create conversation timeout')), 5000);
    });
  });

  it('should create a conversation between two users', () => {
    expect(conversationId).toBeDefined();
    expect(typeof conversationId).toBe('string');
  });

  it('should send and receive messages in real-time', async () => {
    const messageContent = 'Hello, this is a test message!';

    sellerSocket.emit('join_conversation', conversationId);

    await new Promise<void>((resolve) => {
      sellerSocket.once('joined_conversation', () => resolve());
      setTimeout(() => resolve(), 2000);
    });

    const messageReceived = new Promise<{ content: string; senderId: any }>((resolve) => {
      sellerSocket.once('new_message', (msg: any) => resolve(msg));
    });

    buyerSocket.emit('send_message', {
      conversationId,
      content: messageContent,
      type: 'text',
    });

    const received = await messageReceived;
    expect(received.content).toBe(messageContent);
    expect(received.senderId).toBeDefined();
  });

  it('should reject empty message content', async () => {
    const errorReceived = new Promise<string>((resolve) => {
      buyerSocket.once('error', (err: any) => resolve(err.message));
    });

    buyerSocket.emit('send_message', {
      conversationId,
      content: '   ',
      type: 'text',
    });

    const error = await errorReceived;
    expect(error).toBe('Message content is required');
  });

  it('should reject messages exceeding 2000 characters', async () => {
    const longContent = 'a'.repeat(2001);
    const errorReceived = new Promise<string>((resolve) => {
      buyerSocket.once('error', (err: any) => resolve(err.message));
    });

    buyerSocket.emit('send_message', {
      conversationId,
      content: longContent,
      type: 'text',
    });

    const error = await errorReceived;
    expect(error).toBe('Message content exceeds 2000 characters');
  });

  it('should strip HTML from message content', async () => {
    const maliciousContent = '<script>alert("xss")</script>Hello';
    const sanitizedExpected = 'alert("xss")Hello';

    const messageReceived = new Promise<{ content: string }>((resolve) => {
      sellerSocket.once('new_message', (msg: any) => resolve(msg));
    });

    buyerSocket.emit('send_message', {
      conversationId,
      content: maliciousContent,
      type: 'text',
    });

    const received = await messageReceived;
    expect(received.content).toBe(sanitizedExpected);
  });

  it('should handle typing indicators', async () => {
    const typingReceived = new Promise<{ userId: string; conversationId: string }>((resolve) => {
      sellerSocket.once('user_typing', (data) => resolve(data));
    });

    buyerSocket.emit('typing_start', conversationId);

    const typing = await typingReceived;
    expect(typing.userId).toBe(buyerId);
    expect(typing.conversationId).toBe(conversationId);
  });

  it('should mark messages as read', async () => {
    const markReadReceived = new Promise<{ conversationId: string }>((resolve) => {
      buyerSocket.once('messages_marked_read', (data) => resolve(data));
    });

    buyerSocket.emit('mark_messages_read', conversationId);

    const result = await markReadReceived;
    expect(result.conversationId).toBe(conversationId);
  });

  it('should edit a sent message', async () => {
    const originalContent = 'Original message for edit test';
    const editedContent = 'Edited message content';

    const msgReceived = new Promise<any>((resolve) => {
      buyerSocket.once('new_message', (msg) => resolve(msg));
    });

    buyerSocket.emit('send_message', {
      conversationId,
      content: originalContent,
      type: 'text',
    });

    const msg = await msgReceived;
    expect(msg.content).toBe(originalContent);

    const editReceived = new Promise<{ messageId: string; newContent: string }>((resolve) => {
      buyerSocket.once('message_edited', (data) => resolve(data));
    });

    buyerSocket.emit('edit_message', {
      messageId: msg._id,
      newContent: editedContent,
    });

    const edited = await editReceived;
    expect(edited.messageId).toBe(msg._id);
    expect(edited.newContent).toBe(editedContent);
  });

  it('should soft-delete a sent message', async () => {
    const msgContent = 'Message to be deleted';

    const msgReceived = new Promise<any>((resolve) => {
      buyerSocket.once('new_message', (msg) => resolve(msg));
    });

    buyerSocket.emit('send_message', {
      conversationId,
      content: msgContent,
      type: 'text',
    });

    const msg = await msgReceived;

    const deleteReceived = new Promise<{ messageId: string }>((resolve) => {
      buyerSocket.once('message_deleted', (data) => resolve(data));
    });

    buyerSocket.emit('delete_message', msg._id);

    const deleted = await deleteReceived;
    expect(deleted.messageId).toBe(msg._id);
  });
});
