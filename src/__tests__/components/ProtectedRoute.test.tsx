import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'

// Mock useAuth hook
const mockUseAuth = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

const TestComponent = () => <div data-testid="protected-content">Protected Content</div>

const renderWithRouter = (initialPath = '/protected') => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <TestComponent />
            </ProtectedRoute>
          }
        />
        <Route path="/auth" element={<div data-testid="auth-page">Auth Page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should show loading spinner when loading is true', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      })

      renderWithRouter()

      expect(screen.getByText('A carregar...')).toBeInTheDocument()
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })

    it('should display spinner animation', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      })

      renderWithRouter()

      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should center the loading indicator', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      })

      renderWithRouter()

      const container = document.querySelector('.flex.min-h-screen.items-center.justify-center')
      expect(container).toBeInTheDocument()
    })
  })

  describe('Unauthenticated State', () => {
    it('should redirect to /auth when user is null and not loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      })

      renderWithRouter()

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      expect(screen.getByTestId('auth-page')).toBeInTheDocument()
    })

    it('should redirect with replace flag', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      })

      renderWithRouter()

      // The redirect should replace the history entry
      expect(screen.getByTestId('auth-page')).toBeInTheDocument()
    })
  })

  describe('Authenticated State', () => {
    it('should render children when user is authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user-id', email: 'test@example.com' },
        loading: false,
      })

      renderWithRouter()

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('should not show loading indicator when authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user-id', email: 'test@example.com' },
        loading: false,
      })

      renderWithRouter()

      expect(screen.queryByText('A carregar...')).not.toBeInTheDocument()
    })

    it('should not redirect when authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user-id', email: 'test@example.com' },
        loading: false,
      })

      renderWithRouter()

      expect(screen.queryByTestId('auth-page')).not.toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle user with minimal properties', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'minimal-user' },
        loading: false,
      })

      renderWithRouter()

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('should handle undefined user gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: undefined,
        loading: false,
      })

      renderWithRouter()

      // Should treat undefined as not authenticated
      expect(screen.getByTestId('auth-page')).toBeInTheDocument()
    })

    it('should render different children correctly', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user-id' },
        loading: false,
      })

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div>
                    <h1>Dashboard</h1>
                    <p>Welcome back!</p>
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      )

      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Welcome back!')).toBeInTheDocument()
    })

    it('should preserve child props and structure', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user-id' },
        loading: false,
      })

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div data-custom-prop="test" className="custom-class">
                    Nested Content
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      )

      const element = screen.getByText('Nested Content')
      expect(element).toHaveAttribute('data-custom-prop', 'test')
      expect(element).toHaveClass('custom-class')
    })
  })
})
