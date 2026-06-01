import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { OSM_STYLE, createJobPinElement, createHandymanPinElement } from '../../shared/config/mapConfig';

interface ActiveJobMapProps {
  jobLat: number | null;
  jobLng: number | null;
  handymanLat: number | null;
  handymanLng: number | null;
}

export function ActiveJobMap({ jobLat, jobLng, handymanLat, handymanLng }: ActiveJobMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const jobMarkerRef = useRef<maplibregl.Marker | null>(null);
  const handymanMarkerRef = useRef<maplibregl.Marker | null>(null);

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

    map.on('load', () => {
      if (hasJob) {
        const marker = new maplibregl.Marker({ element: createJobPinElement() });
        marker.setLngLat([jobLng as number, jobLat as number]).addTo(map);
        jobMarkerRef.current = marker;
      }
    });

    return () => {
      jobMarkerRef.current?.remove();
      handymanMarkerRef.current?.remove();
      mapRef.current?.remove();
      jobMarkerRef.current = null;
      handymanMarkerRef.current = null;
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handyman's own location pin — updates as geolocation fires, fits bounds with job pin
  useEffect(() => {
    if (!mapRef.current || handymanLat == null || handymanLng == null) return;

    if (handymanMarkerRef.current) {
      handymanMarkerRef.current.setLngLat([handymanLng, handymanLat]);
    } else {
      const marker = new maplibregl.Marker({ element: createHandymanPinElement() });
      marker.setLngLat([handymanLng, handymanLat]).addTo(mapRef.current);
      handymanMarkerRef.current = marker;
    }

    if (jobLat != null && jobLng != null) {
      const minLng = Math.min(jobLng, handymanLng);
      const maxLng = Math.max(jobLng, handymanLng);
      const minLat = Math.min(jobLat, handymanLat);
      const maxLat = Math.max(jobLat, handymanLat);
      if (minLng === maxLng && minLat === maxLat) {
        mapRef.current.flyTo({ center: [handymanLng, handymanLat], zoom: 15 });
      } else {
        mapRef.current.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 80 });
      }
    } else {
      mapRef.current.flyTo({ center: [handymanLng, handymanLat], zoom: 14 });
    }
  }, [handymanLat, handymanLng, jobLat, jobLng]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0 }}
      role="application"
      aria-label="Active job location map"
    />
  );
}
