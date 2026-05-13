import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StepLocationCapture } from './StepLocationCapture';

vi.mock('maplibre-gl', () => ({
  default: {
    Map: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      remove: vi.fn(),
      flyTo: vi.fn(),
      getCanvas: vi.fn().mockReturnValue({ style: {} }),
    })),
    Marker: vi.fn().mockImplementation(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
      getLngLat: vi.fn().mockReturnValue({ lat: 41.0, lng: 69.0 }),
      remove: vi.fn(),
    })),
  },
}));

const mockOnLocationConfirmed = vi.fn();
const mockOnBack = vi.fn();

function renderStep(overrides?: { locationLat?: number; locationLng?: number }) {
  render(
    <StepLocationCapture
      locationLat={overrides?.locationLat}
      locationLng={overrides?.locationLng}
      onLocationConfirmed={mockOnLocationConfirmed}
      onBack={mockOnBack}
    />,
  );
}

describe('StepLocationCapture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up geolocation mock
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: undefined,
      configurable: true,
    });
  });

  it('renders heading "Confirm your location"', () => {
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: { getCurrentPosition: vi.fn() },
      configurable: true,
    });
    renderStep();
    expect(screen.getByText('Confirm your location')).toBeDefined();
  });

  it('"Confirm Location" button is disabled when no pin placed', () => {
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: { getCurrentPosition: vi.fn() },
      configurable: true,
    });
    renderStep();
    const confirmBtn = screen.getByRole('button', { name: /confirm location/i });
    expect(confirmBtn.hasAttribute('disabled')).toBe(true);
  });

  it('geolocation unavailable — shows guidance text and Confirm button remains disabled', () => {
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: undefined,
      configurable: true,
    });
    renderStep();
    expect(screen.getByText('Location unavailable. Place the pin manually.')).toBeDefined();
    const confirmBtn = screen.getByRole('button', { name: /confirm location/i });
    expect(confirmBtn.hasAttribute('disabled')).toBe(true);
  });

  it('geolocation success — Confirm button becomes enabled', async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn((successCb: PositionCallback) => {
        successCb({
          coords: { latitude: 41.2995, longitude: 69.2401 },
        } as GeolocationPosition);
      }),
    };
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true,
    });

    await act(async () => {
      renderStep();
    });

    const confirmBtn = screen.getByRole('button', { name: /confirm location/i });
    expect(confirmBtn.hasAttribute('disabled')).toBe(false);
  });

  it('"Back" button calls onBack prop', () => {
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: { getCurrentPosition: vi.fn() },
      configurable: true,
    });
    renderStep();
    fireEvent.click(screen.getByRole('button', { name: /^back$/i }));
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });
});
