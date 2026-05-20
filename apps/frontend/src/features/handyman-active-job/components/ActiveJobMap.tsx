import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { OSM_STYLE } from '../../../shared/config/mapConfig';

interface ActiveJobMapProps {
  jobLat: number | null;
  jobLng: number | null;
}

export function ActiveJobMap({ jobLat, jobLng }: ActiveJobMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    const hasJob = jobLat != null && jobLng != null;
    const center: [number, number] = hasJob ? [jobLng as number, jobLat as number] : [0, 0];
    const zoom = hasJob ? 14 : 2;

    const map = new maplibregl.Map({
      container: containerRef.current!,
      style: OSM_STYLE,
      center,
      zoom,
    });
    mapRef.current = map;

    if (hasJob) {
      const el = document.createElement('div');
      el.className = 'map-pin';
      el.style.animation = 'fadeInScale 300ms ease forwards';
      const marker = new maplibregl.Marker({ element: el });
      marker.setLngLat([jobLng as number, jobLat as number]).addTo(map);
      markerRef.current = marker;
    }

    return () => {
      markerRef.current?.remove();
      mapRef.current?.remove();
      markerRef.current = null;
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || jobLat == null || jobLng == null) return;
    if (markerRef.current) {
      markerRef.current.setLngLat([jobLng, jobLat]);
    } else {
      const el = document.createElement('div');
      el.className = 'map-pin';
      el.style.animation = 'fadeInScale 300ms ease forwards';
      const marker = new maplibregl.Marker({ element: el });
      marker.setLngLat([jobLng, jobLat]).addTo(mapRef.current);
      markerRef.current = marker;
    }
    mapRef.current.flyTo({ center: [jobLng, jobLat], zoom: 14 });
  }, [jobLat, jobLng]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      aria-label="Active job location map"
    />
  );
}
