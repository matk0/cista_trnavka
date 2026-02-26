'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { Map as MapGL, Source, Layer, Popup } from 'react-map-gl/mapbox';
import type { MapRef, LayerProps } from 'react-map-gl/mapbox';
import type { Map as MapboxMap, MapMouseEvent, GeoJSONFeature } from 'mapbox-gl';
import type { Geometry } from 'geojson';
import 'mapbox-gl/dist/mapbox-gl.css';

import { calculateRemainingArea, getBoundingBox, type PolygonGeometry } from '@/lib/geo';
import type { Cleanup, Event } from '@/lib/db';
import PhotoComparison from './PhotoComparison';

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
    'fill-color': 'rgba(255, 0, 60, 0.5)',
    'fill-outline-color': '#ff003c',
  },
};

const targetOutlineStyle: LayerProps = {
  id: 'target-outline',
  type: 'line',
  paint: {
    'line-color': '#ff003c',
    'line-width': 2,
  },
};

const cleanupLayerStyle: LayerProps = {
  id: 'cleanup-areas',
  type: 'fill',
  paint: {
    'fill-color': 'rgba(0, 255, 140, 0.5)',
    'fill-outline-color': '#00ff8c',
  },
};

const cleanupOutlineStyle: LayerProps = {
  id: 'cleanup-outline',
  type: 'line',
  paint: {
    'line-color': '#00ff8c',
    'line-width': 2,
  },
};

const eventLayerStyle: LayerProps = {
  id: 'event-areas',
  type: 'fill',
  paint: {
    'fill-color': 'rgba(255, 200, 0, 0.5)',
    'fill-outline-color': '#ffc800',
  },
};

const eventOutlineStyle: LayerProps = {
  id: 'event-outline',
  type: 'line',
  paint: {
    'line-color': '#ffc800',
    'line-width': 2,
    'line-dasharray': [4, 2],
  },
};

const meetingPointStyle: LayerProps = {
  id: 'meeting-points',
  type: 'circle',
  paint: {
    'circle-radius': 10,
    'circle-color': '#f59e0b',
    'circle-stroke-color': '#ffffff',
    'circle-stroke-width': 3,
  },
};


// Event type with features from interactiveLayerIds
interface MapEventWithFeatures extends MapMouseEvent {
  features?: GeoJSONFeature[];
}

