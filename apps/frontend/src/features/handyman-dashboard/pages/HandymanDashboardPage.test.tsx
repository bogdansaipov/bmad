import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CategoryListResponse,
  HandymanProfileSetupResponse,
} from '@handrix/contracts';

vi.mock('../../customer-auth/context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: vi.fn().mockReturnValue({
    status: 'authenticated',
    user: { userId: 'h-1', email: 'handy@example.com', role: 'HANDYMAN' },
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('../api/handyman-profile.api', async () => {
  const actual = await vi.importActual<typeof import('../api/handyman-profile.api')>(
    '../api/handyman-profile.api',
  );
  return {
    ...actual,
    fetchHandymanProfile: vi.fn(),
    updateHandymanProfile: vi.fn(),
    fetchHandymanCategories: vi.fn(),
  };
});

import {
  fetchHandymanCategories,
  fetchHandymanProfile,
  updateHandymanProfile,
} from '../api/handyman-profile.api';
import { HandymanDashboardPage } from './HandymanDashboardPage';

const CATEGORIES: CategoryListResponse = {
  items: [
    { id: 'cat-1', name: 'Plumbing', description: null },
    { id: 'cat-2', name: 'Electrical', description: null },
  ],
};

function incompleteProfile(): HandymanProfileSetupResponse {
  return {
    displayName: 'Jane H.',
    availabilityStatus: 'offline',
    serviceRadiusKm: null,
    categories: [],
    isProfileComplete: false,
  };
}

function completeProfile(): HandymanProfileSetupResponse {
  return {
    displayName: 'Jane H.',
    availabilityStatus: 'offline',
    serviceRadiusKm: 12,
    categories: [{ categoryId: 'cat-1', categoryName: 'Plumbing' }],
    isProfileComplete: true,
  };
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HandymanDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('HandymanDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows blocked-state setup banner and locked jobs message when profile is incomplete', async () => {
    vi.mocked(fetchHandymanProfile).mockResolvedValue(incompleteProfile());
    vi.mocked(fetchHandymanCategories).mockResolvedValue(CATEGORIES);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Finish your profile to start receiving jobs/i)).toBeDefined();
    });
    expect(screen.getByText(/Your jobs feed is locked/i)).toBeDefined();
  });

  it('keeps the save button disabled until at least one category and a valid radius are provided', async () => {
    vi.mocked(fetchHandymanProfile).mockResolvedValue(incompleteProfile());
    vi.mocked(fetchHandymanCategories).mockResolvedValue(CATEGORIES);

    renderPage();

    const saveButton = (await screen.findByRole('button', {
      name: /save profile/i,
    })) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);

    // Select one category — still disabled because radius is empty
    fireEvent.click(screen.getByRole('button', { name: 'Plumbing' }));
    expect(saveButton.disabled).toBe(true);

    // Provide a valid radius — now enabled
    const radiusInput = screen.getByLabelText(/Service radius/i) as HTMLInputElement;
    fireEvent.change(radiusInput, { target: { value: '10' } });
    expect(saveButton.disabled).toBe(false);

    // Deselect the only category — disabled again
    fireEvent.click(screen.getByRole('button', { name: 'Plumbing' }));
    expect(saveButton.disabled).toBe(true);
  });

  it('surfaces an inline validation error when the radius is out of range', async () => {
    vi.mocked(fetchHandymanProfile).mockResolvedValue(incompleteProfile());
    vi.mocked(fetchHandymanCategories).mockResolvedValue(CATEGORIES);

    renderPage();

    const radiusInput = (await screen.findByLabelText(/Service radius/i)) as HTMLInputElement;

    fireEvent.change(radiusInput, { target: { value: '0' } });
    await waitFor(() => {
      expect(screen.getByText(/Minimum is 0\.5 km/i)).toBeDefined();
    });

    fireEvent.change(radiusInput, { target: { value: '300' } });
    await waitFor(() => {
      expect(screen.getByText(/Maximum is 200 km/i)).toBeDefined();
    });

    fireEvent.change(radiusInput, { target: { value: '1e2' } });
    await waitFor(() => {
      expect(screen.getByText(/scientific notation/i)).toBeDefined();
    });
  });

  it('loads selectable categories from the API and shows them as toggles', async () => {
    vi.mocked(fetchHandymanProfile).mockResolvedValue(incompleteProfile());
    vi.mocked(fetchHandymanCategories).mockResolvedValue(CATEGORIES);

    renderPage();

    const plumbing = await screen.findByRole('button', { name: 'Plumbing' });
    expect(plumbing.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('button', { name: 'Electrical' })).toBeDefined();
    expect(fetchHandymanCategories).toHaveBeenCalled();
  });

  it('successful save transitions UI out of the blocked setup state', async () => {
    vi.mocked(fetchHandymanProfile).mockResolvedValue(incompleteProfile());
    vi.mocked(fetchHandymanCategories).mockResolvedValue(CATEGORIES);
    vi.mocked(updateHandymanProfile).mockResolvedValue(completeProfile());

    renderPage();

    const saveButton = (await screen.findByRole('button', {
      name: /save profile/i,
    })) as HTMLButtonElement;

    fireEvent.click(screen.getByRole('button', { name: 'Plumbing' }));
    fireEvent.change(screen.getByLabelText(/Service radius/i), { target: { value: '12' } });

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(updateHandymanProfile).toHaveBeenCalledWith({
        serviceRadiusKm: 12,
        categoryIds: ['cat-1'],
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/You're set up to receive jobs/i)).toBeDefined();
    });
    expect(screen.queryByText(/Your jobs feed is locked/i)).toBeNull();
  });
});
