import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { mockUser, mockSession } from '@/test/mocks/supabase'

// Mock the supabase client - inline the mock object to avoid hoisting issues
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((callback) => {
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        }
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    })),
  },
}))

// Get the mocked supabase
import { supabase } from '@/integrations/supabase/client'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe('useAuth hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('should throw error when used outside AuthProvider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        renderHook(() => useAuth())
      }).toThrow('useAuth must be used within an AuthProvider')

      consoleSpy.mockRestore()
    })

    it('should start with loading state', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      expect(result.current.loading).toBe(true)
      expect(result.current.user).toBe(null)
      expect(result.current.session).toBe(null)
    })

    it('should initialize with no user when session is null', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toBe(null)
      expect(result.current.session).toBe(null)
    })

    it('should initialize with user when session exists', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.session).toEqual(mockSession)
    })
  })

  describe('signIn', () => {
    it('should sign in successfully', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let signInResult: any
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'password123')
      })

      expect(signInResult.error).toBe(null)
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    it('should return error on sign in failure', async () => {
      const mockError = { message: 'Invalid credentials' }
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: mockError,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let signInResult: any
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'wrongpassword')
      })

      expect(signInResult.error).toEqual(mockError)
    })

    it('should handle empty email', async () => {
      const mockError = { message: 'Email is required' }
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: mockError,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let signInResult: any
      await act(async () => {
        signInResult = await result.current.signIn('', 'password123')
      })

      expect(signInResult.error).toEqual(mockError)
    })

    it('should handle empty password', async () => {
      const mockError = { message: 'Password is required' }
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: mockError,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let signInResult: any
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', '')
      })

      expect(signInResult.error).toEqual(mockError)
    })
  })

  describe('signUp', () => {
    it('should sign up successfully and create profile', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      })
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let signUpResult: any
      await act(async () => {
        signUpResult = await result.current.signUp('test@example.com', 'password123')
      })

      expect(signUpResult.error).toBe(null)
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          emailRedirectTo: expect.stringContaining('/'),
        },
      })
      expect(supabase.from).toHaveBeenCalledWith('profiles')
    })

    it('should return error on sign up failure', async () => {
      const mockError = { message: 'Email already exists' }
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: mockError,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let signUpResult: any
      await act(async () => {
        signUpResult = await result.current.signUp('test@example.com', 'password123')
      })

      expect(signUpResult.error).toEqual(mockError)
    })

    it('should not create profile on sign up error', async () => {
      const mockError = { message: 'Signup failed' }
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: mockError,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.signUp('test@example.com', 'password123')
      })

      expect(supabase.from).not.toHaveBeenCalled()
    })
  })

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.signOut()
      })

      expect(supabase.auth.signOut).toHaveBeenCalled()
    })
  })

  describe('Auth State Changes', () => {
    it('should subscribe to auth state changes', () => {
      renderHook(() => useAuth(), { wrapper })

      expect(supabase.auth.onAuthStateChange).toHaveBeenCalled()
    })

    it('should unsubscribe on unmount', () => {
      const { unmount } = renderHook(() => useAuth(), { wrapper })

      const subscription = vi.mocked(supabase.auth.onAuthStateChange).mock.results[0].value.data.subscription

      unmount()

      expect(subscription.unsubscribe).toHaveBeenCalled()
    })
  })

  describe('Context Values', () => {
    it('should provide all required methods', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current).toHaveProperty('user')
      expect(result.current).toHaveProperty('session')
      expect(result.current).toHaveProperty('loading')
      expect(result.current).toHaveProperty('signIn')
      expect(result.current).toHaveProperty('signUp')
      expect(result.current).toHaveProperty('signOut')
      expect(typeof result.current.signIn).toBe('function')
      expect(typeof result.current.signUp).toBe('function')
      expect(typeof result.current.signOut).toBe('function')
    })
  })
})
