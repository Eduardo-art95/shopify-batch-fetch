import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from '@/pages/Dashboard'
import { mockUser } from '@/test/mocks/supabase'

// Mock the supabase client - can't use external function in vi.mock factory
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    })),
  },
}))

import { supabase } from '@/integrations/supabase/client'

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}))

// Mock DashboardLayout
vi.mock('@/components/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}))

const renderDashboard = () => {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  )
}

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mocks with default behavior
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'orders') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        } as any
      }
      if (table === 'automation_logs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        } as any
      }
      if (table === 'shopify_config') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        } as any
      }
      return {} as any
    })
  })

  describe('Loading State', () => {
    it('should show loading spinner initially', () => {
      renderDashboard()
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('should hide loading spinner after data loads', async () => {
      renderDashboard()

      await waitFor(() => {
        expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
      })
    })
  })

  describe('Dashboard Content', () => {
    it('should render dashboard title', async () => {
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
      })
    })

    it('should render dashboard description', async () => {
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('Visão geral da automação de encomendas Shopify')).toBeInTheDocument()
      })
    })

    it('should render in DashboardLayout', async () => {
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument()
      })
    })
  })

  describe('Statistics Cards', () => {
    it('should render total orders card', async () => {
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('Total de Encomendas')).toBeInTheDocument()
      })
    })

    it('should render automation logs card', async () => {
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('Execuções de Automação')).toBeInTheDocument()
      })
    })

    it('should render configuration status card', async () => {
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('Estado da Configuração')).toBeInTheDocument()
      })
    })

    it('should display order count', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 42, error: null }),
            }),
          } as any
        }
        if (table === 'automation_logs') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          } as any
        }
        if (table === 'shopify_config') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          } as any
        }
        return {} as any
      })

      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('42')).toBeInTheDocument()
      })
    })

    it('should display logs count', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          } as any
        }
        if (table === 'automation_logs') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 15, error: null }),
            }),
          } as any
        }
        if (table === 'shopify_config') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          } as any
        }
        return {} as any
      })

      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument()
      })
    })
  })

  describe('Configuration Status', () => {
    it('should show alert when not configured', async () => {
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('Configuração Necessária')).toBeInTheDocument()
      })
    })

    it('should show configuration message when not configured', async () => {
      renderDashboard()

      await waitFor(() => {
        expect(
          screen.getByText(/Configure a conexão com o Shopify para começar a extrair encomendas automaticamente/)
        ).toBeInTheDocument()
      })
    })

    it('should show settings link when not configured', async () => {
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('Ir para Configurações')).toBeInTheDocument()
      })
    })

    it('should navigate to settings when clicking link', async () => {
      const user = userEvent.setup()
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('Ir para Configurações')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Ir para Configurações'))

      expect(mockNavigate).toHaveBeenCalledWith('/settings')
    })

    it('should not show alert when configured', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          } as any
        }
        if (table === 'automation_logs') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          } as any
        }
        if (table === 'shopify_config') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { shop_url: 'https://myshop.myshopify.com', last_sync: null },
                  error: null,
                }),
              }),
            }),
          } as any
        }
        return {} as any
      })

      renderDashboard()

      await waitFor(() => {
        expect(screen.queryByText('Configuração Necessária')).not.toBeInTheDocument()
      })
    })

    it('should show configured status', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          } as any
        }
        if (table === 'automation_logs') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          } as any
        }
        if (table === 'shopify_config') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { shop_url: 'https://myshop.myshopify.com', last_sync: null },
                  error: null,
                }),
              }),
            }),
          } as any
        }
        return {} as any
      })

      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('✓')).toBeInTheDocument()
        expect(screen.getByText('Shopify conectado')).toBeInTheDocument()
      })
    })

    it('should show not configured status', async () => {
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('✗')).toBeInTheDocument()
        expect(screen.getByText('Não configurado')).toBeInTheDocument()
      })
    })
  })

  describe('Last Sync', () => {
    it('should show last sync card when sync date exists', async () => {
      const lastSyncDate = '2024-01-15T10:30:00.000Z'
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          } as any
        }
        if (table === 'automation_logs') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          } as any
        }
        if (table === 'shopify_config') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { shop_url: 'https://myshop.myshopify.com', last_sync: lastSyncDate },
                  error: null,
                }),
              }),
            }),
          } as any
        }
        return {} as any
      })

      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('Última Sincronização')).toBeInTheDocument()
      })
    })

    it('should not show last sync card when no sync date', async () => {
      renderDashboard()

      await waitFor(() => {
        expect(screen.queryByText('Última Sincronização')).not.toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error('API Error')
      })

      renderDashboard()

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error loading stats:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })

    it('should still show dashboard after error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})

      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error('API Error')
      })

      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
      })
    })
  })
})
