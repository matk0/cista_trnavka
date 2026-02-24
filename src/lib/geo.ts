import * as turf from '@turf/turf';
import type { Feature, Polygon, MultiPolygon, Geometry } from 'geojson';

export type PolygonGeometry = Polygon | MultiPolygon;
export type PolygonFeature = Feature<PolygonGeometry>;

/**
 * Calculate the area of a polygon in square meters
 */
export function calculateArea(geometry: Geometry): number {
  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') {
    return 0;
  }
  return turf.area(geometry);
}

/**
 * Calculate the remaining area after subtracting cleanups from target
 */
export function calculateRemainingArea(
  targetGeometry: PolygonGeometry,
  cleanupGeometries: PolygonGeometry[]
): { remaining: PolygonGeometry | null; area: number; percentage: number } {
  const targetArea = calculateArea(targetGeometry);

  if (cleanupGeometries.length === 0) {
    return {
      remaining: targetGeometry,
      area: targetArea,
      percentage: 0,
    };
  }

  let remaining: Feature<Polygon | MultiPolygon> | null = turf.feature(targetGeometry);

  for (const cleanupGeometry of cleanupGeometries) {
    if (!remaining) break;

    try {
      const result = turf.difference(
        turf.featureCollection([remaining, turf.feature(cleanupGeometry)])
      );

      if (!result) {
        remaining = null;
      } else {
        remaining = result as Feature<Polygon | MultiPolygon>;
      }
    } catch (error) {
      console.error('Error computing difference:', error);
      // Continue with current remaining if difference fails
    }
  }

  const remainingArea = remaining ? calculateArea(remaining.geometry) : 0;
  const cleanedPercentage = targetArea > 0 ? ((targetArea - remainingArea) / targetArea) * 100 : 0;

  return {
    remaining: remaining?.geometry || null,
    area: remainingArea,
    percentage: Math.min(100, Math.max(0, cleanedPercentage)),
  };
}

/**
 * Convert a geometry to a GeoJSON feature for rendering
 */
export function toFeature(
  geometry: Geometry,
  properties: Record<string, unknown> = {}
): Feature {
  return turf.feature(geometry, properties);
}

/**
 * Check if a point is inside a polygon
 */
export function isPointInPolygon(
  point: [number, number],
  polygon: PolygonGeometry
): boolean {
  const pt = turf.point(point);
  const poly = turf.feature(polygon);
  return turf.booleanPointInPolygon(pt, poly as Feature<Polygon>);
}

/**
 * Get the center of a polygon
 */
export function getCenter(geometry: Geometry): [number, number] {
  const center = turf.center(turf.feature(geometry));
  return center.geometry.coordinates as [number, number];
}

/**
 * Get the bounding box of a geometry
 */
export function getBoundingBox(geometry: Geometry): [number, number, number, number] {
  return turf.bbox(geometry) as [number, number, number, number];
}

/**
 * Format area for display
 */
export function formatArea(areaInSquareMeters: number): string {
  if (areaInSquareMeters < 1000) {
    return `${Math.round(areaInSquareMeters)} m²`;
  } else if (areaInSquareMeters < 1000000) {
    return `${(areaInSquareMeters / 1000).toFixed(1)} km² (${Math.round(areaInSquareMeters)} m²)`;
  } else {
    return `${(areaInSquareMeters / 1000000).toFixed(2)} km²`;
  }
}
