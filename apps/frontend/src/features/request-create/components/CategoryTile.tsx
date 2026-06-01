import type { ServiceCategory } from '@handrix/contracts';

interface CategoryTileProps {
  category: ServiceCategory;
  isSelected: boolean;
  onSelect: () => void;
}

export function CategoryTile({ category, isSelected, onSelect }: CategoryTileProps) {
  return (
    <label className={`category-tile${isSelected ? ' category-tile--selected' : ''}`}>
      <input
        type="radio"
        name="service-category"
        value={category.id}
        checked={isSelected}
        onChange={onSelect}
        className="sr-only"
      />
      <span className="category-tile__name">{category.name}</span>
      {isSelected && <span className="category-tile__check" aria-hidden="true">✓</span>}
    </label>
  );
}
