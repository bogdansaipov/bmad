import { useHandymanAvailability } from '../hooks/useHandymanAvailability';

interface AvailabilityToggleProps {
  currentStatus: string;
}

export function AvailabilityToggle({ currentStatus }: AvailabilityToggleProps) {
  const isOnline = currentStatus === 'online';
  const mutation = useHandymanAvailability();

  function handleClick() {
    mutation.mutate(isOnline ? 'offline' : 'online');
  }

  return (
    <button
      className={`availability-toggle availability-toggle--${isOnline ? 'online' : 'offline'}`}
      aria-pressed={isOnline}
      onClick={handleClick}
      disabled={mutation.isPending}
      style={{ minHeight: 44 }}
    >
      {isOnline ? 'Online' : 'Offline'}
    </button>
  );
}
