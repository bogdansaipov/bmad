import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface RequireAuthProps {
  requiredRole?: 'CUSTOMER' | 'HANDYMAN';
  children: React.ReactNode;
}

export function RequireAuth({ requiredRole, children }: RequireAuthProps) {
  const { status, user } = useAuth();

  if (status === 'loading') return <p>Loading…</p>;
  if (status === 'unauthenticated') return <Navigate to="/login" replace />;

  if (requiredRole && user?.role !== requiredRole) {
    const to = user?.role === 'CUSTOMER' ? '/dashboard/customer' : '/dashboard/handyman';
    return <Navigate to={to} replace />;
  }

  return <>{children}</>;
}