// Photo section component for popup with before/after comparison
function PhotoSection({ cleanup }: { cleanup: Cleanup }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'comparison' | 'gallery'>('comparison');

  const hasAfterPhotos = cleanup.photos && cleanup.photos.length > 0;
  const hasBeforePhotos = cleanup.before_photos && cleanup.before_photos.length > 0;
  const hasComparison = hasBeforePhotos && hasAfterPhotos;

  // Combine all photos for gallery view
  const allPhotos = [
    ...(cleanup.before_photos || []).map(p => ({ src: p, type: 'before' })),
    ...(cleanup.photos || []).map(p => ({ src: p, type: 'after' })),
    ...(cleanup.other_photos || []).map(p => ({ src: p, type: 'other' })),
  ];

  const hasAnyPhotos = allPhotos.length > 0;

  if (!hasAnyPhotos) return null;

  const goToPrev = () => {
    setCurrentIndex((i) => (i === 0 ? allPhotos.length - 1 : i - 1));
  };

  const goToNext = () => {
    setCurrentIndex((i) => (i === allPhotos.length - 1 ? 0 : i + 1));
  };

  const getPhotoLabel = (type: string) => {
    switch (type) {
      case 'before': return 'PRED';
      case 'after': return 'PO';
      default: return '';
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-700">
      {/* View mode toggle when comparison is available */}
      {hasComparison && (
        <div className="flex justify-center mb-3">
          <div className="flex bg-gray-800 rounded-full p-1">
            <button
              onClick={() => setViewMode('comparison')}
              className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                viewMode === 'comparison'
                  ? 'bg-cyan-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Porovnanie
            </button>
            <button
              onClick={() => setViewMode('gallery')}
              className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                viewMode === 'gallery'
                  ? 'bg-cyan-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Galéria
            </button>
          </div>
        </div>
      )}

      {/* Comparison view */}
      {hasComparison && viewMode === 'comparison' && (
        <PhotoComparison
          beforeSrc={`/api/uploads/${cleanup.before_photos[0]}`}
          afterSrc={`/api/uploads/${cleanup.photos[0]}`}
        />
      )}

      {/* Gallery view - shows all photos */}
      {(!hasComparison || viewMode === 'gallery') && hasAnyPhotos && (
        <div className="relative">
          <img
            src={`/api/uploads/${allPhotos[currentIndex].src}`}
            alt={`Foto ${currentIndex + 1}`}
            className="w-full h-72 object-contain bg-black rounded-lg"
          />

          {/* Photo type label */}
          {allPhotos[currentIndex].type !== 'other' && (
            <div className={`absolute top-2 left-2 px-2 py-1 text-xs font-bold rounded ${
              allPhotos[currentIndex].type === 'before'
                ? 'bg-red-600/80 text-white'
                : 'bg-green-600/80 text-white'
            }`}>
              {getPhotoLabel(allPhotos[currentIndex].type)}
            </div>
          )}

          {allPhotos.length > 1 && (
            <>
              <button
                onClick={goToPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white w-12 h-12 rounded-full flex items-center justify-center transition-colors text-2xl font-bold"
              >
                ‹
              </button>
              <button
                onClick={goToNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white w-12 h-12 rounded-full flex items-center justify-center transition-colors text-2xl font-bold"
              >
                ›
              </button>
            </>
          )}
          {/* Dots indicator - below the image */}
          {allPhotos.length > 1 && (
            <div className="flex justify-center gap-2 mt-3">
              {allPhotos.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    index === currentIndex ? 'bg-white' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface MapProps {
  targetGeometry?: Geometry | null;
  cleanups?: Cleanup[];
  events?: Event[];
  focusedEvent?: Event | null;
  focusedCleanup?: Cleanup | null;
  onFocusComplete?: () => void;
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
  focusedCleanup,
  onFocusComplete,
  onCleanupClick,
  onMapLoad,
  interactive = true,
  children,
}: MapProps) {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState(DEFAULT_CENTER);
  const [hoveredCleanup, setHoveredCleanup] = useState<Cleanup | null>(null);
  const [mapStyle, setMapStyle] = useState<'dark' | 'satellite'>('dark');
  const [popupInfo, setPopupInfo] = useState<{
    cleanup: Cleanup;
    longitude: number;
    latitude: number;
  } | null>(null);

  const mapStyles = {
    dark: 'mapbox://styles/mapbox/dark-v11',
    satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  };

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
            bearing: DEFAULT_CENTER.bearing,
          }
        );
        // Clear focused event after animation completes
        if (onFocusComplete) {
          map.once('moveend', onFocusComplete);
        }
      }
    }
  }, [focusedEvent, onFocusComplete]);

  // Fly to focused cleanup and open popup when it changes
  useEffect(() => {
    if (focusedCleanup && mapRef.current) {
      const map = mapRef.current.getMap();
      if (map) {
        const bbox = getBoundingBox(focusedCleanup.geometry);
        const centerLng = (bbox[0] + bbox[2]) / 2;
        const centerLat = (bbox[1] + bbox[3]) / 2;

        map.fitBounds(
          [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
          {
            padding: 100,
            duration: 1000,
            maxZoom: 17,
            bearing: DEFAULT_CENTER.bearing,
          }
        );

        // Open popup after animation
        map.once('moveend', () => {
          setPopupInfo({
            cleanup: focusedCleanup,
            longitude: centerLng,
            latitude: centerLat,
          });
        });
      }
    }
  }, [focusedCleanup]);

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

  // Create GeoJSON for events
  // If focusedEvent is set, show only that event; otherwise show all events
  const eventsToShow = focusedEvent ? [focusedEvent] : events;
  const eventsGeoJson = {
    type: 'FeatureCollection' as const,
    features: eventsToShow.map((event) => ({
      type: 'Feature' as const,
      properties: { id: event.id },
      geometry: event.geometry,
    })),
  };

  // Create GeoJSON for meeting points (follows same logic as events)
  const meetingPointsGeoJson = {
    type: 'FeatureCollection' as const,
    features: eventsToShow
      .filter((event) => event.meeting_point)
      .map((event) => ({
        type: 'Feature' as const,
        properties: { id: event.id },
        geometry: event.meeting_point!,
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
      mapStyle={mapStyles[mapStyle]}
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

      {/* Meeting points for events */}
      {meetingPointsGeoJson.features.length > 0 && (
        <Source id="meeting-points" type="geojson" data={meetingPointsGeoJson}>
          <Layer {...meetingPointStyle} />
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
          maxWidth="500px"
          style={{ zIndex: 100 }}
        >
          <div className="bg-gray-900 text-white rounded-lg shadow-xl p-4 min-w-[460px]">
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
              {popupInfo.cleanup.volume_litres && (
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-lg">🗑️</span>
                  <span>{popupInfo.cleanup.volume_litres} L odpadu</span>
                </div>
              )}
            </div>

            <PhotoSection cleanup={popupInfo.cleanup} />
          </div>
        </Popup>
      )}

      {children}

      {/* Map style switcher */}
      <div className="absolute top-36 sm:top-auto sm:bottom-24 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-lg p-1 flex gap-1 z-40">
        <button
          onClick={() => setMapStyle('dark')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            mapStyle === 'dark'
              ? 'bg-cyan-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          Mapa
        </button>
        <button
          onClick={() => setMapStyle('satellite')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            mapStyle === 'satellite'
              ? 'bg-cyan-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          Satelit
        </button>
      </div>
    </MapGL>
  );
}

export { DEFAULT_CENTER };
export type { MapProps };
