import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { socketService, type EventCallback, type MessageAttachment } from '../socket.service';

// Mock Socket.IO client
vi.mock('socket.io-client', () => ({
  default: {
    connect: vi.fn(() => ({
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      connected: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
  },
}));

describe('SocketService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should be a singleton instance', () => {
    expect(socketService).toBeDefined();
  });

  it('should have connect method', () => {
    expect(typeof socketService.connect).toBe('function');
  });

  it('should have disconnect method', () => {
    expect(typeof socketService.disconnect).toBe('function');
  });

  it('should have isConnected method', () => {
    expect(typeof socketService.isConnected).toBe('function');
  });

  it('should have on method for event listening', () => {
    expect(typeof socketService.on).toBe('function');
  });

  it('should have off method for removing listeners', () => {
    expect(typeof socketService.off).toBe('function');
  });

  it('should have joinConversation method', () => {
    expect(typeof socketService.joinConversation).toBe('function');
  });

  it('should have leaveConversation method', () => {
    expect(typeof socketService.leaveConversation).toBe('function');
  });

  it('should have createConversation method', () => {
    expect(typeof socketService.createConversation).toBe('function');
  });

  it('should have sendMessage method', () => {
    expect(typeof socketService.sendMessage).toBe('function');
  });

  it('should have editMessage method', () => {
    expect(typeof socketService.editMessage).toBe('function');
  });

  it('should have deleteMessage method', () => {
    expect(typeof socketService.deleteMessage).toBe('function');
  });

  it('should have markMessagesAsRead method', () => {
    expect(typeof socketService.markMessagesAsRead).toBe('function');
  });

  it('should have startTyping method', () => {
    expect(typeof socketService.startTyping).toBe('function');
  });

  it('should have stopTyping method', () => {
    expect(typeof socketService.stopTyping).toBe('function');
  });

  it('should have getConversations method', () => {
    expect(typeof socketService.getConversations).toBe('function');
  });

  it('should have getMessages method', () => {
    expect(typeof socketService.getMessages).toBe('function');
  });

  it('should have getSocketId method', () => {
    expect(typeof socketService.getSocketId).toBe('function');
  });

  it('should have getOnlineUsersCount method', () => {
    expect(typeof socketService.getOnlineUsersCount).toBe('function');
  });

  it('should have isUserOnline method', () => {
    expect(typeof socketService.isUserOnline).toBe('function');
  });

  describe('EventCallback type', () => {
    it('should accept functions with unknown parameters', () => {
      const callback: EventCallback = (...args: unknown[]) => {
        console.log(args);
      };
      expect(typeof callback).toBe('function');
    });
  });

  describe('MessageAttachment interface', () => {
    it('should define attachment structure', () => {
      const attachment: MessageAttachment = {
        url: 'https://example.com/file.pdf',
        filename: 'document.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      };

      expect(attachment.url).toBeDefined();
      expect(attachment.filename).toBeDefined();
      expect(attachment.mimetype).toBeDefined();
      expect(attachment.size).toBeDefined();
    });
  });
});
