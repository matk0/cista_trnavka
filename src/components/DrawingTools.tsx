'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { Map as MapboxMap, GeoJSONSource, MapMouseEvent } from 'mapbox-gl';
import type { Geometry } from 'geojson';
import * as turf from '@turf/turf';

export type DrawMode = 'target' | 'cleanup' | 'event' | 'none';

interface DrawingToolsProps {
  map: MapboxMap | null;
  mode: DrawMode;
  onDrawComplete: (geometry: Geometry) => void;
  onDrawCancel: () => void;
}

const BUFFER_METERS = 10; // 10 meters on each side

export default function DrawingTools({
  map,
  mode,
  onDrawComplete,
  onDrawCancel,
}: DrawingToolsProps) {
  const [points, setPoints] = useState<[number, number][]>([]);
  const pointsRef = useRef<[number, number][]>([]);
  const sourceAddedRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  const color = mode === 'target' ? '#ff6464' : mode === 'event' ? '#f59e0b' : '#64ff96';

  // Initialize drawing layers
  useEffect(() => {
    if (!map || mode === 'none') return;

    // Add source for drawing
    if (!map.getSource('drawing')) {
      map.addSource('drawing', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });
      sourceAddedRef.current = true;
    }

    // Add polygon preview layer (buffered area)
    if (!map.getLayer('drawing-buffer')) {
      map.addLayer({
        id: 'drawing-buffer',
        type: 'fill',
        source: 'drawing',
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'fill-color': color,
          'fill-opacity': 0.3,
        },
      });
    }

    // Add buffer outline
    if (!map.getLayer('drawing-buffer-outline')) {
      map.addLayer({
        id: 'drawing-buffer-outline',
        type: 'line',
        source: 'drawing',
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'line-color': color,
          'line-width': 2,
          'line-opacity': 0.5,
        },
      });
    }

    // Add line layer
    if (!map.getLayer('drawing-line')) {
      map.addLayer({
        id: 'drawing-line',
        type: 'line',
        source: 'drawing',
        filter: ['==', '$type', 'LineString'],
        paint: {
          'line-color': color,
          'line-width': 3,
        },
      });
    }

    // Add points layer
    if (!map.getLayer('drawing-points')) {
      map.addLayer({
        id: 'drawing-points',
        type: 'circle',
        source: 'drawing',
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-radius': 5,
          'circle-color': '#fff',
          'circle-stroke-color': color,
          'circle-stroke-width': 2,
        },
      });
    }

    return () => {
      // Cleanup layers and source
      if (map.getLayer('drawing-buffer')) map.removeLayer('drawing-buffer');
      if (map.getLayer('drawing-buffer-outline')) map.removeLayer('drawing-buffer-outline');
      if (map.getLayer('drawing-line')) map.removeLayer('drawing-line');
      if (map.getLayer('drawing-points')) map.removeLayer('drawing-points');
      if (map.getSource('drawing')) map.removeSource('drawing');
      sourceAddedRef.current = false;
    };
  }, [map, mode, color]);

  // Update the drawing on the map
  const updateDrawing = useCallback(
    (currentPoints: [number, number][]) => {
      if (!map || !sourceAddedRef.current) return;

      const source = map.getSource('drawing') as GeoJSONSource;
      if (!source) return;

      const features: GeoJSON.Feature[] = [];

      // Add points
      currentPoints.forEach((point) => {
        features.push({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Point',
            coordinates: point,
          },
        });
      });

      // Add line and buffer preview if we have at least 2 points
      if (currentPoints.length >= 2) {
        const line = turf.lineString(currentPoints);
        features.push(line);

        // Add buffer polygon preview
        try {
          const buffered = turf.buffer(line, BUFFER_METERS, { units: 'meters' });
          if (buffered) {
            features.push(buffered);
          }
        } catch (e) {
          console.error('Buffer error:', e);
        }
      }

      source.setData({
        type: 'FeatureCollection',
        features,
      });
    },
    [map]
  );

  // Handle map click
  const handleClick = useCallback(
    (e: MapMouseEvent) => {
      const currentPoints = pointsRef.current;
      const clickCoord: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      // Add new point
      const newPoints = [...currentPoints, clickCoord];
      setPoints(newPoints);
      updateDrawing(newPoints);
    },
    [updateDrawing]
  );

  // Subscribe to map click
  useEffect(() => {
    if (!map || mode === 'none') return;

    map.on('click', handleClick);
    map.getCanvas().style.cursor = 'crosshair';

    return () => {
      map.off('click', handleClick);
      map.getCanvas().style.cursor = '';
    };
  }, [map, mode, handleClick]);

  // Reset points when mode changes
  useEffect(() => {
    setPoints([]);
    if (map && sourceAddedRef.current) {
      updateDrawing([]);
    }
  }, [mode, map, updateDrawing]);

  const handleDone = () => {
    if (points.length < 2) return;

    // Create line and buffer it
    const line = turf.lineString(points);
    const buffered = turf.buffer(line, BUFFER_METERS, { units: 'meters' });

    if (buffered) {
      onDrawComplete(buffered.geometry);
    }

    setPoints([]);
    updateDrawing([]);
  };

  const handleCancel = () => {
    setPoints([]);
    updateDrawing([]);
    onDrawCancel();
  };

  const handleUndo = () => {
    const newPoints = points.slice(0, -1);
    setPoints(newPoints);
    updateDrawing(newPoints);
  };

  if (mode === 'none') return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-lg p-4">
      <div className="text-center mb-3">
        <p className="text-white font-medium">
          {mode === 'target'
            ? 'Kresliť cieľovú oblasť'
            : mode === 'event'
            ? 'Označiť miesto udalosti'
            : 'Kresliť vyčistenú oblasť'}
        </p>
        <p className="text-gray-400 text-sm">
          {points.length === 0
            ? 'Kliknite pre prvý bod línie'
            : `${points.length} bodov • ${BUFFER_METERS}m šírka na každú stranu`}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleUndo}
          disabled={points.length === 0}
          className="py-2 px-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg transition-colors"
        >
          Späť
        </button>
        <button
          onClick={handleDone}
          disabled={points.length < 2}
          className="py-2 px-4 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-800 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors"
        >
          Hotovo
        </button>
        <button
          onClick={handleCancel}
          className="py-2 px-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          Zrušiť
        </button>
      </div>
    </div>
  );
}
