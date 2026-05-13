import type { ServiceCategory } from '@handrix/contracts';

interface CategoryTileProps {
  category: ServiceCategory;
  isSelected: boolean;
  onSelect: () => void;
}

export function CategoryTile({ category, isSelected, onSelect }: CategoryTileProps) {
  return (
    <label
      className={[
        'flex items-center justify-center min-h-[80px] rounded-xl border-2 cursor-pointer',
        'bg-white shadow-sm p-4 text-center transition-colors',
        isSelected
          ? 'border-blue-700 bg-blue-50'
          : 'border-stone-200 hover:border-blue-300',
      ].join(' ')}
    >
      <input
        type="radio"
        name="service-category"
        value={category.id}
        checked={isSelected}
        onChange={onSelect}
        className="sr-only"
      />
      <span className="font-medium text-[#1A1A2E] text-sm leading-tight">
        {category.name}
      </span>
      {isSelected && (
        <span className="ml-2 text-blue-700" aria-hidden="true">✓</span>
      )}
    </label>
  );
}
