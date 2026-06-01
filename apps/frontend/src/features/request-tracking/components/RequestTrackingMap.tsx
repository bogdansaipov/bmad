import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { OSM_STYLE, createJobPinElement, createHandymanPinElement } from '../../shared/config/mapConfig';

interface RequestTrackingMapProps {
  jobLat: number | null;
  jobLng: number | null;
  handymanLat: number | null;
  handymanLng: number | null;
}

export function RequestTrackingMap({ jobLat, jobLng, handymanLat, handymanLng }: RequestTrackingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const jobMarkerRef = useRef<maplibregl.Marker | null>(null);
  const handymanMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Map + job pin initialised once on mount
  useEffect(() => {
    const hasJob = jobLat != null && jobLng != null;

    const center: [number, number] = hasJob ? [jobLng as number, jobLat as number] : [0, 0];
    const zoom = hasJob ? 13 : 2;

    const map = new maplibregl.Map({
      container: containerRef.current!,
      style: OSM_STYLE,
      center,
      zoom,
    });
    mapRef.current = map;

    map.on('load', () => {
      if (hasJob) {
        const jobMarker = new maplibregl.Marker({ element: createJobPinElement() });
        jobMarker.setLngLat([jobLng as number, jobLat as number]).addTo(map);
        jobMarkerRef.current = jobMarker;
      }
    });

    return () => {
      jobMarkerRef.current?.remove();
      handymanMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      jobMarkerRef.current = null;
      handymanMarkerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handyman pin: create on first location, update on each poll; re-fit bounds when both pins known
  useEffect(() => {
    if (!mapRef.current || handymanLat == null || handymanLng == null) return;

    if (handymanMarkerRef.current) {
      handymanMarkerRef.current.setLngLat([handymanLng, handymanLat]);
    } else {
      const handymanMarker = new maplibregl.Marker({ element: createHandymanPinElement() });
      handymanMarker.setLngLat([handymanLng, handymanLat]).addTo(mapRef.current);
      handymanMarkerRef.current = handymanMarker;
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
    }
  }, [handymanLat, handymanLng, jobLat, jobLng]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0 }}
      role="application"
      aria-label="Request tracking map"
    />
  );
}
