interface CategoryChipProps {
  categoryId: string;
  name: string;
  selected: boolean;
  onToggle: (categoryId: string) => void;
  disabled?: boolean;
}

export function CategoryChip({ categoryId, name, selected, onToggle, disabled }: CategoryChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onToggle(categoryId)}
      className={`category-chip${selected ? ' category-chip--selected' : ''}`}
      style={{ minHeight: 44, minWidth: 44 }}
    >
      {name}
    </button>
  );
}
