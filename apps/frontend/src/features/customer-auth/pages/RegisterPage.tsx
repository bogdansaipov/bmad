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
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1>Create your Handrix account</h1>
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
          <label htmlFor="password">Password (min 8 characters)</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
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

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="displayName">Display name</label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            autoComplete="name"
            value={form.displayName}
            onChange={handleChange}
            aria-describedby={fieldErrors.displayName ? 'displayName-error' : undefined}
            style={{ display: 'block', width: '100%', minHeight: 44 }}
          />
          {fieldErrors.displayName && (
            <span id="displayName-error" role="alert" style={{ color: 'red', display: 'block' }}>
              {fieldErrors.displayName}
            </span>
          )}
        </div>

        <fieldset style={{ border: 'none', padding: 0, marginBottom: '1rem' }}>
          <legend>I am joining as…</legend>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              aria-pressed={form.role === 'CUSTOMER'}
              onClick={() => handleRoleSelect('CUSTOMER')}
              style={{
                flex: 1,
                minHeight: 44,
                fontWeight: form.role === 'CUSTOMER' ? 'bold' : 'normal',
                border: form.role === 'CUSTOMER' ? '2px solid #1a237e' : '1px solid #ccc',
              }}
            >
              I need help at home
            </button>
            <button
              type="button"
              aria-pressed={form.role === 'HANDYMAN'}
              onClick={() => handleRoleSelect('HANDYMAN')}
              style={{
                flex: 1,
                minHeight: 44,
                fontWeight: form.role === 'HANDYMAN' ? 'bold' : 'normal',
                border: form.role === 'HANDYMAN' ? '2px solid #1a237e' : '1px solid #ccc',
              }}
            >
              I do repairs
            </button>
          </div>
          {fieldErrors.role && (
            <span role="alert" style={{ color: 'red', display: 'block', marginTop: '0.25rem' }}>
              {fieldErrors.role}
            </span>
          )}
        </fieldset>

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
          {isPending ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p style={{ marginTop: '1rem' }}>
        Already have an account?{' '}
        <Link to="/login">Log in</Link>
      </p>
    </main>
  );
}
