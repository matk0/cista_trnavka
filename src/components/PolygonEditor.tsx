'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Map as MapboxMap, GeoJSONSource, MapMouseEvent } from 'mapbox-gl';
import type { Geometry, Position } from 'geojson';

// Find the closest point on a line segment to a given point
function closestPointOnSegment(
  point: [number, number],
  segStart: [number, number],
  segEnd: [number, number]
): { point: [number, number]; distance: number; t: number } {
  const dx = segEnd[0] - segStart[0];
  const dy = segEnd[1] - segStart[1];
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    // Segment is a point
    const dist = Math.sqrt(
      Math.pow(point[0] - segStart[0], 2) + Math.pow(point[1] - segStart[1], 2)
    );
    return { point: segStart, distance: dist, t: 0 };
  }

  // Project point onto line, clamped to segment
  let t = ((point[0] - segStart[0]) * dx + (point[1] - segStart[1]) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  const closestX = segStart[0] + t * dx;
  const closestY = segStart[1] + t * dy;
  const dist = Math.sqrt(
    Math.pow(point[0] - closestX, 2) + Math.pow(point[1] - closestY, 2)
  );

  return { point: [closestX, closestY], distance: dist, t };
}

interface PolygonEditorProps {
  map: MapboxMap | null;
  geometry: Geometry | null;
  onSave: (geometry: Geometry) => void;
  onCancel: () => void;
  color?: string;
  title?: string;
}

