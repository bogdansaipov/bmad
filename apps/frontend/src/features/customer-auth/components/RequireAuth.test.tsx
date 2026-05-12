import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequireAuth } from './RequireAuth';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../context/AuthContext';

function renderWithRouter(element: React.ReactNode, initialPath = '/protected') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/protected" element={element} />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/dashboard/customer" element={<div>Customer Dashboard</div>} />
        <Route path="/dashboard/handyman" element={<div>Handyman Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('unauthenticated → navigates to /login', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'unauthenticated',
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter(
      <RequireAuth>
        <div>Protected Content</div>
      </RequireAuth>,
    );

    expect(screen.getByText('Login Page')).toBeDefined();
    expect(screen.queryByText('Protected Content')).toBeNull();
  });

  it('authenticated CUSTOMER on requiredRole=HANDYMAN → navigates to /dashboard/customer', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: { userId: 'u1', email: 'a@b.com', role: 'CUSTOMER' },
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter(
      <RequireAuth requiredRole="HANDYMAN">
        <div>Handyman Content</div>
      </RequireAuth>,
    );

    expect(screen.getByText('Customer Dashboard')).toBeDefined();
    expect(screen.queryByText('Handyman Content')).toBeNull();
  });

  it('authenticated CUSTOMER on requiredRole=CUSTOMER → renders children', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: { userId: 'u1', email: 'a@b.com', role: 'CUSTOMER' },
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter(
      <RequireAuth requiredRole="CUSTOMER">
        <div>Protected Content</div>
      </RequireAuth>,
    );

    expect(screen.getByText('Protected Content')).toBeDefined();
  });

  it('loading state → renders loading placeholder', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'loading',
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter(
      <RequireAuth>
        <div>Protected Content</div>
      </RequireAuth>,
    );

    expect(screen.getByText('Loading…')).toBeDefined();
  });
});
