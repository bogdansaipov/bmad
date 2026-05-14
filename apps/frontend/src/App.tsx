import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AuthProvider, useAuth } from './features/customer-auth/context/AuthContext';
import { RequireAuth } from './features/customer-auth/components/RequireAuth';
import { RegisterPage } from './features/customer-auth/pages/RegisterPage';
import { LoginPage } from './features/customer-auth/pages/LoginPage';
import { CustomerDashboardPage } from './features/customer-dashboard/pages/CustomerDashboardPage';
import { CreateRequestPage } from './features/request-create/pages/CreateRequestPage';
import { HandymanDashboardPage } from './features/handyman-dashboard/pages/HandymanDashboardPage';

function RootRedirect() {
  const { status, user } = useAuth();
  if (status === 'loading') return <div className="loading">Loading…</div>;
  if (status === 'unauthenticated') return <Navigate to="/login" replace />;
  const to = user?.role === 'CUSTOMER' ? '/dashboard/customer' : '/dashboard/handyman';
  return <Navigate to={to} replace />;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/dashboard/customer',
    element: (
      <RequireAuth requiredRole="CUSTOMER">
        <CustomerDashboardPage />
      </RequireAuth>
    ),
  },
  {
    path: '/dashboard/handyman',
    element: (
      <RequireAuth requiredRole="HANDYMAN">
        <HandymanDashboardPage />
      </RequireAuth>
    ),
  },
  {
    path: '/requests/new',
    element: (
      <RequireAuth requiredRole="CUSTOMER">
        <CreateRequestPage />
      </RequireAuth>
    ),
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
