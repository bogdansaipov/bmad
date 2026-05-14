import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { StepEstimateAndSubmit } from './StepEstimateAndSubmit';

vi.mock('../hooks/usePricingEstimate');
vi.mock('../api/requests.api');

import { usePricingEstimate } from '../hooks/usePricingEstimate';
import { submitCreateRequest } from '../api/requests.api';

const formState = {
  categoryId: '3b5144da-c652-4c14-8a16-aa5bc4bc2f36',
  categoryName: 'Plumbing',
  title: 'Fix my sink',
  description: 'Cold tap keeps dripping',
  imageId: '7daf85f2-cfa0-464d-a300-8e19df2d2014',
  imagePreviewUrl: null,
  locationLat: 41.2995,
  locationLng: 69.2401,
};

describe('StepEstimateAndSubmit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the review heading', () => {
    vi.mocked(usePricingEstimate).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof usePricingEstimate>);

    render(<StepEstimateAndSubmit formState={formState} onBack={vi.fn()} onSuccess={vi.fn()} />);

    expect(screen.getByText('Review your request')).toBeDefined();
  });

  it('shows a loading state while estimate data is loading', () => {
    vi.mocked(usePricingEstimate).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof usePricingEstimate>);

    render(<StepEstimateAndSubmit formState={formState} onBack={vi.fn()} onSuccess={vi.fn()} />);

    expect(screen.getByText('Loading estimate…')).toBeDefined();
  });

  it('displays the pricing breakdown and disclaimer when data is loaded', () => {
    vi.mocked(usePricingEstimate).mockReturnValue({
      data: {
        categoryId: formState.categoryId,
        baseFee: 30,
        categoryFee: 20,
        partsAllowance: 15,
        estimatedTotal: 65,
        disclaimer: 'This is an estimate.',
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePricingEstimate>);

    render(<StepEstimateAndSubmit formState={formState} onBack={vi.fn()} onSuccess={vi.fn()} />);

    expect(screen.getByText('Base service fee')).toBeDefined();
    expect(screen.getByText('$30.00')).toBeDefined();
    expect(screen.getByText('$20.00')).toBeDefined();
    expect(screen.getByText('$15.00')).toBeDefined();
    expect(screen.getByText('$65.00')).toBeDefined();
    expect(screen.getByText('This is an estimate.')).toBeDefined();
  });

  it('keeps the submit button disabled while loading', () => {
    vi.mocked(usePricingEstimate).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof usePricingEstimate>);

    render(<StepEstimateAndSubmit formState={formState} onBack={vi.fn()} onSuccess={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Confirm & Submit Request' }).hasAttribute('disabled')).toBe(true);
  });

  it('submits the request and calls onSuccess', async () => {
    vi.mocked(usePricingEstimate).mockReturnValue({
      data: {
        categoryId: formState.categoryId,
        baseFee: 30,
        categoryFee: 20,
        partsAllowance: 15,
        estimatedTotal: 65,
        disclaimer: 'This is an estimate.',
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePricingEstimate>);
    vi.mocked(submitCreateRequest).mockResolvedValue({
      id: 'req-1',
      status: 'PENDING',
      estimatedTotal: 65,
      categoryName: 'Plumbing',
      createdAt: '2026-05-14T10:00:00.000Z',
    });

    const onSuccess = vi.fn();
    render(<StepEstimateAndSubmit formState={formState} onBack={vi.fn()} onSuccess={onSuccess} />);

    fireEvent.click(screen.getByRole('button', { name: 'Confirm & Submit Request' }));

    await waitFor(() => {
      expect(submitCreateRequest).toHaveBeenCalledWith({
        categoryId: formState.categoryId,
        title: formState.title,
        description: formState.description,
        imageId: formState.imageId,
        locationLat: formState.locationLat,
        locationLng: formState.locationLng,
      });
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('disables the submit button while submitting', async () => {
    vi.mocked(usePricingEstimate).mockReturnValue({
      data: {
        categoryId: formState.categoryId,
        baseFee: 30,
        categoryFee: 20,
        partsAllowance: 15,
        estimatedTotal: 65,
        disclaimer: 'This is an estimate.',
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePricingEstimate>);

    let resolveSubmit: (() => void) | null = null;
    vi.mocked(submitCreateRequest).mockImplementation(() => new Promise((resolve) => {
      resolveSubmit = () => resolve({
        id: 'req-1',
        status: 'PENDING',
        estimatedTotal: 65,
        categoryName: 'Plumbing',
        createdAt: '2026-05-14T10:00:00.000Z',
      });
    }));

    render(<StepEstimateAndSubmit formState={formState} onBack={vi.fn()} onSuccess={vi.fn()} />);

    const button = screen.getByRole('button', { name: 'Confirm & Submit Request' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Submitting…' }).hasAttribute('disabled')).toBe(true);
    });

    resolveSubmit?.();
  });

  it('shows an error banner and re-enables submit when submission fails', async () => {
    vi.mocked(usePricingEstimate).mockReturnValue({
      data: {
        categoryId: formState.categoryId,
        baseFee: 30,
        categoryFee: 20,
        partsAllowance: 15,
        estimatedTotal: 65,
        disclaimer: 'This is an estimate.',
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePricingEstimate>);
    vi.mocked(submitCreateRequest).mockRejectedValue(new Error('Failed'));

    render(<StepEstimateAndSubmit formState={formState} onBack={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Confirm & Submit Request' }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'Something went wrong. Your request was not submitted. Please try again.',
      );
      expect(screen.getByRole('button', { name: 'Confirm & Submit Request' }).hasAttribute('disabled')).toBe(false);
    });
  });

  it('calls onBack when the Back button is clicked', () => {
    vi.mocked(usePricingEstimate).mockReturnValue({
      data: {
        categoryId: formState.categoryId,
        baseFee: 30,
        categoryFee: 20,
        partsAllowance: 15,
        estimatedTotal: 65,
        disclaimer: 'This is an estimate.',
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePricingEstimate>);

    const onBack = vi.fn();
    render(<StepEstimateAndSubmit formState={formState} onBack={onBack} onSuccess={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(onBack).toHaveBeenCalled();
  });

  it('shows the estimate error state and hides the submit button', () => {
    vi.mocked(usePricingEstimate).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof usePricingEstimate>);

    render(<StepEstimateAndSubmit formState={formState} onBack={vi.fn()} onSuccess={vi.fn()} />);

    expect(screen.getByRole('alert').textContent).toContain(
      'Unable to load estimate. Please go back and try again.',
    );
    expect(screen.queryByRole('button', { name: 'Confirm & Submit Request' })).toBeNull();
  });
});
