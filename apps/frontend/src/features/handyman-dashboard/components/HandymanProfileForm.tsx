import { useState } from 'react';
import {
  HANDYMAN_SERVICE_RADIUS_BOUNDS,
  type HandymanProfileSetupResponse,
  type ServiceCategory,
  type UpdateHandymanProfileRequest,
} from '@handrix/contracts';
import { CategoryChip } from './CategoryChip';
import { ServiceRadiusInput } from './ServiceRadiusInput';

interface HandymanProfileFormProps {
  profile: HandymanProfileSetupResponse;
  categories: ServiceCategory[];
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: (payload: UpdateHandymanProfileRequest) => void;
}

type RadiusParse =
  | { kind: 'empty' }
  | { kind: 'invalid'; reason: string }
  | { kind: 'ok'; value: number };

function parseRadius(input: string): RadiusParse {
  const trimmed = input.trim();
  if (trimmed === '') return { kind: 'empty' };
  // Block scientific notation so the displayed value matches the submitted value.
  if (/[eE]/.test(trimmed)) {
    return { kind: 'invalid', reason: 'Enter a plain number (no scientific notation).' };
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return { kind: 'invalid', reason: 'Enter a valid number.' };
  }
  if (parsed < HANDYMAN_SERVICE_RADIUS_BOUNDS.min) {
    return {
      kind: 'invalid',
      reason: `Minimum is ${HANDYMAN_SERVICE_RADIUS_BOUNDS.min} km.`,
    };
  }
  if (parsed > HANDYMAN_SERVICE_RADIUS_BOUNDS.max) {
    return {
      kind: 'invalid',
      reason: `Maximum is ${HANDYMAN_SERVICE_RADIUS_BOUNDS.max} km.`,
    };
  }
  return { kind: 'ok', value: parsed };
}

export function HandymanProfileForm({
  profile,
  categories,
  isSubmitting,
  submitError,
  onSubmit,
}: HandymanProfileFormProps) {
  // Seed once on mount only; do not re-seed on every profile reference change, otherwise
  // a background refetch or sibling mutation would wipe the user's in-progress edits.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(profile.categories.map((c) => c.categoryId)),
  );
  const [radiusInput, setRadiusInput] = useState<string>(
    () => (profile.serviceRadiusKm == null ? '' : String(profile.serviceRadiusKm)),
  );

  const radiusParse = parseRadius(radiusInput);
  const radiusError = radiusParse.kind === 'invalid' ? radiusParse.reason : null;
  const canSubmit = selectedIds.size > 0 && radiusParse.kind === 'ok' && !isSubmitting;

  function toggleCategory(categoryId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || radiusParse.kind !== 'ok') return;
    onSubmit({
      serviceRadiusKm: radiusParse.value,
      categoryIds: Array.from(selectedIds),
    });
  }

  return (
    <form className="handyman-profile-form" onSubmit={handleSubmit} noValidate>
      <fieldset disabled={isSubmitting}>
        <legend>Supported categories</legend>
        <div className="category-chip-group" role="group" aria-label="Supported categories">
          {categories.map((category) => (
            <CategoryChip
              key={category.id}
              categoryId={category.id}
              name={category.name}
              selected={selectedIds.has(category.id)}
              onToggle={toggleCategory}
              disabled={isSubmitting}
            />
          ))}
        </div>
      </fieldset>

      <ServiceRadiusInput
        value={radiusInput}
        onChange={setRadiusInput}
        disabled={isSubmitting}
        error={radiusError}
      />

      {submitError && (
        <div role="alert" className="error-banner">
          {submitError}
        </div>
      )}

      <button
        type="submit"
        className="btn-primary"
        disabled={!canSubmit}
        aria-disabled={!canSubmit}
        style={{ minHeight: 44 }}
      >
        {isSubmitting ? 'Saving…' : profile.isProfileComplete ? 'Save changes' : 'Save profile'}
      </button>
    </form>
  );
}
