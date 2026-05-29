import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { type Conversation } from '../../services/socket.service';
import { useAuthStore } from '../../store/authStore';
import { ConversationList } from '../../components/messaging/ConversationList';
import { ChatInterface } from '../../components/messaging/ChatInterface';
import { MessageSquare } from 'lucide-react';

export function MessagesPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [isMobileView, setIsMobileView] = useState(false);

  // Fetch single conversation if ID is provided
  const { data: conversationData } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const response = await api.get(`/api/messages/conversations/${conversationId}`);
      return response.data;
    },
    enabled: !!conversationId,
  });

  // Responsive layout
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSelectConversation = (conversation: Conversation) => {
    navigate(`/messages/${conversation.id}`);
  };

  const conversation = conversationData?.conversation;

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400">Please log in to view messages</div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-white dark:bg-slate-950">
      <Helmet>
        <title>Messages | AvatarX</title>
        <meta name="description" content="Chat with freelancers and clients in real-time." />
      </Helmet>

      <div className="flex h-full">
        {/* Conversation List */}
        <div className={`${isMobileView && conversationId ? 'hidden' : 'w-full lg:w-1/3'} border-r border-slate-200 dark:border-slate-800`}>
          <ConversationList
            selectedConversationId={conversationId}
            onSelectConversation={handleSelectConversation}
            className="h-full"
          />
        </div>

        {/* Chat Interface */}
        <div className={`${isMobileView && !conversationId ? 'hidden' : 'w-full lg:w-2/3'} flex flex-col`}>
          {conversationId && conversation ? (
            <ChatInterface
              conversationId={conversationId}
              participant={conversation.participant}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <MessageSquare className="w-10 h-10 text-slate-400" strokeWidth={1.1} />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  {conversationId ? 'Loading...' : 'Select a conversation'}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md">
                  Choose a conversation from the list to start chatting, or browse gigs to contact a seller.
                </p>
                <button
                  onClick={() => navigate('/browse')}
                  className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Browse Gigs
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
