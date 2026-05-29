import React, { createContext, useContext, useEffect, useState } from 'react';
import { socketService } from '../services/socket.service';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';

export interface AppNotification {
  id: string;
  isRead: boolean;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  userAvatar?: string;
  userName?: string;
  actionUrl?: string;
  gigTitle?: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    // Initial API fetch
    const fetchNotifications = async () => {
      try {
        const response = await api.get('/api/notifications');
        if (response.data?.notifications) {
          setNotifications(response.data.notifications);
        }
      } catch (err) {
        console.error('[NotificationContext] Failed to fetch initial notifications:', err);
      }
    };
    
    fetchNotifications();

    // Event handler for new incoming sockets
    const handleNewMessageNotification = (data: any) => {
      console.log('[NotificationContext] Received socket event:', data);
      
      const newNotif: AppNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: data?.title || 'New Message Received',
        message: data?.message?.content || 'You have a new unread message.',
        isRead: false,
        type: 'message',
        createdAt: new Date().toISOString(),
        actionUrl: '/messages',
        userAvatar: data?.message?.sender?.avatar,
        userName: data?.message?.sender?.displayName,
      };

      setNotifications((prev) => [newNotif, ...prev]);

      // Fire browser notification safely
      if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
        new window.Notification(newNotif.title, {
          body: newNotif.message,
          icon: '/logo.png',
        });
      }
    };

    socketService.on('new_message_notification', handleNewMessageNotification);
    socketService.on('notification', handleNewMessageNotification);

    // Memory Cleanup
    return () => {
      socketService.off('new_message_notification', handleNewMessageNotification);
      socketService.off('notification', handleNewMessageNotification);
    };
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      await api.patch(`/api/notifications/${id}/read`);
    } catch (error) {
      console.error('[NotificationContext] Failed to mark as read', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      await api.patch('/api/notifications/read-all');
    } catch (error) {
      console.error('[NotificationContext] Failed to mark all as read', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
