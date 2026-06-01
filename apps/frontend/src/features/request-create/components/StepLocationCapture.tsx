import { useEffect, useState } from 'react';
import { MapLocationPicker } from './MapLocationPicker';

interface StepLocationCaptureProps {
  locationLat?: number;
  locationLng?: number;
  onLocationConfirmed: (lat: number, lng: number) => void;
  onBack: () => void;
}

export function StepLocationCapture({
  locationLat,
  locationLng,
  onLocationConfirmed,
  onBack,
}: StepLocationCaptureProps) {
  const [pendingLat, setPendingLat] = useState<number | undefined>(locationLat);
  const [pendingLng, setPendingLng] = useState<number | undefined>(locationLng);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!navigator.geolocation) {
      setGeoError('Location unavailable. Place the pin manually.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!mounted) return;
        setPendingLat(pos.coords.latitude);
        setPendingLng(pos.coords.longitude);
        setIsLocating(false);
      },
      () => {
        if (!mounted) return;
        setGeoError('Location unavailable. Place the pin manually.');
        setIsLocating(false);
      },
      { timeout: 8000, maximumAge: 60_000 },
    );
    return () => { mounted = false; };
  }, []);

  const canConfirm = pendingLat !== undefined && pendingLng !== undefined;

  return (
    <div className="create-step">
      <h2>Confirm your location</h2>

      <MapLocationPicker
        initialLat={pendingLat}
        initialLng={pendingLng}
        onLocationChange={(lat, lng) => {
          setPendingLat(lat);
          setPendingLng(lng);
        }}
      />

      {isLocating && (
        <p className="create-step__hint" role="status">Detecting your location…</p>
      )}

      {geoError && !isLocating && (
        <p className="create-step__hint" role="status">{geoError}</p>
      )}

      <div className="create-step__actions">
        <button type="button" onClick={onBack} className="btn-outline">
          Back
        </button>
        <button
          type="button"
          onClick={() => canConfirm && onLocationConfirmed(pendingLat!, pendingLng!)}
          disabled={!canConfirm}
          className="btn-primary"
        >
          Confirm Location
        </button>
      </div>

      {canConfirm && (
        <p className="create-step__hint">
          Lat: {pendingLat!.toFixed(3)}, Lng: {pendingLng!.toFixed(3)}
        </p>
      )}
    </div>
  );
}
