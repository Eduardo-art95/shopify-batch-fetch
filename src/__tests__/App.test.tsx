import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '@/App'

// Mock all pages to simplify testing
vi.mock('@/pages/Index', () => ({
  default: () => <div data-testid="index-page">Index Page</div>,
}))

vi.mock('@/pages/Auth', () => ({
  default: () => <div data-testid="auth-page">Auth Page</div>,
}))

vi.mock('@/pages/Dashboard', () => ({
  default: () => <div data-testid="dashboard-page">Dashboard Page</div>,
}))

vi.mock('@/pages/Settings', () => ({
  default: () => <div data-testid="settings-page">Settings Page</div>,
}))

vi.mock('@/pages/Orders', () => ({
  default: () => <div data-testid="orders-page">Orders Page</div>,
}))

vi.mock('@/pages/Logs', () => ({
  default: () => <div data-testid="logs-page">Logs Page</div>,
}))

vi.mock('@/pages/NotFound', () => ({
  default: () => <div data-testid="notfound-page">Not Found Page</div>,
}))

// Mock ProtectedRoute to simplify testing
const mockUseAuth = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => mockUseAuth(),
}))

vi.mock('@/components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => {
    const auth = mockUseAuth()
    if (auth.loading) return <div>Loading...</div>
    if (!auth.user) return <div data-testid="auth-redirect">Redirected to Auth</div>
    return <>{children}</>
  },
}))

// Mock UI components
vi.mock('@/components/ui/toaster', () => ({
  Toaster: () => <div data-testid="toaster">Toaster</div>,
}))

vi.mock('@/components/ui/sonner', () => ({
  Toaster: () => <div data-testid="sonner">Sonner</div>,
}))

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
    })
  })

  describe('Providers Setup', () => {
    it('should render the app with all providers', () => {
      render(<App />)
      expect(screen.getByTestId('toaster')).toBeInTheDocument()
      expect(screen.getByTestId('sonner')).toBeInTheDocument()
    })
  })

  describe('Public Routes', () => {
    it('should render Index page at root path', () => {
      window.history.pushState({}, '', '/')
      render(<App />)
      expect(screen.getByTestId('index-page')).toBeInTheDocument()
    })

    it('should render Auth page at /auth path', () => {
      window.history.pushState({}, '', '/auth')
      render(<App />)
      expect(screen.getByTestId('auth-page')).toBeInTheDocument()
    })

    it('should render NotFound page for unknown routes', () => {
      window.history.pushState({}, '', '/unknown-route')
      render(<App />)
      expect(screen.getByTestId('notfound-page')).toBeInTheDocument()
    })
  })

  describe('Protected Routes - Unauthenticated', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      })
    })

    it('should redirect from /dashboard when not authenticated', () => {
      window.history.pushState({}, '', '/dashboard')
      render(<App />)
      expect(screen.getByTestId('auth-redirect')).toBeInTheDocument()
    })

    it('should redirect from /settings when not authenticated', () => {
      window.history.pushState({}, '', '/settings')
      render(<App />)
      expect(screen.getByTestId('auth-redirect')).toBeInTheDocument()
    })

    it('should redirect from /orders when not authenticated', () => {
      window.history.pushState({}, '', '/orders')
      render(<App />)
      expect(screen.getByTestId('auth-redirect')).toBeInTheDocument()
    })

    it('should redirect from /logs when not authenticated', () => {
      window.history.pushState({}, '', '/logs')
      render(<App />)
      expect(screen.getByTestId('auth-redirect')).toBeInTheDocument()
    })
  })

  describe('Protected Routes - Authenticated', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user-id', email: 'test@example.com' },
        loading: false,
      })
    })

    it('should render Dashboard page when authenticated', () => {
      window.history.pushState({}, '', '/dashboard')
      render(<App />)
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
    })

    it('should render Settings page when authenticated', () => {
      window.history.pushState({}, '', '/settings')
      render(<App />)
      expect(screen.getByTestId('settings-page')).toBeInTheDocument()
    })

    it('should render Orders page when authenticated', () => {
      window.history.pushState({}, '', '/orders')
      render(<App />)
      expect(screen.getByTestId('orders-page')).toBeInTheDocument()
    })

    it('should render Logs page when authenticated', () => {
      window.history.pushState({}, '', '/logs')
      render(<App />)
      expect(screen.getByTestId('logs-page')).toBeInTheDocument()
    })
  })

  describe('Protected Routes - Loading State', () => {
    it('should show loading state when auth is loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      })

      window.history.pushState({}, '', '/dashboard')
      render(<App />)
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('Route Structure', () => {
    it('should have catch-all route for 404', () => {
      window.history.pushState({}, '', '/some/random/path/that/does/not/exist')
      render(<App />)
      expect(screen.getByTestId('notfound-page')).toBeInTheDocument()
    })
  })
})
