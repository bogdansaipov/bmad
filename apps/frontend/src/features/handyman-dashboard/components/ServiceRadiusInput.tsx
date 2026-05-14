import { HANDYMAN_SERVICE_RADIUS_BOUNDS } from '@handrix/contracts';

interface ServiceRadiusInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string | null;
}

export function ServiceRadiusInput({ value, onChange, disabled, error }: ServiceRadiusInputProps) {
  const inputId = 'handyman-service-radius';
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;
  return (
    <div className="profile-field">
      <label htmlFor={inputId} className="profile-field__label">
        Service radius (km)
      </label>
      <input
        id={inputId}
        name="serviceRadiusKm"
        type="number"
        inputMode="decimal"
        step={0.5}
        min={HANDYMAN_SERVICE_RADIUS_BOUNDS.min}
        max={HANDYMAN_SERVICE_RADIUS_BOUNDS.max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="profile-field__input"
        aria-describedby={error ? `${helpId} ${errorId}` : helpId}
        aria-invalid={error ? true : undefined}
      />
      <p id={helpId} className="profile-field__help">
        Between {HANDYMAN_SERVICE_RADIUS_BOUNDS.min} and {HANDYMAN_SERVICE_RADIUS_BOUNDS.max} km.
      </p>
      {error && (
        <p id={errorId} className="profile-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
