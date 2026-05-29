import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../authStore';
import type { AvatarXUser } from '../../types/auth';

const createMockUser = (overrides: Partial<AvatarXUser> = {}): AvatarXUser => ({
  id: '1',
  email: 'test@example.com',
  displayName: 'Test User',
  imvuUsername: 'imvu_user',
  role: 'buyer',
  avatar: 'https://example.com/avatar.png',
  badges: [],
  sellerLevel: 'new',
  isEmailVerified: false,
  isAgeVerified: false,
  isCloudinaryVerified: false,
  isIdVerified: false,
  isProfileVerified: false,
  verificationBadge: false,
  verificationStatus: 'pending',
  isAvailable: true,
  outOfOfficeUntil: null,
  outOfOfficeMessage: '',
  isOnline: false,
  lastSeen: null,
  crWalletBalance: 0,
  ...overrides,
});

describe('authStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAuthStore.setState({
      accessToken: null,
      user: null,
    });
  });

  it('should have initial state with null values', () => {
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.user).toBeNull();
  });

  it('should set session correctly', () => {
    const mockUser = createMockUser({
      id: '1',
      displayName: 'Test User',
      email: 'test@example.com',
    });

    useAuthStore.getState().setSession({
      accessToken: 'test-token',
      user: mockUser,
    });

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('test-token');
    expect(state.user).toEqual(mockUser);
  });

  it('should clear session correctly', () => {
    const mockUser = createMockUser();

    // First set a session
    useAuthStore.getState().setSession({
      accessToken: 'test-token',
      user: mockUser,
    });

    // Then clear it
    useAuthStore.getState().clearSession();

    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.user).toBeNull();
  });

  it('should update session when called multiple times', () => {
    const mockUser1 = createMockUser({
      id: '1',
      displayName: 'User One',
      email: 'user1@example.com',
      role: 'buyer',
    });

    const mockUser2 = createMockUser({
      id: '2',
      displayName: 'User Two',
      email: 'user2@example.com',
      role: 'seller',
      isEmailVerified: true,
      crWalletBalance: 100,
    });

    useAuthStore.getState().setSession({
      accessToken: 'token-1',
      user: mockUser1,
    });

    useAuthStore.getState().setSession({
      accessToken: 'token-2',
      user: mockUser2,
    });

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('token-2');
    expect(state.user?.displayName).toBe('User Two');
    expect(state.user?.role).toBe('seller');
  });
});
