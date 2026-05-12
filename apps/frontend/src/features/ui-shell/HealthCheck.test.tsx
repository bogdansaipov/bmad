import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealthCheck } from './HealthCheck';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('HealthCheck', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('renders loading state initially', () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));
    render(<HealthCheck />, { wrapper });
    expect(screen.getByText('Checking API…')).toBeDefined();
  });

  it('renders connected when API returns ok', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok' }),
    } as Response);

    render(<HealthCheck />, { wrapper });
    const el = await screen.findByText('API connected');
    expect(el).toBeDefined();
  });

  it('renders unreachable when fetch fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

    render(<HealthCheck />, { wrapper });
    const el = await screen.findByText('API unreachable');
    expect(el).toBeDefined();
  });
});
