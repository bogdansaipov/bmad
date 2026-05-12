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
      },
      onError(err: unknown) {
        const error = err as { status?: number; message?: string };
        setServerError(error.message ?? 'Login failed. Please try again.');
      },
    });
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p className="auth-subtitle">Sign in to your Handrix account</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              placeholder="you@example.com"
            />
            {fieldErrors.email && (
              <span id="email-error" role="alert" className="field-error">
                {fieldErrors.email}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              placeholder="••••••••"
            />
            {fieldErrors.password && (
              <span id="password-error" role="alert" className="field-error">
                {fieldErrors.password}
              </span>
            )}
          </div>

          {serverError && (
            <div role="alert" aria-live="polite" className="server-error">
              {serverError}
            </div>
          )}

          <button type="submit" disabled={isPending}>
            {isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="form-footer">
          Don&apos;t have an account?{' '}
          <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}
