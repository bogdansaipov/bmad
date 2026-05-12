import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RegisterRequestSchema, type RegisterRequest } from '@handrix/contracts';
import { useRegister } from '../hooks/useRegister';
import { useAuth } from '../context/AuthContext';

type FieldErrors = Partial<Record<keyof RegisterRequest, string>>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { mutate, isPending } = useRegister();

  const [form, setForm] = useState<RegisterRequest>({
    email: '',
    password: '',
    displayName: '',
    role: 'CUSTOMER',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setServerError(null);
  }

  function handleRoleSelect(role: 'CUSTOMER' | 'HANDYMAN') {
    setForm((prev) => ({ ...prev, role }));
    setFieldErrors((prev) => ({ ...prev, role: undefined }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = RegisterRequestSchema.safeParse(form);
    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof RegisterRequest;
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
        } catch {
          setServerError(
            'Your browser blocked saving your session. Disable private browsing or free up storage and try again.',
          );
          return;
        }
        if (data.role === 'CUSTOMER') {
          navigate('/dashboard/customer');
        } else {
          navigate('/dashboard/handyman');
        }
      },
      onError(err: unknown) {
        const error = err as { status?: number; message?: string };
        if (error.status === 409) {
          setFieldErrors((prev) => ({ ...prev, email: 'This email is already registered.' }));
        } else {
          setServerError(error.message ?? 'Registration failed. Please try again.');
        }
      },
    });
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Create account</h1>
        <p className="auth-subtitle">Join Handrix — it takes less than a minute</p>

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
            <label htmlFor="displayName">Display name</label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              autoComplete="name"
              value={form.displayName}
              onChange={handleChange}
              aria-describedby={fieldErrors.displayName ? 'displayName-error' : undefined}
              placeholder="Your name"
            />
            {fieldErrors.displayName && (
              <span id="displayName-error" role="alert" className="field-error">
                {fieldErrors.displayName}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              placeholder="Min. 8 characters"
            />
            {fieldErrors.password && (
              <span id="password-error" role="alert" className="field-error">
                {fieldErrors.password}
              </span>
            )}
          </div>

          <div className="form-group">
            <fieldset>
              <legend>I am joining as…</legend>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="role-btn"
                  aria-pressed={form.role === 'CUSTOMER'}
                  onClick={() => handleRoleSelect('CUSTOMER')}
                >
                  🏠 I need help at home
                </button>
                <button
                  type="button"
                  className="role-btn"
                  aria-pressed={form.role === 'HANDYMAN'}
                  onClick={() => handleRoleSelect('HANDYMAN')}
                >
                  🔧 I do repairs
                </button>
              </div>
              {fieldErrors.role && (
                <span role="alert" className="field-error">{fieldErrors.role}</span>
              )}
            </fieldset>
          </div>

          {serverError && (
            <div role="alert" aria-live="polite" className="server-error">
              {serverError}
            </div>
          )}

          <button type="submit" disabled={isPending}>
            {isPending ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="form-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
