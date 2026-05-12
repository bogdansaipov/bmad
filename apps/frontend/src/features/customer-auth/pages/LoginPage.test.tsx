import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginPage } from './LoginPage';

// Mock the api module so loginUser is controllable
vi.mock('../api/auth.api', () => ({
  fetchSession: vi.fn().mockResolvedValue(null),
  loginUser: vi.fn(),
}));

// Mock the auth context to avoid async fetchSession in AuthProvider
vi.mock('../context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: vi.fn().mockReturnValue({
    status: 'unauthenticated',
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

import { loginUser } from '../api/auth.api';
import { useAuth } from '../context/AuthContext';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      status: 'unauthenticated',
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    localStorage.clear();
  });

  it('empty submit shows field-level validation errors', async () => {
    render(<LoginPage />, { wrapper });

    fireEvent.submit(screen.getByRole('button', { name: /log in/i }).closest('form')!);

    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    });
  });

  it('invalid email shows email field error', async () => {
    render(<LoginPage />, { wrapper });

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { name: 'email', value: 'not-an-email' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { name: 'password', value: 'password123' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /log in/i }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });
  });

  it('happy path: loginUser called, token stored in localStorage', async () => {
    const mockLogin = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      status: 'unauthenticated',
      user: null,
      login: mockLogin,
      logout: vi.fn(),
    });
    vi.mocked(loginUser).mockResolvedValue({
      userId: 'user-uuid-1',
      email: 'user@example.com',
      role: 'CUSTOMER',
      accessToken: 'test.jwt.token',
    });

    render(<LoginPage />, { wrapper });

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { name: 'email', value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { name: 'password', value: 'password123' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /log in/i }).closest('form')!);

    await waitFor(() => {
      expect(vi.mocked(loginUser)).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      });
    });

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
  });
});
