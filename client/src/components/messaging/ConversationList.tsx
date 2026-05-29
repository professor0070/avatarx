import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { socketService, type Conversation, type OnlineUser } from '@/services/socket.service';
import { useAuthStore } from '@/store/authStore';
import { Search, MessageSquare, Archive } from 'lucide-react';

interface ConversationListProps {
  selectedConversationId?: string;
  onSelectConversation: (conversation: Conversation) => void;
  className?: string;
}

export function ConversationList({ selectedConversationId, onSelectConversation, className }: ConversationListProps) {
  const user = useAuthStore((s) => s.user);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'archived'>('all');

  // Fetch conversations
  const { data: conversationsData, isLoading, refetch } = useQuery({
    queryKey: ['conversations', filterType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterType === 'unread') {
        params.append('unreadOnly', 'true');
      }
      if (filterType === 'archived') {
        params.append('archived', 'true');
      }
      
      const response = await api.get(`/api/messages/conversations?${params.toString()}`);
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Initialize socket connection
  useEffect(() => {
    const initSocket = async () => {
      try {
        await socketService.connect();
        
        // Listen for real-time updates
        socketService.on('new_conversation', () => {
          refetch();
        });

        socketService.on('new_message', () => {
          refetch();
        });

        socketService.on('message_edited', () => {
          refetch();
        });

        socketService.on('message_deleted', () => {
          refetch();
        });

        socketService.on('online_users_updated', (users: unknown) => {
          if (Array.isArray(users)) {
            setOnlineUsers(users as OnlineUser[]);
          }
        });

        // Get initial online users
        socketService.getConversations();
      } catch (error) {
        console.error('Failed to connect to socket:', error);
      }
    };

    if (user) {
      initSocket();
    }

    return () => {
      socketService.off('new_conversation');
      socketService.off('new_message');
      socketService.off('message_edited');
      socketService.off('message_deleted');
      socketService.off('online_users_updated');
    };
  }, [user, refetch]);

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const isUserOnline = (userId: string) => {
    return onlineUsers.some(user => user.userId === userId);
  };

  const filteredConversations = conversationsData?.conversations?.filter((conv: Conversation) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const participantName = conv.participant.displayName.toLowerCase();
    const lastMessage = conv.lastMessage.content.toLowerCase();
    
    return participantName.includes(query) || lastMessage.includes(query);
  }) || [];

  const handleSelectConversation = (conversation: Conversation) => {
    onSelectConversation(conversation);
    
    // Mark messages as read
    if (conversation.unreadCount > 0) {
      socketService.markMessagesAsRead(conversation.id);
      api.post(`/api/messages/conversations/${conversation.id}/read`);
    }
  };

  const handleArchiveConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await api.patch(`/api/messages/conversations/${conversationId}/archive`, { archive: true });
      refetch();
    } catch (error) {
      console.error('Failed to archive conversation:', error);
    }
  };

  const handleUnarchiveConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await api.patch(`/api/messages/conversations/${conversationId}/archive`, { archive: false });
      refetch();
    } catch (error) {
      console.error('Failed to unarchive conversation:', error);
    }
  };

  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 p-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Messages
        </h2>
        
        {/* Search */}
        <div className="relative mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 pl-10 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" strokeWidth={1.1} />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('unread')}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filterType === 'unread'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            Unread
          </button>
          <button
            onClick={() => setFilterType('archived')}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filterType === 'archived'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            Archived
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-slate-400" strokeWidth={1.1} />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              {searchQuery ? 'No conversations found' : 'No messages yet'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {searchQuery 
                ? 'Try adjusting your search terms' 
                : 'Start a conversation to see messages here'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredConversations.map((conversation: Conversation) => (
              <div
                key={conversation.id}
                onClick={() => handleSelectConversation(conversation)}
                className={`relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors group ${
                  selectedConversationId === conversation.id
                    ? 'bg-indigo-50 border border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-800'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {/* Avatar */}
                <div className="relative">
                  <img
                    src={conversation.participant.avatar || '/default-avatar.png'}
                    alt={conversation.participant.displayName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  {/* Online indicator */}
                  {isUserOnline(conversation.participant.id) && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-slate-900 dark:text-white truncate">
                      {conversation.participant.displayName}
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatLastMessageTime(conversation.lastMessage.timestamp)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                      {conversation.lastMessage.type === 'system' ? (
                        <span className="italic text-slate-500">
                          {conversation.lastMessage.content}
                        </span>
                      ) : (
                        conversation.lastMessage.content
                      )}
                    </p>
                    
                    {/* Unread count */}
                    {conversation.unreadCount > 0 && (
                      <div className="ml-2 px-2 py-0.5 bg-indigo-600 text-white text-xs rounded-full min-w-[20px] text-center">
                        {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                      </div>
                    )}
                  </div>
                </div>

                {/* Archive/Unarchive button */}
                <button
                  onClick={(e) => {
                    if (conversation.isArchived) {
                      handleUnarchiveConversation(conversation.id, e);
                    } else {
                      handleArchiveConversation(conversation.id, e);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                  title={conversation.isArchived ? 'Unarchive' : 'Archive'}
                >
                  <Archive className="w-4 h-4 text-slate-400" strokeWidth={1.1} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
