import { useCategories } from '../hooks/useCategories';
import { CategoryTile } from './CategoryTile';

interface StepCategorySelectProps {
  selectedCategoryId: string | null;
  onSelect: (id: string, name: string) => void;
  onNext: () => void;
}

function SkeletonGrid() {
  return (
    <div className="category-skeleton" aria-busy="true" aria-label="Loading categories">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="category-skeleton__tile" />
      ))}
    </div>
  );
}

export function StepCategorySelect({ selectedCategoryId, onSelect, onNext }: StepCategorySelectProps) {
  const { data, isLoading, isError, refetch } = useCategories();

  return (
    <div className="create-step">
      <h2 id="category-heading">What kind of help do you need?</h2>

      {isLoading && <SkeletonGrid />}

      {isError && (
        <div className="server-error" role="alert">
          Failed to load categories.{' '}
          <button
            type="button"
            onClick={() => void refetch()}
            style={{ background: 'none', border: 'none', textDecoration: 'underline', color: 'inherit', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 600 }}
          >
            Try again
          </button>
        </div>
      )}

      {data && data.items.length > 0 && (
        <fieldset aria-labelledby="category-heading">
          <legend className="sr-only">Select a service category</legend>
          <div className="category-grid">
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
        <p role="status">No service categories are currently available. Please try again later.</p>
      )}

      <button
        className="btn-primary"
        disabled={!selectedCategoryId}
        onClick={onNext}
      >
        Next
      </button>
    </div>
  );
}
