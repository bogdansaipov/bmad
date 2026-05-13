import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StepCategorySelect } from './StepCategorySelect';

vi.mock('../hooks/useCategories');

import { useCategories } from '../hooks/useCategories';

describe('StepCategorySelect', () => {
  const onSelect = vi.fn();
  const onNext = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loading state renders skeleton tiles', () => {
    vi.mocked(useCategories).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as ReturnType<typeof useCategories>);

    const { container } = render(
      <StepCategorySelect selectedCategoryId={null} onSelect={onSelect} onNext={onNext} />,
    );

    const skeletonGrid = container.querySelector('[aria-busy="true"]');
    expect(skeletonGrid).not.toBeNull();
  });

  it('renders category tiles when data loads', () => {
    vi.mocked(useCategories).mockReturnValue({
      data: {
        items: [
          { id: 'cat-1', name: 'Plumbing', description: null },
          { id: 'cat-2', name: 'Electrical', description: null },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as ReturnType<typeof useCategories>);

    render(
      <StepCategorySelect selectedCategoryId={null} onSelect={onSelect} onNext={onNext} />,
    );

    expect(screen.getByText('Plumbing')).toBeDefined();
    expect(screen.getByText('Electrical')).toBeDefined();
  });

  it('"Next" button is disabled until a category is selected', () => {
    vi.mocked(useCategories).mockReturnValue({
      data: {
        items: [{ id: 'cat-1', name: 'Plumbing', description: null }],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as ReturnType<typeof useCategories>);

    render(
      <StepCategorySelect selectedCategoryId={null} onSelect={onSelect} onNext={onNext} />,
    );

    const nextButton = screen.getByRole('button', { name: /next/i });
    expect((nextButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('"Next" button is enabled after a category tile is clicked', () => {
    vi.mocked(useCategories).mockReturnValue({
      data: {
        items: [{ id: 'cat-1', name: 'Plumbing', description: null }],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as ReturnType<typeof useCategories>);

    render(
      <StepCategorySelect selectedCategoryId="cat-1" onSelect={onSelect} onNext={onNext} />,
    );

    const nextButton = screen.getByRole('button', { name: /next/i });
    expect((nextButton as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(nextButton);
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
