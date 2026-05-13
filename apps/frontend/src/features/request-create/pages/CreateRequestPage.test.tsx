import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateRequestPage } from './CreateRequestPage';

vi.mock('../hooks/useCategories');
vi.mock('../api/uploads.api');
vi.mock('maplibre-gl', () => ({
  default: {
    Map: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      remove: vi.fn(),
      flyTo: vi.fn(),
      getCanvas: vi.fn().mockReturnValue({ style: {} }),
    })),
    Marker: vi.fn().mockImplementation(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
      getLngLat: vi.fn().mockReturnValue({ lat: 41.0, lng: 69.0 }),
      remove: vi.fn(),
    })),
  },
}));

import { useCategories } from '../hooks/useCategories';
import { uploadRequestImage } from '../api/uploads.api';

function wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

const mockCategories = {
  items: [
    { id: 'cat-1', name: 'Plumbing', description: null },
    { id: 'cat-2', name: 'Electrical', description: null },
  ],
};

describe('CreateRequestPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: geolocation available but never resolves (pending state)
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: { getCurrentPosition: vi.fn() },
      configurable: true,
    });

    vi.mocked(useCategories).mockReturnValue({
      data: mockCategories,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCategories>);

    vi.mocked(uploadRequestImage).mockResolvedValue({ imageId: 'img-123' });
  });

  it('renders step 1 (category select) initially', () => {
    render(<CreateRequestPage />, { wrapper });

    expect(screen.getByText('What kind of help do you need?')).toBeDefined();
    expect(screen.getByText('Plumbing')).toBeDefined();
  });

  it('advances to step 2 after category selected and Next clicked', () => {
    render(<CreateRequestPage />, { wrapper });

    // Select a category by clicking its radio label
    const plumbingLabel = screen.getByText('Plumbing').closest('label') as HTMLLabelElement;
    fireEvent.click(plumbingLabel);

    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    expect(screen.getByText('Describe your request')).toBeDefined();
  });

  it('cannot advance step 2 without a title (validation fires)', () => {
    render(<CreateRequestPage />, { wrapper });

    // Advance to step 2
    const plumbingLabel = screen.getByText('Plumbing').closest('label') as HTMLLabelElement;
    fireEvent.click(plumbingLabel);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    // Try to go to next without title
    const nextButtons = screen.getAllByRole('button', { name: /next/i });
    fireEvent.click(nextButtons[0]);

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText(/title is required/i)).toBeDefined();
  });

  it('progress indicator shows step 1 of 4 initially', () => {
    render(<CreateRequestPage />, { wrapper });

    expect(screen.getByText('Step 1 of 4')).toBeDefined();
    expect(screen.getByLabelText('Step 1 of 4')).toBeDefined();
  });

  it('progress indicator shows step 2 of 4 on details step', () => {
    render(<CreateRequestPage />, { wrapper });

    const plumbingLabel = screen.getByText('Plumbing').closest('label') as HTMLLabelElement;
    fireEvent.click(plumbingLabel);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByText('Step 2 of 4')).toBeDefined();
    expect(screen.getByLabelText('Step 2 of 4')).toBeDefined();
  });

  it('advances to step 3 (location) after filling title on step 2 and clicking Next', () => {
    render(<CreateRequestPage />, { wrapper });

    // Advance to step 2
    const plumbingLabel = screen.getByText('Plumbing').closest('label') as HTMLLabelElement;
    fireEvent.click(plumbingLabel);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    // Fill in the title field
    const titleInput = screen.getByRole('textbox', { name: /title/i });
    fireEvent.change(titleInput, { target: { value: 'Fix my sink' } });

    // Click Next on step 2
    const nextButtons = screen.getAllByRole('button', { name: /next/i });
    fireEvent.click(nextButtons[0]);

    expect(screen.getByText('Confirm your location')).toBeDefined();
  });

  it('Back button on step 2 returns to step 1', () => {
    render(<CreateRequestPage />, { wrapper });

    // Advance to step 2
    const plumbingLabel = screen.getByText('Plumbing').closest('label') as HTMLLabelElement;
    fireEvent.click(plumbingLabel);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByText('Describe your request')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByText('What kind of help do you need?')).toBeDefined();
  });
});
