'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { Map as MapGL, Source, Layer, Popup } from 'react-map-gl/mapbox';
import type { MapRef, LayerProps } from 'react-map-gl/mapbox';
import type { Map as MapboxMap, MapMouseEvent, GeoJSONFeature } from 'mapbox-gl';
import type { Geometry } from 'geojson';
import 'mapbox-gl/dist/mapbox-gl.css';

import { calculateRemainingArea, getBoundingBox, type PolygonGeometry } from '@/lib/geo';
import type { Cleanup, Event } from '@/lib/db';

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

const eventLayerStyle: LayerProps = {
  id: 'event-areas',
  type: 'fill',
  paint: {
    'fill-color': 'rgba(245, 158, 11, 0.4)',
    'fill-outline-color': 'rgba(245, 158, 11, 0.9)',
  },
};

const eventOutlineStyle: LayerProps = {
  id: 'event-outline',
  type: 'line',
  paint: {
    'line-color': 'rgba(245, 158, 11, 0.9)',
    'line-width': 2,
    'line-dasharray': [4, 2],
  },
};

// Event type with features from interactiveLayerIds
interface MapEventWithFeatures extends MapMouseEvent {
  features?: GeoJSONFeature[];
}

// Photo carousel component for popup
function PhotoCarousel({ photos }: { photos: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrev = () => {
    setCurrentIndex((i) => (i === 0 ? photos.length - 1 : i - 1));
  };

  const goToNext = () => {
    setCurrentIndex((i) => (i === photos.length - 1 ? 0 : i + 1));
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-700">
      <div className="relative">
        <img
          src={`/uploads/${photos[currentIndex]}`}
          alt={`Foto ${currentIndex + 1}`}
          className="w-full h-40 object-cover rounded-lg"
        />

        {photos.length > 1 && (
          <>
            <button
              onClick={goToPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            >
              ‹
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            >
              ›
            </button>

            {/* Dots indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {photos.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentIndex ? 'bg-white' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-2 text-center">
        {currentIndex + 1} / {photos.length}
      </p>
    </div>
  );
}

interface MapProps {
  targetGeometry?: Geometry | null;
  cleanups?: Cleanup[];
  events?: Event[];
  focusedEvent?: Event | null;
  onCleanupClick?: (cleanup: Cleanup) => void;
  onMapLoad?: (map: MapboxMap) => void;
  interactive?: boolean;
  children?: React.ReactNode;
}

export default function Map({
  targetGeometry,
  cleanups = [],
  events = [],
  focusedEvent,
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

  // Fly to focused event when it changes
  useEffect(() => {
    if (focusedEvent && mapRef.current) {
      const map = mapRef.current.getMap();
      if (map) {
        const bbox = getBoundingBox(focusedEvent.geometry);
        map.fitBounds(
          [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
          {
            padding: 100,
            duration: 1000,
            maxZoom: 17,
          }
        );
      }
    }
  }, [focusedEvent]);

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

  // Create GeoJSON for all events
  const eventsGeoJson = {
    type: 'FeatureCollection' as const,
    features: events.map((event) => ({
      type: 'Feature' as const,
      properties: { id: event.id },
      geometry: event.geometry,
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

      {/* Event areas (amber/orange) */}
      {eventsGeoJson.features.length > 0 && (
        <Source id="events" type="geojson" data={eventsGeoJson}>
          <Layer {...eventLayerStyle} />
          <Layer {...eventOutlineStyle} />
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
          maxWidth="320px"
        >
          <div className="bg-gray-900 text-white rounded-lg shadow-xl p-4 min-w-[280px]">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-bold text-cyan-400">
                {new Date(popupInfo.cleanup.date).toLocaleDateString('sk-SK', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </h3>
              <button
                onClick={() => setPopupInfo(null)}
                className="text-gray-400 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>

            {popupInfo.cleanup.notes && (
              <p className="text-gray-300 mb-3">{popupInfo.cleanup.notes}</p>
            )}

            <div className="flex flex-wrap gap-4 text-sm">
              {popupInfo.cleanup.volunteers && (
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-lg">👥</span>
                  <span>{popupInfo.cleanup.volunteers} dobrovoľníkov</span>
                </div>
              )}
              {popupInfo.cleanup.weight_kg && (
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-lg">🗑️</span>
                  <span>{popupInfo.cleanup.weight_kg} kg odpadu</span>
                </div>
              )}
            </div>

            {popupInfo.cleanup.photos && popupInfo.cleanup.photos.length > 0 && (
              <PhotoCarousel photos={popupInfo.cleanup.photos} />
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
