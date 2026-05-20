import { useState, type ReactNode } from 'react';

export type BottomSheetState = 'collapsed' | 'half' | 'full';

interface BottomSheetProps {
  children: ReactNode;
  defaultState?: BottomSheetState;
  state?: BottomSheetState;
  onStateChange?: (state: BottomSheetState) => void;
  className?: string;
  'aria-label'?: string;
}

function nextState(current: BottomSheetState): BottomSheetState {
  if (current === 'collapsed') return 'half';
  if (current === 'half') return 'full';
  return 'collapsed';
}

export function BottomSheet({
  children,
  defaultState = 'half',
  state: controlledState,
  onStateChange,
  className,
  'aria-label': ariaLabel = 'Toggle details panel',
}: BottomSheetProps) {
  const [uncontrolledState, setUncontrolledState] = useState<BottomSheetState>(defaultState);
  const isControlled = controlledState !== undefined;
  const state = isControlled ? controlledState : uncontrolledState;

  const handleToggle = () => {
    const next = nextState(state);
    if (!isControlled) setUncontrolledState(next);
    onStateChange?.(next);
  };

  const rootClass = `bottom-sheet bottom-sheet--${state}${className ? ` ${className}` : ''}`;

  return (
    <div className={rootClass} role="complementary">
      <button
        type="button"
        className="bottom-sheet__handle"
        onClick={handleToggle}
        aria-expanded={state !== 'collapsed'}
        aria-label={ariaLabel}
      />
      <div className="bottom-sheet__content">{children}</div>
    </div>
  );
}
