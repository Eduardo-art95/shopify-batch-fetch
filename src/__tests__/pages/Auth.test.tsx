import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Auth from '@/pages/Auth'

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
const mockSignIn = vi.fn()
const mockSignUp = vi.fn()
const mockUseAuth = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock useToast
const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

const renderAuth = () => {
  return render(
    <MemoryRouter>
      <Auth />
    </MemoryRouter>
  )
}

describe('Auth Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      signIn: mockSignIn,
      signUp: mockSignUp,
      user: null,
    })
    mockSignIn.mockResolvedValue({ error: null })
    mockSignUp.mockResolvedValue({ error: null })
  })

  describe('Rendering', () => {
    it('should render the auth page', () => {
      renderAuth()
      expect(screen.getByText('Shopify Automação')).toBeInTheDocument()
    })

    it('should render login tab by default', () => {
      renderAuth()
      expect(screen.getByRole('tab', { name: /login/i })).toHaveAttribute('data-state', 'active')
    })

    it('should render register tab', () => {
      renderAuth()
      expect(screen.getByRole('tab', { name: /registar/i })).toBeInTheDocument()
    })

    it('should render email and password fields', () => {
      renderAuth()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    })

    it('should render welcome message', () => {
      renderAuth()
      expect(screen.getByText('Bem-vindo')).toBeInTheDocument()
    })

    it('should render login button', () => {
      renderAuth()
      expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
    })
  })

  describe('User Already Authenticated', () => {
    it('should redirect to dashboard when user is already logged in', () => {
      mockUseAuth.mockReturnValue({
        signIn: mockSignIn,
        signUp: mockSignUp,
        user: { id: 'test-user', email: 'test@example.com' },
      })

      renderAuth()

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  describe('Login Form', () => {
    it('should update email field on input', async () => {
      const user = userEvent.setup()
      renderAuth()

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'test@example.com')

      expect(emailInput).toHaveValue('test@example.com')
    })

    it('should update password field on input', async () => {
      const user = userEvent.setup()
      renderAuth()

      const passwordInput = screen.getByLabelText(/password/i)
      await user.type(passwordInput, 'password123')

      expect(passwordInput).toHaveValue('password123')
    })

    it('should show error toast when fields are empty on login', async () => {
      renderAuth()

      // Directly submit the form to bypass HTML5 validation
      const form = screen.getByRole('button', { name: /entrar/i }).closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Erro',
          description: 'Por favor preencha todos os campos',
          variant: 'destructive',
        })
      })
    })

    it('should call signIn with email and password', async () => {
      const user = userEvent.setup()
      renderAuth()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /entrar/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
      })
    })

    it('should show success toast on successful login', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({ error: null })
      renderAuth()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /entrar/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Bem-vindo!',
          description: 'Login efetuado com sucesso',
        })
      })
    })

    it('should show error toast on login failure', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({ error: { message: 'Invalid credentials' } })
      renderAuth()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /entrar/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Erro ao entrar',
          description: 'Invalid credentials',
          variant: 'destructive',
        })
      })
    })

    it('should disable button while loading', async () => {
      const user = userEvent.setup()
      mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ error: null }), 1000)))
      renderAuth()

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /entrar/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      expect(submitButton).toBeDisabled()
      expect(screen.getByText('A entrar...')).toBeInTheDocument()
    })
  })

  describe('Register Form', () => {
    it('should switch to register tab', async () => {
      const user = userEvent.setup()
      renderAuth()

      const registerTab = screen.getByRole('tab', { name: /registar/i })
      await user.click(registerTab)

      expect(registerTab).toHaveAttribute('data-state', 'active')
    })

    it('should render register form with correct button', async () => {
      const user = userEvent.setup()
      renderAuth()

      const registerTab = screen.getByRole('tab', { name: /registar/i })
      await user.click(registerTab)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /criar conta/i })).toBeInTheDocument()
      })
    })

    it('should validate password length on registration', async () => {
      const user = userEvent.setup()
      renderAuth()

      const registerTab = screen.getByRole('tab', { name: /registar/i })
      await user.click(registerTab)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /criar conta/i })).toBeInTheDocument()
      })

      const emailInput = screen.getByPlaceholderText('seu@email.com')
      const passwordInput = screen.getByPlaceholderText('••••••••')
      const submitButton = screen.getByRole('button', { name: /criar conta/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, '12345') // Only 5 characters
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Erro',
          description: 'A password deve ter pelo menos 6 caracteres',
          variant: 'destructive',
        })
      })
    })

    it('should call signUp with valid data', async () => {
      const user = userEvent.setup()
      renderAuth()

      const registerTab = screen.getByRole('tab', { name: /registar/i })
      await user.click(registerTab)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /criar conta/i })).toBeInTheDocument()
      })

      const emailInput = screen.getByPlaceholderText('seu@email.com')
      const passwordInput = screen.getByPlaceholderText('••••••••')
      const submitButton = screen.getByRole('button', { name: /criar conta/i })

      await user.type(emailInput, 'newuser@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith('newuser@example.com', 'password123')
      })
    })

    it('should show success toast on successful registration', async () => {
      const user = userEvent.setup()
      mockSignUp.mockResolvedValue({ error: null })
      renderAuth()

      const registerTab = screen.getByRole('tab', { name: /registar/i })
      await user.click(registerTab)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /criar conta/i })).toBeInTheDocument()
      })

      const emailInput = screen.getByPlaceholderText('seu@email.com')
      const passwordInput = screen.getByPlaceholderText('••••••••')
      const submitButton = screen.getByRole('button', { name: /criar conta/i })

      await user.type(emailInput, 'newuser@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Conta criada!',
          description: 'Pode agora fazer login',
        })
      })
    })

    it('should show error toast on registration failure', async () => {
      const user = userEvent.setup()
      mockSignUp.mockResolvedValue({ error: { message: 'Email already exists' } })
      renderAuth()

      const registerTab = screen.getByRole('tab', { name: /registar/i })
      await user.click(registerTab)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /criar conta/i })).toBeInTheDocument()
      })

      const emailInput = screen.getByPlaceholderText('seu@email.com')
      const passwordInput = screen.getByPlaceholderText('••••••••')
      const submitButton = screen.getByRole('button', { name: /criar conta/i })

      await user.type(emailInput, 'existing@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Erro ao registar',
          description: 'Email already exists',
          variant: 'destructive',
        })
      })
    })

    it('should show error when registration fields are empty', async () => {
      const user = userEvent.setup()
      renderAuth()

      const registerTab = screen.getByRole('tab', { name: /registar/i })
      await user.click(registerTab)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /criar conta/i })).toBeInTheDocument()
      })

      // Directly submit the form to bypass HTML5 validation
      const submitButton = screen.getByRole('button', { name: /criar conta/i })
      const form = submitButton.closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Erro',
          description: 'Por favor preencha todos os campos',
          variant: 'destructive',
        })
      })
    })

    it('should disable button while creating account', async () => {
      const user = userEvent.setup()
      mockSignUp.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ error: null }), 1000)))
      renderAuth()

      const registerTab = screen.getByRole('tab', { name: /registar/i })
      await user.click(registerTab)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /criar conta/i })).toBeInTheDocument()
      })

      const emailInput = screen.getByPlaceholderText('seu@email.com')
      const passwordInput = screen.getByPlaceholderText('••••••••')
      const submitButton = screen.getByRole('button', { name: /criar conta/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      expect(submitButton).toBeDisabled()
      expect(screen.getByText('A criar conta...')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels for form fields', () => {
      renderAuth()

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    })

    it('should have required attribute on email input', () => {
      renderAuth()
      const emailInput = screen.getByLabelText(/email/i)
      expect(emailInput).toHaveAttribute('required')
    })

    it('should have required attribute on password input', () => {
      renderAuth()
      const passwordInput = screen.getByLabelText(/password/i)
      expect(passwordInput).toHaveAttribute('required')
    })

    it('should have correct input types', () => {
      renderAuth()
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      expect(emailInput).toHaveAttribute('type', 'email')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })
  })
})