export default function PolygonEditor({
  map,
  geometry,
  onSave,
  onCancel,
  color = '#ff6464',
  title = 'Upraviť oblasť',
}: PolygonEditorProps) {
  const [vertices, setVertices] = useState<[number, number][]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const verticesRef = useRef<[number, number][]>([]);
  const sourceAddedRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    verticesRef.current = vertices;
  }, [vertices]);

  // Extract vertices from geometry on mount
  useEffect(() => {
    if (!geometry) return;

    let coords: Position[] = [];
    if (geometry.type === 'Polygon') {
      // Get outer ring (first ring), skip last point as it duplicates first
      coords = geometry.coordinates[0].slice(0, -1);
    } else if (geometry.type === 'MultiPolygon') {
      // For MultiPolygon, just use first polygon's outer ring
      coords = geometry.coordinates[0][0].slice(0, -1);
    }

    const verts = coords.map((c): [number, number] => [c[0], c[1]]);
    setVertices(verts);
  }, [geometry]);

  // Initialize editing layers
  useEffect(() => {
    if (!map) return;

    // Add source for editing
    if (!map.getSource('editing')) {
      map.addSource('editing', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });
      sourceAddedRef.current = true;
    }

    // Add polygon fill layer
    if (!map.getLayer('editing-fill')) {
      map.addLayer({
        id: 'editing-fill',
        type: 'fill',
        source: 'editing',
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'fill-color': color,
          'fill-opacity': 0.3,
        },
      });
    } else {
      map.setPaintProperty('editing-fill', 'fill-color', color);
    }

    // Add polygon outline layer
    if (!map.getLayer('editing-outline')) {
      map.addLayer({
        id: 'editing-outline',
        type: 'line',
        source: 'editing',
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'line-color': color,
          'line-width': 2,
        },
      });
    } else {
      map.setPaintProperty('editing-outline', 'line-color', color);
    }

    // Add clickable edges layer (wider invisible line for easier clicking)
    if (!map.getLayer('editing-edges')) {
      map.addLayer({
        id: 'editing-edges',
        type: 'line',
        source: 'editing',
        filter: ['==', ['get', 'type'], 'edge'],
        paint: {
          'line-color': 'transparent',
          'line-width': 16, // Wide clickable area
        },
      });
    }

    // Add vertices layer
    if (!map.getLayer('editing-vertices')) {
      map.addLayer({
        id: 'editing-vertices',
        type: 'circle',
        source: 'editing',
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-radius': 8,
          'circle-color': '#fff',
          'circle-stroke-color': color,
          'circle-stroke-width': 3,
        },
      });
    } else {
      map.setPaintProperty('editing-vertices', 'circle-stroke-color', color);
    }

    return () => {
      if (map.getLayer('editing-fill')) map.removeLayer('editing-fill');
      if (map.getLayer('editing-outline')) map.removeLayer('editing-outline');
      if (map.getLayer('editing-edges')) map.removeLayer('editing-edges');
      if (map.getLayer('editing-vertices')) map.removeLayer('editing-vertices');
      if (map.getSource('editing')) map.removeSource('editing');
      sourceAddedRef.current = false;
    };
  }, [map, color]);

  // Update the editing visualization on the map
  const updateEditing = useCallback(
    (currentVertices: [number, number][]) => {
      if (!map || !sourceAddedRef.current) return;

      const source = map.getSource('editing') as GeoJSONSource;
      if (!source) return;

      const features: GeoJSON.Feature[] = [];

      // Add edge lines (for click detection to add new vertices)
      if (currentVertices.length >= 2) {
        for (let i = 0; i < currentVertices.length; i++) {
          const start = currentVertices[i];
          const end = currentVertices[(i + 1) % currentVertices.length];
          features.push({
            type: 'Feature',
            properties: { type: 'edge', edgeIndex: i },
            geometry: {
              type: 'LineString',
              coordinates: [start, end],
            },
          });
        }
      }

      // Add vertex points
      currentVertices.forEach((vertex, index) => {
        features.push({
          type: 'Feature',
          properties: { index },
          geometry: {
            type: 'Point',
            coordinates: vertex,
          },
        });
      });

      // Add polygon if we have at least 3 vertices
      if (currentVertices.length >= 3) {
        features.push({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [[...currentVertices, currentVertices[0]]],
          },
        });
      }

      source.setData({
        type: 'FeatureCollection',
        features,
      });
    },
    [map]
  );

  // Update visualization when vertices change
  useEffect(() => {
    updateEditing(vertices);
  }, [vertices, updateEditing]);

  // Handle mouse down on vertex or edge
  const handleMouseDown = useCallback(
    (e: MapMouseEvent) => {
      if (!map) return;

      // First, check if clicking on a vertex
      const vertexFeatures = map.queryRenderedFeatures(e.point, {
        layers: ['editing-vertices'],
      });

      if (vertexFeatures.length > 0) {
        const index = vertexFeatures[0].properties?.index;
        if (typeof index === 'number') {
          e.preventDefault();
          setDragIndex(index);
          map.getCanvas().style.cursor = 'grabbing';
          return;
        }
      }

      // Next, check if clicking on an edge to add a new vertex
      const edgeFeatures = map.queryRenderedFeatures(e.point, {
        layers: ['editing-edges'],
      });

      if (edgeFeatures.length > 0) {
        const edgeIndex = edgeFeatures[0].properties?.edgeIndex;
        if (typeof edgeIndex === 'number') {
          e.preventDefault();

          // Get the click position
          const clickPoint: [number, number] = [e.lngLat.lng, e.lngLat.lat];
          const currentVerts = verticesRef.current;
          const start = currentVerts[edgeIndex];
          const end = currentVerts[(edgeIndex + 1) % currentVerts.length];

          // Find the closest point on the edge to insert the new vertex
          const result = closestPointOnSegment(clickPoint, start, end);

          // Insert the new vertex after edgeIndex
          const newVertices = [...currentVerts];
          newVertices.splice(edgeIndex + 1, 0, result.point);
          setVertices(newVertices);

          // Start dragging the new vertex immediately
          setDragIndex(edgeIndex + 1);
          map.getCanvas().style.cursor = 'grabbing';
          return;
        }
      }

      // Click was outside vertices and edges - ignore
    },
    [map]
  );

  // Handle mouse move for dragging
  const handleMouseMove = useCallback(
    (e: MapMouseEvent) => {
      if (!map) return;

      if (dragIndex !== null) {
        // Dragging a vertex
        const newVertices = [...verticesRef.current];
        newVertices[dragIndex] = [e.lngLat.lng, e.lngLat.lat];
        setVertices(newVertices);
      } else {
        // Check if hovering over a vertex
        const vertexFeatures = map.queryRenderedFeatures(e.point, {
          layers: ['editing-vertices'],
        });

        if (vertexFeatures.length > 0) {
          map.getCanvas().style.cursor = 'grab';
          return;
        }

        // Check if hovering over an edge
        const edgeFeatures = map.queryRenderedFeatures(e.point, {
          layers: ['editing-edges'],
        });

        if (edgeFeatures.length > 0) {
          map.getCanvas().style.cursor = 'crosshair';
          return;
        }

        // Not hovering over anything interactive
        map.getCanvas().style.cursor = '';
      }
    },
    [map, dragIndex]
  );

  // Handle mouse up to end dragging
  const handleMouseUp = useCallback(() => {
    if (!map) return;
    if (dragIndex !== null) {
      setDragIndex(null);
      // Reset cursor based on what we're hovering over
      map.getCanvas().style.cursor = '';
    }
  }, [map, dragIndex]);

  // Subscribe to mouse events
  useEffect(() => {
    if (!map) return;

    map.on('mousedown', handleMouseDown);
    map.on('mousemove', handleMouseMove);
    map.on('mouseup', handleMouseUp);

    return () => {
      map.off('mousedown', handleMouseDown);
      map.off('mousemove', handleMouseMove);
      map.off('mouseup', handleMouseUp);
      map.getCanvas().style.cursor = '';
    };
  }, [map, handleMouseDown, handleMouseMove, handleMouseUp]);

  const handleSave = () => {
    if (vertices.length < 3) return;

    const newGeometry: Geometry = {
      type: 'Polygon',
      coordinates: [[...vertices, vertices[0]]],
    };

    onSave(newGeometry);
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-lg p-4">
      <div className="text-center mb-3">
        <p className="text-white font-medium">{title}</p>
        <p className="text-gray-400 text-sm">
          Ťahajte body alebo kliknite na líniu pre pridanie bodu
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={vertices.length < 3}
          className="py-2 px-4 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-800 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors"
        >
          Uložiť
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
