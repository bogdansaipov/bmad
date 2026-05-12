import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AuthProvider, useAuth } from './features/customer-auth/context/AuthContext';
import { RequireAuth } from './features/customer-auth/components/RequireAuth';
import { RegisterPage } from './features/customer-auth/pages/RegisterPage';
import { LoginPage } from './features/customer-auth/pages/LoginPage';

function CustomerDashboardStub() {
  const { logout } = useAuth();
  return (
    <div>
      <h1>Customer Dashboard</h1>
      <button onClick={logout} style={{ minHeight: 44, minWidth: 44 }}>Log out</button>
    </div>
  );
}

function HandymanDashboardStub() {
  const { logout } = useAuth();
  return (
    <div>
      <h1>Handyman Dashboard</h1>
      <button onClick={logout} style={{ minHeight: 44, minWidth: 44 }}>Log out</button>
    </div>
  );
}

function RootRedirect() {
  const { status, user } = useAuth();
  if (status === 'loading') return <p>Loading…</p>;
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
        <CustomerDashboardStub />
      </RequireAuth>
    ),
  },
  {
    path: '/dashboard/handyman',
    element: (
      <RequireAuth requiredRole="HANDYMAN">
        <HandymanDashboardStub />
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
