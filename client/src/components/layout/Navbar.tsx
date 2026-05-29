import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotifications } from '../../context/NotificationContext';
import { socketService } from '../../services/socket.service';
import { Bell, Inbox, Search, Menu, X, Sun, Moon } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/clerk-react';

export function Navbar() {
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  
  const user = useAuthStore((s) => s.user);
  const activeMode = useAuthStore((s) => s.activeMode);
  const setActiveMode = useAuthStore((s) => s.setActiveMode);
  const clearSession = useAuthStore((s) => s.clearSession);
  const setSession = useAuthStore((s) => s.setSession);
  const accessToken = useAuthStore((s) => s.accessToken);

  const isCreatorMode = activeMode === 'creator';
  const { signOut } = useAuth();

  // Roles that can access creator mode
  const isSeller = user?.roles?.some((r) => ['seller', 'creator', 'admin', 'super_admin'].includes(r)) ?? false;

  const getCreatorRole = () => {
    if (user?.roles?.includes('creator')) return 'creator';
    if (user?.roles?.includes('seller')) return 'seller';
    if (user?.roles?.includes('admin')) return 'admin';
    if (user?.roles?.includes('super_admin')) return 'super_admin';
    return 'seller';
  };

  const handleRoleSwitch = async (newRole: 'buyer' | 'seller' | 'creator' | 'admin' | 'super_admin') => {
    try {
      const res = await api.patch('/api/users/me/switch-role', { newRole });
      if (res.data.ok && res.data.user) {
        setSession({ accessToken, user: res.data.user });
        if (newRole === 'buyer') {
          navigate('/dashboard/user');
        } else {
          navigate('/dashboard/creator');
        }
      }
    } catch (err) {
      console.error('Failed to switch role:', err);
    }
  };
  
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState<{title: string, message: string} | null>(null);

  const queryClient = useQueryClient();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };
  
  useEffect(() => {
    const onDocClick = () => {
      setNotificationOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (window.Notification.permission === 'default') {
        window.Notification.requestPermission();
      }
    }
  }, []);

  // Strict Real-Time Event Pipeline & Cache Invalidation
  useEffect(() => {
    if (!user) return;

    const handleStatusUpdate = (data: any) => {
      if (data?.type === 'order_completed' || data?.type === 'order_update' || data?.title?.includes('Order')) {
        setToastMsg({
          title: 'Agreement updated!',
          message: data?.message || 'Status changed successfully.',
        });
        
        queryClient.invalidateQueries({ queryKey: ['my-contracts'] });
        setTimeout(() => setToastMsg(null), 5000);
      }
    };

    socketService.on('notification', handleStatusUpdate);

    return () => {
      socketService.off('notification', handleStatusUpdate);
    };
  }, [user, queryClient]);

  // Fetch unread message count
  const { data: messagesData } = useQuery({
    queryKey: ['unread-messages'],
    queryFn: async () => {
      if (!user) return { unreadCount: 0 };
      const response = await api.get('/api/messages/unread-count');
      return response.data;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unreadMessageCount = messagesData?.unreadCount || 0;

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    clearSession();
    await signOut();
    navigate('/');
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link to="/" className="text-2xl font-black tracking-tight text-green-600 dark:text-green-400">
              AvatarX
            </Link>
          </div>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find services..."
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 pl-10 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </form>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-6 md:flex">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive ? 'text-green-600 dark:text-green-400' : 'text-slate-700 hover:text-green-600 dark:text-slate-300 dark:hover:text-green-400'
                }`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/browse"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive ? 'text-green-600 dark:text-green-400' : 'text-slate-700 hover:text-green-600 dark:text-slate-300 dark:hover:text-green-400'
                }`
              }
            >
              Explore
            </NavLink>
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              type="button"
              className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle theme"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <SignedIn>
              <>
                {/* Notifications */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="relative rounded-lg p-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                    aria-label="Notifications"
                    onClick={() => setNotificationOpen((v) => !v)}
                  >
                    <Bell className="h-5 w-5" strokeWidth={1.1} />
                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-semibold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {notificationOpen && (
                    <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
                      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h3>
                          {unreadCount > 0 && (
                            <button
                              type="button"
                              className="text-xs text-green-600 hover:text-green-700 dark:text-green-400 font-medium"
                              onClick={async () => {
                                try {
                                  await markAllAsRead();
                                } catch (err) {
                                  console.error('Failed to mark all as read', err);
                                }
                              }}
                            >
                              Mark all as read
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{unreadCount} unread</p>
                      </div>
                      
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              onClick={async () => {
                                if (!notification.isRead) {
                                  try {
                                    await markAsRead(notification.id);
                                  } catch (err) {}
                                }
                                if (notification.actionUrl) {
                                  navigate(notification.actionUrl);
                                }
                                setNotificationOpen(false);
                              }}
                              className={`cursor-pointer border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 ${
                                !notification.isRead ? 'bg-green-50/50 dark:bg-green-900/10' : ''
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {notification.userAvatar && (
                                  <img
                                    src={notification.userAvatar}
                                    alt={notification.userName}
                                    className="h-8 w-8 rounded-full object-cover"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start">
                                    <p className={`text-sm ${!notification.isRead ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                      {notification.message}
                                    </p>
                                    {!notification.isRead && (
                                      <span className="h-2 w-2 rounded-full bg-green-600 mt-1.5 flex-shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{notification.userName}</p>
                                  {notification.gigTitle && (
                                    <p className="text-xs text-slate-500 mt-1">{notification.gigTitle}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-8 text-center">
                            <p className="text-sm text-slate-600 dark:text-slate-400">No notifications yet</p>
                          </div>
                        )}
                      </div>

                      {notifications.length > 0 && (
                        <div className="border-t border-slate-200 px-4 py-2 dark:border-slate-800">
                          <button
                            type="button"
                            className="w-full text-center text-sm text-green-600 hover:text-green-700 dark:text-green-400"
                            onClick={() => {
                              setNotificationOpen(false);
                              navigate('/notifications');
                            }}
                          >
                            View All Notifications
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Messages */}
                <button
                  type="button"
                  className="relative rounded-lg p-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Inbox"
                  onClick={() => navigate('/messages')}
                >
                  <Inbox className="h-5 w-5" strokeWidth={1.1} />
                  {unreadMessageCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-semibold text-white">
                      {unreadMessageCount}
                    </span>
                  )}
                </button>
              </>
            </SignedIn>

            <SignedIn>
              <div className="hidden md:flex items-center gap-4 mr-2">
                {/* Current Mode Indicator */}
                <div className="px-3 py-1.5 text-xs font-semibold rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50">
                  {isCreatorMode ? 'Creator Mode' : 'Buyer Mode'}
                </div>
                {isCreatorMode ? (
                  <div 
                    className="px-4 py-1.5 text-sm font-semibold rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer transition-all border border-slate-200 dark:border-slate-700" 
                    onClick={() => handleRoleSwitch('buyer')}
                  >
                    Switch to Buyer
                  </div>
                ) : isSeller ? (
                  <div 
                    className="px-4 py-1.5 text-sm font-semibold rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 cursor-pointer transition-all border border-indigo-200 dark:border-indigo-800/50" 
                    onClick={() => handleRoleSwitch(getCreatorRole())}
                  >
                    Switch to Creator
                  </div>
                ) : null}
              </div>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>

            <SignedOut>
              <div className="hidden md:flex items-center gap-4">
                <SignInButton mode="modal">
                  <button className="text-sm font-semibold text-slate-700 hover:text-green-600 dark:text-slate-300 dark:hover:text-green-400 transition-colors">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="rounded-full bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 transition-all">
                    Join
                  </button>
                </SignUpButton>
              </div>
            </SignedOut>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              className="md:hidden rounded-lg p-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label="Toggle menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="px-4 py-4 space-y-4">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Find services..."
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 pl-10 text-sm focus:border-green-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </form>

              <nav className="space-y-2">
                <NavLink
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 rounded-lg"
                >
                  Home
                </NavLink>
                <NavLink
                  to="/browse"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 rounded-lg"
                >
                  Explore
                </NavLink>

                <SignedOut>
                  <div className="px-4 py-2 space-y-3">
                    <SignInButton mode="modal">
                      <button className="w-full rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 text-center transition-colors">
                        Sign In
                      </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 text-center transition-colors">
                        Join
                      </button>
                    </SignUpButton>
                  </div>
                </SignedOut>

                <SignedIn>
                  <>
                    <NavLink
                      to="/notifications"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex justify-between items-center px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 rounded-lg"
                    >
                      <span>Notifications</span>
                      {unreadCount > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-semibold text-white">
                          {unreadCount}
                        </span>
                      )}
                    </NavLink>
                    <NavLink
                      to="/messages"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex justify-between items-center px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 rounded-lg"
                    >
                      <span>Messages</span>
                      {unreadMessageCount > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-semibold text-white">
                          {unreadMessageCount}
                        </span>
                      )}
                    </NavLink>
                    
                    {isCreatorMode ? (
                      <NavLink
                        to="/dashboard/user"
                        onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); handleRoleSwitch('buyer'); }}
                        className="block px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 rounded-lg"
                      >
                        Switch to Buyer Mode
                      </NavLink>
                    ) : isSeller ? (
                      <NavLink
                        to="/dashboard/creator"
                        onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); handleRoleSwitch(getCreatorRole()); }}
                        className="block px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20 rounded-lg"
                      >
                        Switch to Creator Mode
                      </NavLink>
                    ) : null}
                    
                    <NavLink
                      to="/orders"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 rounded-lg"
                    >
                      My Orders
                    </NavLink>
                    <NavLink
                      to="/wishlist"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 rounded-lg"
                    >
                      Wishlist
                    </NavLink>
                    
                    <button
                      onClick={handleLogout}
                      className="block w-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 rounded-lg text-left"
                    >
                      Logout
                    </button>
                  </>
                </SignedIn>
              </nav>
            </div>
          </div>
        )}
      </header>

      {/* Dynamic Toast Injection */}
      {toastMsg && (
        <div className="fixed top-20 right-4 z-[9999] animate-[slideInRight_0.3s_ease-out] shadow-2xl shadow-green-500/10">
          <div className="rounded-xl border border-white/20 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-4 min-w-[300px]">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-green-500/20 p-2">
                <Bell className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{toastMsg.title}</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{toastMsg.message}</p>
              </div>
              <button 
                onClick={() => setToastMsg(null)}
                className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
