'use client';

import { useCallback, useState, useRef } from 'react';
import { Map as MapGL, Source, Layer, Popup } from 'react-map-gl/mapbox';
import type { MapRef, LayerProps } from 'react-map-gl/mapbox';
import type { Map as MapboxMap, MapMouseEvent, GeoJSONFeature } from 'mapbox-gl';
import type { Geometry } from 'geojson';
import 'mapbox-gl/dist/mapbox-gl.css';

import { calculateRemainingArea, type PolygonGeometry } from '@/lib/geo';
import type { Cleanup } from '@/lib/db';

// Trnávka river coordinates (Trnava, Slovakia)
// Bearing rotated to show river horizontally
const DEFAULT_CENTER = {
  longitude: 17.582,
  latitude: 48.3765,
  zoom: 13.5,
  bearing: -70,
};

const targetLayerStyle: LayerProps = {
  id: 'target-area',
  type: 'fill',
  paint: {
    'fill-color': 'rgba(255, 100, 100, 0.4)',
    'fill-outline-color': 'rgba(255, 100, 100, 0.8)',
  },
};

const targetOutlineStyle: LayerProps = {
  id: 'target-outline',
  type: 'line',
  paint: {
    'line-color': 'rgba(255, 100, 100, 0.8)',
    'line-width': 2,
  },
};

const cleanupLayerStyle: LayerProps = {
  id: 'cleanup-areas',
  type: 'fill',
  paint: {
    'fill-color': 'rgba(100, 255, 150, 0.5)',
    'fill-outline-color': 'rgba(100, 255, 150, 0.9)',
  },
};

const cleanupOutlineStyle: LayerProps = {
  id: 'cleanup-outline',
  type: 'line',
  paint: {
    'line-color': 'rgba(100, 255, 150, 0.9)',
    'line-width': 2,
  },
};

// Event type with features from interactiveLayerIds
interface MapEventWithFeatures extends MapMouseEvent {
  features?: GeoJSONFeature[];
}

interface MapProps {
  targetGeometry?: Geometry | null;
  cleanups?: Cleanup[];
  onCleanupClick?: (cleanup: Cleanup) => void;
  onMapLoad?: (map: MapboxMap) => void;
  interactive?: boolean;
  children?: React.ReactNode;
}

export default function Map({
  targetGeometry,
  cleanups = [],
  onCleanupClick,
  onMapLoad,
  interactive = true,
  children,
}: MapProps) {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState(DEFAULT_CENTER);
  const [hoveredCleanup, setHoveredCleanup] = useState<Cleanup | null>(null);
  const [popupInfo, setPopupInfo] = useState<{
    cleanup: Cleanup;
    longitude: number;
    latitude: number;
  } | null>(null);

  // Calculate remaining area
  const cleanupGeometries = cleanups
    .map((c) => c.geometry)
    .filter((g): g is PolygonGeometry =>
      g.type === 'Polygon' || g.type === 'MultiPolygon'
    );

  const remainingData = targetGeometry &&
    (targetGeometry.type === 'Polygon' || targetGeometry.type === 'MultiPolygon')
    ? calculateRemainingArea(targetGeometry as PolygonGeometry, cleanupGeometries)
    : null;

  // Create GeoJSON for remaining target area
  const remainingGeoJson = remainingData?.remaining
    ? {
        type: 'Feature' as const,
        properties: {},
        geometry: remainingData.remaining,
      }
    : null;

  // Create GeoJSON for all cleanups
  const cleanupsGeoJson = {
    type: 'FeatureCollection' as const,
    features: cleanups.map((cleanup) => ({
      type: 'Feature' as const,
      properties: { id: cleanup.id },
      geometry: cleanup.geometry,
    })),
  };

  const handleMouseMove = useCallback(
    (event: MapEventWithFeatures) => {
      if (!interactive) return;

      const feature = event.features?.[0];
      if (feature && feature.properties?.id) {
        const cleanup = cleanups.find((c) => c.id === feature.properties?.id);
        setHoveredCleanup(cleanup || null);
      } else {
        setHoveredCleanup(null);
      }
    },
    [cleanups, interactive]
  );

  const handleClick = useCallback(
    (event: MapEventWithFeatures) => {
      if (!interactive) return;

      const feature = event.features?.[0];
      if (feature && feature.properties?.id) {
        const cleanup = cleanups.find((c) => c.id === feature.properties?.id);
        if (cleanup) {
          if (onCleanupClick) {
            onCleanupClick(cleanup);
          }
          setPopupInfo({
            cleanup,
            longitude: event.lngLat.lng,
            latitude: event.lngLat.lat,
          });
        }
      } else {
        setPopupInfo(null);
      }
    },
    [cleanups, interactive, onCleanupClick]
  );

  const handleLoad = useCallback(() => {
    if (mapRef.current && onMapLoad) {
      const map = mapRef.current.getMap();
      if (map) {
        onMapLoad(map);
      }
    }
  }, [onMapLoad]);

  return (
    <MapGL
      ref={mapRef}
      {...viewState}
      onMove={(evt) => setViewState(evt.viewState)}
      onLoad={handleLoad}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      interactiveLayerIds={interactive ? ['cleanup-areas'] : []}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      cursor={hoveredCleanup ? 'pointer' : 'grab'}
    >
      {/* Remaining target area (red) */}
      {remainingGeoJson && (
        <Source id="target" type="geojson" data={remainingGeoJson}>
          <Layer {...targetLayerStyle} />
          <Layer {...targetOutlineStyle} />
        </Source>
      )}

      {/* Cleanup areas (green) */}
      {cleanupsGeoJson.features.length > 0 && (
        <Source id="cleanups" type="geojson" data={cleanupsGeoJson}>
          <Layer {...cleanupLayerStyle} />
          <Layer {...cleanupOutlineStyle} />
        </Source>
      )}

      {/* Popup for clicked cleanup */}
      {popupInfo && (
        <Popup
          longitude={popupInfo.longitude}
          latitude={popupInfo.latitude}
          anchor="bottom"
          onClose={() => setPopupInfo(null)}
          closeOnClick={false}
          className="cleanup-popup"
        >
          <div className="p-2 text-sm">
            <p className="font-semibold text-gray-900">
              {new Date(popupInfo.cleanup.date).toLocaleDateString('sk-SK')}
            </p>
            {popupInfo.cleanup.notes && (
              <p className="text-gray-700 mt-1">{popupInfo.cleanup.notes}</p>
            )}
            {popupInfo.cleanup.volunteers && (
              <p className="text-gray-600">
                {popupInfo.cleanup.volunteers} dobrovoľníkov
              </p>
            )}
            {popupInfo.cleanup.weight_kg && (
              <p className="text-gray-600">
                {popupInfo.cleanup.weight_kg} kg odpadu
              </p>
            )}
          </div>
        </Popup>
      )}

      {children}
    </MapGL>
  );
}

export { DEFAULT_CENTER };
export type { MapProps };
