import { useState, useEffect } from 'react';
import { socketService } from '../../services/socket.service';
import { useAuthStore } from '../../store/authStore';
import { Helmet } from 'react-helmet-async';
import { MessageSquare, Bell, User, Send, Activity } from 'lucide-react';

export function TestConsole() {
  const [logs, setLogs] = useState<Array<{ time: string; event: string; details: string }>>([]);

  const setSession = useAuthStore(s => s.setSession);
  const user = useAuthStore(s => s.user);

  // Force login if testing in incognito
  useEffect(() => {
    if (!user) {
      setSession({
        accessToken: 'mock-token',
        user: {
          id: 'mock-user-b',
          role: 'admin', // Use admin to bypass RoleInterceptor just in case
          displayName: 'Test Debugger',
          avatar: '',
        } as any
      });
    }
  }, [user, setSession]);

  const addLog = (event: string, details: string) => {
    setLogs((prev) => [
      { time: new Date().toLocaleTimeString(), event, details },
      ...prev,
    ].slice(0, 10)); // Keep last 10 logs
  };

  const simulateNewMessage = () => {
    const payload = {
      conversationId: 'mock-convo-123',
      message: {
        id: `msg-${Date.now()}`,
        content: 'This is a simulated real-time message!',
        type: 'text',
        senderId: 'mock-user-a',
        sender: {
          id: 'mock-user-a',
          displayName: 'Test User A',
          avatar: 'https://ui-avatars.com/api/?name=User+A',
        },
        createdAt: new Date().toISOString(),
      }
    };
    
    // Trigger the notification event globally
    socketService.triggerDevEvent('new_message_notification', payload);
    addLog('new_message_notification', 'Fired notification badge increment');
  };

  const simulateTypingStart = () => {
    const payload = {
      userId: 'mock-user-a',
      conversationId: 'mock-convo-123',
      user: {
        displayName: 'Test User A',
        avatar: 'https://ui-avatars.com/api/?name=User+A',
      }
    };
    
    socketService.triggerDevEvent('user_typing', payload);
    addLog('user_typing', 'User A started typing');
  };

  const simulateTypingStop = () => {
    const payload = {
      userId: 'mock-user-a',
      conversationId: 'mock-convo-123',
    };
    
    socketService.triggerDevEvent('user_stop_typing', payload);
    addLog('user_stop_typing', 'User A stopped typing');
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-200 font-mono">
      <Helmet>
        <title>Debug | Real-Time Simulation Panel</title>
      </Helmet>

      <div className="max-w-4xl mx-auto space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-black text-indigo-400 flex items-center gap-3">
            <Activity className="h-8 w-8 text-indigo-500" />
            Milestone A: Real-Time Test Console
          </h1>
          <p className="mt-2 text-slate-400">
            Isolated panel simulating dual-socket interactions and pushing live events to the React Context tree. 
            Test the Notification Badge in the header by clicking the triggers below.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Socket A Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-6">
              <User className="h-5 w-5 text-fuchsia-500" />
              Socket A Simulator
            </h2>

            <div className="space-y-4">
              <button
                onClick={simulateNewMessage}
                className="w-full flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-yellow-400" />
                  <span className="font-medium text-slate-200">Push Global Notification</span>
                </div>
                <Send className="h-4 w-4 text-slate-400" />
              </button>

              <button
                onClick={simulateTypingStart}
                className="w-full flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-indigo-400" />
                  <span className="font-medium text-slate-200">Emit 'user_typing'</span>
                </div>
                <Send className="h-4 w-4 text-slate-400" />
              </button>

              <button
                onClick={simulateTypingStop}
                className="w-full flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-slate-500" />
                  <span className="font-medium text-slate-400">Emit 'user_stop_typing'</span>
                </div>
                <Send className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Logs Panel */}
          <div className="bg-black border border-slate-800 rounded-xl p-6 flex flex-col h-full">
            <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-400" />
              Live Event Logs
            </h2>
            
            <div className="flex-1 bg-slate-900 rounded-lg border border-slate-800 p-4 font-mono text-sm overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-slate-600 italic text-center mt-10">Listening for socket events...</div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log, i) => (
                    <div key={i} className="flex flex-col gap-1 border-b border-slate-800/50 pb-2">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>[{log.time}]</span>
                        <span className="text-indigo-400 font-semibold">{log.event}</span>
                      </div>
                      <div className="text-emerald-400">{log.details}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
