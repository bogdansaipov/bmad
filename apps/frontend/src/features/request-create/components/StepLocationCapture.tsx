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
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-[#1A1A2E]">Confirm your location</h2>

      <MapLocationPicker
        initialLat={pendingLat}
        initialLng={pendingLng}
        onLocationChange={(lat, lng) => {
          setPendingLat(lat);
          setPendingLng(lng);
        }}
      />

      {isLocating && (
        <p role="status" className="text-sm text-stone-500">
          Detecting your location…
        </p>
      )}

      {geoError && !isLocating && (
        <p role="status" className="text-sm text-stone-500">
          {geoError}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 min-h-[44px] rounded-xl border border-stone-300 text-[#1A1A2E] font-medium"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => canConfirm && onLocationConfirmed(pendingLat!, pendingLng!)}
          disabled={!canConfirm}
          className="flex-1 min-h-[44px] rounded-xl bg-blue-700 text-white font-medium disabled:opacity-50"
        >
          Confirm Location
        </button>
      </div>

      {canConfirm && (
        <p className="text-xs text-stone-500">
          Lat: {pendingLat!.toFixed(3)}, Lng: {pendingLng!.toFixed(3)}
        </p>
      )}
    </div>
  );
}
