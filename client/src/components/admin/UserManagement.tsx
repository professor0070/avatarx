import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Search, X } from 'lucide-react';

interface User {
  id: string;
  displayName: string;
  email: string;
  role: 'user' | 'freelancer' | 'admin' | 'super_admin';
  isEmailVerified: boolean;
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
  metrics: {
    totalOrders: number;
    totalSpent: number;
    totalEarned: number;
    successScore: number;
  };
  badges: string[];
}

export function UserManagement() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'users' | 'freelancers' | 'admins'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Fetch users
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users', filter],
    queryFn: async () => {
      const response = await api.get(`/api/admin/users?role=${filter}`);
      return response.data;
    },
  });

  // Update user role mutation
  const updateUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await api.patch(`/api/admin/users/${userId}/role`, { role });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  // Ban/unban user mutation
  const toggleUserBan = useMutation({
    mutationFn: async ({ userId, banned }: { userId: string; banned: boolean }) => {
      const response = await api.patch(`/api/admin/users/${userId}/ban`, { banned });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  // Verify user email mutation
  const verifyUserEmail = useMutation({
    mutationFn: async (userId: string) => {
      const response = await api.post(`/api/admin/users/${userId}/verify-email`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'freelancer':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'user':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const handleRoleChange = (user: User, newRole: string) => {
    if (confirm(`Are you sure you want to change ${user.displayName}'s role to ${newRole}?`)) {
      updateUserRole.mutate({ userId: user.id, role: newRole });
    }
  };

  const handleBanToggle = (user: User) => {
    const action = user.badges.includes('banned') ? 'unban' : 'ban';
    if (confirm(`Are you sure you want to ${action} ${user.displayName}?`)) {
      toggleUserBan.mutate({ userId: user.id, banned: !user.badges.includes('banned') });
    }
  };

  const handleVerifyEmail = (user: User) => {
    if (confirm(`Are you sure you want to verify ${user.displayName}'s email?`)) {
      verifyUserEmail.mutate(user.id);
    }
  };

  const filteredUsers = usersData?.users?.filter((user: User) => {
    const matchesFilter = filter === 'all' || 
      (filter === 'users' && user.role === 'user') ||
      (filter === 'freelancers' && user.role === 'freelancer') ||
      (filter === 'admins' && ['admin', 'super_admin'].includes(user.role));
    
    const matchesSearch = !searchQuery || 
      user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
  }) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
            <div className="animate-pulse">
              <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
              <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
              <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          User Management
        </h2>
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Total: {filteredUsers.length} users
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2">
          {(['all', 'users', 'freelancers', 'admins'] as const).map((role) => (
            <button
              key={role}
              onClick={() => setFilter(role)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === role
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </button>
          ))}
        </div>
        
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full sm:w-64 rounded-lg border border-slate-200 bg-white px-4 py-2 pl-10 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" strokeWidth={1.1} />
        </div>
      </div>

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-12 border border-slate-200 dark:border-slate-700 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">👥</span>
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            No users found
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            {searchQuery ? 'Try adjusting your search terms' : 'No users match the current filter'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Metrics
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredUsers.map((user: User) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            {user.displayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {user.displayName}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-green-500' : 'bg-slate-400'}`} />
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {user.isOnline ? 'Online' : `Last seen ${formatDate(user.lastSeen)}`}
                        </span>
                      </div>
                      {!user.isEmailVerified && (
                        <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 rounded-full">
                          Email not verified
                        </span>
                      )}
                      {user.badges.includes('banned') && (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 rounded-full">
                          Banned
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                      <div className="space-y-1">
                        <div>Orders: {user.metrics.totalOrders}</div>
                        <div>Score: {user.metrics.successScore}%</div>
                        {user.role === 'freelancer' && (
                          <div>Earned: ${user.metrics.totalEarned}</div>
                        )}
                        {user.role === 'user' && (
                          <div>Spent: ${user.metrics.totalSpent}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        {/* Role Change */}
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user, e.target.value)}
                          className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          disabled={user.role === 'super_admin'}
                        >
                          <option value="user">User</option>
                          <option value="freelancer">Freelancer</option>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </select>

                        {/* Email Verification */}
                        {!user.isEmailVerified && (
                          <button
                            onClick={() => handleVerifyEmail(user)}
                            disabled={verifyUserEmail.isPending}
                            className="px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                          >
                            Verify
                          </button>
                        )}

                        {/* Ban/Unban */}
                        <button
                          onClick={() => handleBanToggle(user)}
                          disabled={toggleUserBan.isPending || user.role === 'super_admin'}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            user.badges.includes('banned')
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          {user.badges.includes('banned') ? 'Unban' : 'Ban'}
                        </button>

                        {/* View Details */}
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  User Details
                </h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-6 h-6" strokeWidth={1.1} />
                </button>
              </div>

              <div className="space-y-6">
                {/* User Info */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                    <span className="text-xl font-medium text-slate-600 dark:text-slate-300">
                      {selectedUser.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-slate-900 dark:text-white">
                      {selectedUser.displayName}
                    </h4>
                    <p className="text-slate-600 dark:text-slate-400">{selectedUser.email}</p>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(selectedUser.role)}`}>
                      {selectedUser.role.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Total Orders</p>
                    <p className="text-xl font-semibold text-slate-900 dark:text-white">
                      {selectedUser.metrics.totalOrders}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Success Score</p>
                    <p className="text-xl font-semibold text-slate-900 dark:text-white">
                      {selectedUser.metrics.successScore}%
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {selectedUser.role === 'freelancer' ? 'Total Earned' : 'Total Spent'}
                    </p>
                    <p className="text-xl font-semibold text-slate-900 dark:text-white">
                      ${selectedUser.role === 'freelancer' 
                        ? selectedUser.metrics.totalEarned 
                        : selectedUser.metrics.totalSpent}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Member Since</p>
                    <p className="text-xl font-semibold text-slate-900 dark:text-white">
                      {formatDate(selectedUser.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Badges */}
                <div>
                  <h5 className="font-medium text-slate-900 dark:text-white mb-2">Badges</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.badges.length > 0 ? (
                      selectedUser.badges.map((badge, index) => (
                        <span key={index} className="px-3 py-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400 rounded-full text-sm">
                          {badge}
                        </span>
                      ))
                    ) : (
                      <p className="text-slate-600 dark:text-slate-400">No badges</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
