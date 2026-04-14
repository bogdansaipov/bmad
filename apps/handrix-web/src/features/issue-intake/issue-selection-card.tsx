import type { IssueType } from '@handrix/shared-contracts'

type IssueSelectionCardProps = {
  issueType: IssueType
  isSelected: boolean
  onSelect: (issueTypeId: IssueType['id']) => void
}

export function IssueSelectionCard({
  issueType,
  isSelected,
  onSelect,
}: IssueSelectionCardProps) {
  return (
    <button
      type="button"
      className={`issue-card${isSelected ? ' issue-card--selected' : ''}`}
      aria-pressed={isSelected}
      onClick={() => onSelect(issueType.id)}
    >
      <span className="issue-card__cue">{issueType.urgencyCue}</span>
      <span className="issue-card__label">{issueType.label}</span>
      <span className="issue-card__description">{issueType.shortDescription}</span>
      <span className="issue-card__state">{isSelected ? 'Selected' : 'Tap to choose'}</span>
    </button>
  )
}
