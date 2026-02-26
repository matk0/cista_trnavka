'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { Map as MapboxMap, MapMouseEvent, Marker } from 'mapbox-gl';
import mapboxgl from 'mapbox-gl';

interface MeetingPointPickerProps {
  map: MapboxMap | null;
  initialPoint?: GeoJSON.Point | null;
  onComplete: (point: GeoJSON.Point) => void;
  onCancel: () => void;
}

export default function MeetingPointPicker({
  map,
  initialPoint,
  onComplete,
  onCancel,
}: MeetingPointPickerProps) {
  const [point, setPoint] = useState<[number, number] | null>(
    initialPoint ? (initialPoint.coordinates as [number, number]) : null
  );
  const markerRef = useRef<Marker | null>(null);

  // Create or update marker
  useEffect(() => {
    if (!map) return;

    if (point) {
      if (markerRef.current) {
        markerRef.current.setLngLat(point);
      } else {
        // Create custom marker element
        const el = document.createElement('div');
        el.className = 'meeting-point-marker';
        el.innerHTML = `
          <div style="
            width: 32px;
            height: 32px;
            background: #f59e0b;
            border: 3px solid white;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg style="transform: rotate(45deg); width: 16px; height: 16px;" fill="white" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
        `;

        markerRef.current = new mapboxgl.Marker({
          element: el,
          anchor: 'bottom',
          draggable: true,
        })
          .setLngLat(point)
          .addTo(map);

        // Handle drag end
        markerRef.current.on('dragend', () => {
          const lngLat = markerRef.current?.getLngLat();
          if (lngLat) {
            setPoint([lngLat.lng, lngLat.lat]);
          }
        });
      }
    }

    return () => {
      // Cleanup handled in main effect
    };
  }, [map, point]);

  // Cleanup marker on unmount
  useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, []);

  // Handle map click
  const handleClick = useCallback((e: MapMouseEvent) => {
    setPoint([e.lngLat.lng, e.lngLat.lat]);
  }, []);

  // Subscribe to map click
  useEffect(() => {
    if (!map) return;

    map.on('click', handleClick);
    map.getCanvas().style.cursor = 'crosshair';

    return () => {
      map.off('click', handleClick);
      map.getCanvas().style.cursor = '';
    };
  }, [map, handleClick]);

  const handleDone = () => {
    if (!point) return;

    onComplete({
      type: 'Point',
      coordinates: point,
    });
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-lg p-4">
      <div className="text-center mb-3">
        <p className="text-white font-medium">Určiť miesto stretnutia</p>
        <p className="text-gray-400 text-sm">
          {point
            ? 'Kliknite alebo presuňte značku na požadované miesto'
            : 'Kliknite na mapu pre umiestnenie značky'}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleDone}
          disabled={!point}
          className="flex-1 py-2 px-4 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-800 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors"
        >
          Potvrdiť
        </button>
        <button
          onClick={onCancel}
          className="py-2 px-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          Zrušiť
        </button>
      </div>
    </div>
  );
}
