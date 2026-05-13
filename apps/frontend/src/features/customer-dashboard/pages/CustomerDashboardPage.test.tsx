import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomerDashboardPage } from './CustomerDashboardPage';

vi.mock('../hooks/useCustomerRequests');

import { useCustomerRequests } from '../hooks/useCustomerRequests';

function wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

describe('CustomerDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loading state renders skeleton with aria-busy', () => {
    vi.mocked(useCustomerRequests).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as ReturnType<typeof useCustomerRequests>);

    const { container } = render(<CustomerDashboardPage />, { wrapper });

    const skeletonContainer = container.querySelector('[aria-busy="true"]');
    expect(skeletonContainer).not.toBeNull();
  });

  it('empty state renders when items is empty', () => {
    vi.mocked(useCustomerRequests).mockReturnValue({
      data: { items: [] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as ReturnType<typeof useCustomerRequests>);

    render(<CustomerDashboardPage />, { wrapper });

    expect(screen.getByText('You have no requests yet')).toBeDefined();
    const newRequestLink = screen.getByRole('link', { name: /create your first request/i });
    expect(newRequestLink).toBeDefined();
  });

  it('populated state renders request cards with titles and status chips', () => {
    vi.mocked(useCustomerRequests).mockReturnValue({
      data: {
        items: [
          {
            id: '1',
            title: 'Fix my sink',
            status: 'PENDING',
            estimatedTotal: null,
            categoryName: 'Plumbing',
            assignedHandymanDisplayName: null,
            createdAt: '2026-05-01T10:00:00.000Z',
          },
          {
            id: '2',
            title: 'Fix wiring',
            status: 'ASSIGNED',
            estimatedTotal: 120,
            categoryName: 'Electrical',
            assignedHandymanDisplayName: 'John E.',
            createdAt: '2026-05-02T09:00:00.000Z',
          },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as ReturnType<typeof useCustomerRequests>);

    render(<CustomerDashboardPage />, { wrapper });

    expect(screen.getByText('Fix my sink')).toBeDefined();
    expect(screen.getByText('Fix wiring')).toBeDefined();
    expect(screen.getByText('Pending')).toBeDefined();
    expect(screen.getByText('Assigned')).toBeDefined();
  });

  it('nav bar renders with exactly 4 items', () => {
    vi.mocked(useCustomerRequests).mockReturnValue({
      data: { items: [] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as ReturnType<typeof useCustomerRequests>);

    render(<CustomerDashboardPage />, { wrapper });

    const nav = screen.getByRole('navigation', { name: 'Customer navigation' });
    const navLinks = nav.querySelectorAll('a');
    expect(navLinks).toHaveLength(4);

    const labels = Array.from(navLinks).map((l) => l.textContent);
    expect(labels).toContain('Home');
    expect(labels).toContain('New Request');
    expect(labels).toContain('History');
    expect(labels).toContain('Profile');
  });
});
