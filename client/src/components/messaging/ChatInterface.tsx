import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { socketService, type SocketMessage, type TypingUser, type UserStopTypingPayload } from '@/services/socket.service';
import { useAuthStore } from '@/store/authStore';
import { MessageSquare, File, Edit, Trash, X, Send } from 'lucide-react';

interface ChatInterfaceProps {
  conversationId: string;
  participant: {
    id: string;
    displayName: string;
    avatar: string;
    isOnline: boolean;
    lastSeen?: string;
  };
  className?: string;
}

export function ChatInterface({ conversationId, participant, className }: ChatInterfaceProps) {
  const user = useAuthStore((s) => s.user);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<SocketMessage | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch messages
  const { data: messagesData, isLoading, refetch } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const response = await api.get(`/api/messages/conversations/${conversationId}/messages`);
      return response.data;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initialize socket connection
  useEffect(() => {
    if (!conversationId) return;

    // Join conversation room
    socketService.joinConversation(conversationId);

    // Listen for real-time updates
    socketService.on('new_message', (payload: unknown) => {
      const msg = payload as SocketMessage;
      if (msg.conversationId === conversationId) {
        refetch();
        scrollToBottom();
      }
    });

    socketService.on('message_edited', () => {
      refetch();
    });

    socketService.on('message_deleted', () => {
      refetch();
    });

    socketService.on('user_typing', (payload: unknown) => {
      const typingUser = payload as TypingUser;
      if (typingUser.conversationId === conversationId) {
        setTypingUsers(prev => {
          const filtered = prev.filter(u => u.userId !== typingUser.userId);
          return [...filtered, typingUser];
        });
      }
    });

    socketService.on('user_stop_typing', (payload: unknown) => {
      const data = payload as UserStopTypingPayload;
      if (data.conversationId === conversationId) {
        setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
      }
    });

    return () => {
      socketService.leaveConversation(conversationId);
      socketService.off('new_message');
      socketService.off('message_edited');
      socketService.off('message_deleted');
      socketService.off('user_typing');
      socketService.off('user_stop_typing');
    };
  }, [conversationId, refetch]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messagesData?.messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || !conversationId) return;

    try {
      // Send via socket — server persists and broadcasts
      socketService.sendMessage({
        conversationId,
        content: message.trim(),
        type: 'text',
      });

      setMessage('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editContent.trim()) return;

    try {
      // Edit via socket — server persists and broadcasts
      socketService.editMessage(messageId, editContent.trim());

      setEditingMessageId(null);
      setEditContent('');
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      // Delete via socket — server persists and broadcasts
      socketService.deleteMessage(messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const handleTypingStart = () => {
    if (!isTyping) {
      setIsTyping(true);
      socketService.startTyping(conversationId);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketService.stopTyping(conversationId);
    }, 3000);
  };

  const handleTypingStop = () => {
    setIsTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socketService.stopTyping(conversationId);
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return '';
    
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const isOwnMessage = (message: SocketMessage) => {
    return message.senderId === user?.id;
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editingMessageId) {
        handleEditMessage(editingMessageId);
      } else {
        handleSendMessage();
      }
    }
  };

  if (isLoading) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-center">
            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />
            <div className="text-slate-600 dark:text-slate-400">Loading messages...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={participant.avatar || '/default-avatar.png'}
              alt={participant.displayName}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {participant.displayName}
              </h3>
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                {participant.isOnline ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span>Online</span>
                  </>
                ) : (
                  <span>
                    {participant.lastSeen 
                      ? `Last seen ${formatLastSeen(participant.lastSeen)}`
                      : 'Offline'
                    }
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messagesData?.messages?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-slate-400" strokeWidth={1.1} />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              Start a conversation
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Send a message to {participant.displayName}
            </p>
          </div>
        ) : (
          <>
            {messagesData?.messages?.map((msg: SocketMessage) => (
              <div
                key={msg.id}
                className={`flex ${isOwnMessage(msg) ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] ${isOwnMessage(msg) ? 'order-2' : 'order-1'}`}>
                  {editingMessageId === msg.id ? (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                      <textarea
                        ref={textareaRef}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onKeyPress={handleKeyPress}
                        onBlur={() => {
                          setEditingMessageId(null);
                          setEditContent('');
                        }}
                        className="w-full resize-none bg-transparent border-none outline-none text-sm"
                        rows={2}
                        autoFocus
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => {
                            setEditingMessageId(null);
                            setEditContent('');
                          }}
                          className="px-3 py-1 text-xs bg-slate-100 dark:bg-slate-700 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleEditMessage(msg.id)}
                          className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`relative group rounded-lg px-4 py-2 ${
                        isOwnMessage(msg)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                      }`}
                    >
                      {/* Reply indicator */}
                      {replyingTo && replyingTo.id === msg.id && (
                        <div className="text-xs opacity-75 mb-1">
                          Replying to this message
                        </div>
                      )}

                      {/* Message content */}
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>

                      {/* Attachment */}
                      {msg.attachment && msg.attachment.mimetype && (
                        <div className="mt-2">
                          {msg.attachment.mimetype.startsWith('image/') ? (
                            <img
                              src={msg.attachment.url}
                              alt={msg.attachment.filename}
                              className="max-w-full rounded cursor-pointer"
                              onClick={() => msg.attachment && window.open(msg.attachment.url, '_blank')}
                            />
                          ) : (
                            <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-700 rounded">
                              <File className="w-4 h-4" strokeWidth={1.1} />
                              <span className="text-xs">{msg.attachment.filename}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Message metadata */}
                      <div className={`flex items-center gap-2 mt-1 text-xs ${
                        isOwnMessage(msg) ? 'text-indigo-200' : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        <span>{formatMessageTime(msg.createdAt)}</span>
                        {msg.isEdited && <span>• edited</span>}
                        {msg.status === 'read' && <span>• read</span>}
                      </div>

                      {/* Action buttons */}
                      {isOwnMessage(msg) && (
                        <div className="absolute -top-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button
                            onClick={() => {
                              setEditingMessageId(msg.id);
                              setEditContent(msg.content);
                              setTimeout(() => textareaRef.current?.focus(), 0);
                            }}
                            className="p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-700"
                            title="Edit message"
                          >
                            <Edit className="w-3 h-3" strokeWidth={1.1} />
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-700"
                            title="Delete message"
                          >
                            <Trash className="w-3 h-3" strokeWidth={1.1} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicators */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>
                  {typingUsers.map(u => u.user.displayName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-4">
        {replyingTo && (
          <div className="mb-3 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-between">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Replying to: {replyingTo.content.substring(0, 50)}...
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="w-4 h-4" strokeWidth={1.1} />
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={handleTypingStart}
            onBlur={handleTypingStop}
            placeholder="Type a message..."
            className="flex-1 resize-none rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            rows={1}
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          
          <button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" strokeWidth={1.1} />
          </button>
        </div>
      </div>
    </div>
  );
}
