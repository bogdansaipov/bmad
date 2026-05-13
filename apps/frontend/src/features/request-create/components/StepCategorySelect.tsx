import { useCategories } from '../hooks/useCategories';
import { CategoryTile } from './CategoryTile';

interface StepCategorySelectProps {
  selectedCategoryId: string | null;
  onSelect: (id: string, name: string) => void;
  onNext: () => void;
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3" aria-busy="true" aria-label="Loading categories">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="min-h-[80px] rounded-xl border-2 border-stone-200 bg-stone-100 animate-pulse"
        />
      ))}
    </div>
  );
}

export function StepCategorySelect({ selectedCategoryId, onSelect, onNext }: StepCategorySelectProps) {
  const { data, isLoading, isError, refetch } = useCategories();

  return (
    <div className="flex flex-col gap-6">
      <h2 id="category-heading" className="text-xl font-semibold text-[#1A1A2E]">
        What kind of help do you need?
      </h2>

      {isLoading && <SkeletonGrid />}

      {isError && (
        <div className="text-red-600 text-sm" role="alert">
          Failed to load categories.{' '}
          <button
            className="underline font-medium"
            onClick={() => void refetch()}
          >
            Try again
          </button>
        </div>
      )}

      {data && data.items.length > 0 && (
        <fieldset aria-labelledby="category-heading" className="border-none p-0 m-0">
          <legend className="sr-only">Select a service category</legend>
          <div className="grid grid-cols-2 gap-3">
            {data.items.map((category) => (
              <CategoryTile
                key={category.id}
                category={category}
                isSelected={selectedCategoryId === category.id}
                onSelect={() => onSelect(category.id, category.name)}
              />
            ))}
          </div>
        </fieldset>
      )}

      {data && data.items.length === 0 && (
        <p className="text-sm text-stone-600" role="status">
          No service categories are currently available. Please try again later.
        </p>
      )}

      <button
        className="w-full min-h-[44px] bg-blue-700 text-white font-semibold rounded-xl py-3 disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={!selectedCategoryId}
        onClick={onNext}
      >
        Next
      </button>
    </div>
  );
}
