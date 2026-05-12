import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { LoginRequestSchema, type LoginRequest } from '@handrix/contracts';
import { useLogin } from '../hooks/useLogin';
import { useAuth } from '../context/AuthContext';

type FieldErrors = Partial<Record<keyof LoginRequest, string>>;

export function LoginPage() {
  const { status, user, login } = useAuth();
  const { mutate, isPending } = useLogin();

  const [form, setForm] = useState<LoginRequest>({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  if (status === 'authenticated' && user) {
    const to = user.role === 'CUSTOMER' ? '/dashboard/customer' : '/dashboard/handyman';
    return <Navigate to={to} replace />;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setServerError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = LoginRequestSchema.safeParse(form);
    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof LoginRequest;
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setServerError(null);
    mutate(result.data, {
      onSuccess(data) {
        try {
          login(data);
        } catch (storageErr: unknown) {
          const msg = storageErr instanceof Error ? storageErr.message : 'Failed to save session.';
          setServerError(msg);
          return;
        }
        // Navigation handled by AuthContext state change → Navigate above re-renders
      },
      onError(err: unknown) {
        const error = err as { status?: number; message?: string };
        setServerError(error.message ?? 'Login failed. Please try again.');
      },
    });
  }

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1>Sign in to Handrix</h1>
      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            style={{ display: 'block', width: '100%', minHeight: 44 }}
          />
          {fieldErrors.email && (
            <span id="email-error" role="alert" style={{ color: 'red', display: 'block' }}>
              {fieldErrors.email}
            </span>
          )}
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            style={{ display: 'block', width: '100%', minHeight: 44 }}
          />
          {fieldErrors.password && (
            <span id="password-error" role="alert" style={{ color: 'red', display: 'block' }}>
              {fieldErrors.password}
            </span>
          )}
        </div>

        {serverError && (
          <div aria-live="polite" style={{ color: 'red', marginBottom: '1rem' }}>
            {serverError}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          style={{ width: '100%', minHeight: 44, background: '#1a237e', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          {isPending ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p style={{ marginTop: '1rem' }}>
        Don&apos;t have an account?{' '}
        <Link to="/register">Register</Link>
      </p>
    </main>
  );
}
