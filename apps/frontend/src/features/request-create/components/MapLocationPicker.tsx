import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const OSM_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [{ id: 'osm', type: 'raster' as const, source: 'osm' }],
};

function clampCoords(lat: number, lng: number): [number, number] {
  return [
    Math.max(-90, Math.min(90, lat)),
    ((((lng + 180) % 360) + 360) % 360) - 180,
  ];
}

interface MapLocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationChange: (lat: number, lng: number) => void;
}

export function MapLocationPicker({ initialLat, initialLng, onLocationChange }: MapLocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const markerOnMapRef = useRef(false);
  const onLocationChangeRef = useRef(onLocationChange);
  onLocationChangeRef.current = onLocationChange;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current!,
      style: OSM_STYLE,
      center: [initialLng ?? 0, initialLat ?? 0],
      zoom: initialLat !== undefined ? 13 : 2,
    });
    mapRef.current = map;

    const marker = new maplibregl.Marker({ draggable: true });
    markerRef.current = marker;

    if (initialLat !== undefined && initialLng !== undefined) {
      marker.setLngLat([initialLng, initialLat]).addTo(map);
      markerOnMapRef.current = true;
    }

    map.on('click', (e) => {
      const [lat, lng] = clampCoords(e.lngLat.lat, e.lngLat.lng);
      marker.setLngLat([lng, lat]).addTo(map);
      markerOnMapRef.current = true;
      onLocationChangeRef.current(lat, lng);
    });

    marker.on('dragend', () => {
      const { lat, lng } = marker.getLngLat();
      const [clampedLat, clampedLng] = clampCoords(lat, lng);
      onLocationChangeRef.current(clampedLat, clampedLng);
    });

    return () => {
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      markerOnMapRef.current = false;
    };
  }, []);

  // Fly to geolocation result when coords first arrive after mount (geolocation resolves async)
  useEffect(() => {
    if (initialLat === undefined || initialLng === undefined) return;
    if (markerOnMapRef.current) return;
    const map = mapRef.current;
    if (!map) return;
    markerOnMapRef.current = true;
    map.flyTo({ center: [initialLng, initialLat], zoom: 13 });
    markerRef.current?.setLngLat([initialLng, initialLat]).addTo(map);
  }, [initialLat, initialLng]);

  return (
    <div
      ref={containerRef}
      className="w-full h-64 rounded-xl overflow-hidden"
      role="application"
      aria-label="Location selector map"
    />
  );
}
