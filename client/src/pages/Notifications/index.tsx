import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';

interface Notification {
  id: string;
  isRead: boolean;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  userAvatar?: string;
  userName?: string;
  gigTitle?: string;
  actionUrl?: string;
}

export function NotificationsPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', { unreadOnly }],
    queryFn: async () => {
      const response = await api.get('/api/notifications', {
        params: { unreadOnly, limit: 50 }
      });
      return response.data;
    },
    enabled: !!user,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/api/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notifications: Notification[] = data?.notifications || [];

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Helmet>
        <title>Notifications | AvatarX</title>
        <meta name="description" content="View and manage your notifications." />
      </Helmet>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Stay updated with your activities
          </p>
        </div>
        <div className="flex gap-2">
          {notifications.some(n => !n.isRead) && (
            <button
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 disabled:opacity-50"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setUnreadOnly(false)}
          className={`pb-2 text-sm font-medium transition-colors ${
            !unreadOnly 
              ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400' 
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setUnreadOnly(true)}
          className={`pb-2 text-sm font-medium transition-colors ${
            unreadOnly 
              ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400' 
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          Unread
        </button>
      </div>

      <div className="space-y-2">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`group relative flex items-start gap-4 rounded-xl border p-4 transition-all hover:shadow-sm ${
                !notification.isRead 
                  ? 'border-indigo-100 bg-indigo-50/30 dark:border-indigo-900/30 dark:bg-indigo-900/10' 
                  : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <div 
                className="flex flex-1 cursor-pointer items-start gap-4"
                onClick={() => handleNotificationClick(notification)}
              >
                {notification.userAvatar ? (
                  <img
                    src={notification.userAvatar}
                    alt={notification.userName}
                    className="h-10 w-10 rounded-full object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                    <span className="text-slate-400">🔔</span>
                  </div>
                )}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm ${!notification.isRead ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {notification.message}
                  </p>
                  {notification.gigTitle && (
                    <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                      Gig: {notification.gigTitle}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center self-center opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate(notification.id);
                  }}
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
                  title="Delete notification"
                >
                  <Trash2 className="h-5 w-5" strokeWidth={1.1} />
                </button>
              </div>

              {!notification.isRead && (
                <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-indigo-600" />
              )}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20 dark:border-slate-800">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900">
              <span className="text-3xl text-slate-300">📭</span>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">No notifications</h3>
            <p className="text-sm text-slate-500">
              {unreadOnly ? "You've read all your notifications!" : "You don't have any notifications yet."}
            </p>
            {unreadOnly && (
              <button
                onClick={() => setUnreadOnly(false)}
                className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                View all notifications
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
