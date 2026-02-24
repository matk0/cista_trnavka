'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import ProgressBadge from '@/components/ProgressBadge';
import { calculateRemainingArea, type PolygonGeometry } from '@/lib/geo';
import type { Cleanup } from '@/lib/db';
import type { Geometry } from 'geojson';

// Dynamic import for Map component to avoid SSR issues with mapbox-gl
const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-900">
      <div className="text-gray-400">Načítavam mapu...</div>
    </div>
  ),
});

interface TargetResponse {
  target: {
    id: number;
    geometry: Geometry;
    created_at: string;
    updated_at: string;
  } | null;
}

interface CleanupsResponse {
  cleanups: Cleanup[];
}

export default function Home() {
  const [targetGeometry, setTargetGeometry] = useState<Geometry | null>(null);
  const [cleanups, setCleanups] = useState<Cleanup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [targetRes, cleanupsRes] = await Promise.all([
          fetch('/api/target'),
          fetch('/api/cleanups'),
        ]);

        if (!targetRes.ok || !cleanupsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const targetData: TargetResponse = await targetRes.json();
        const cleanupsData: CleanupsResponse = await cleanupsRes.json();

        setTargetGeometry(targetData.target?.geometry || null);
        setCleanups(cleanupsData.cleanups || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Nepodarilo sa načítať dáta');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Calculate progress
  const cleanupGeometries = cleanups
    .map((c) => c.geometry)
    .filter(
      (g): g is PolygonGeometry =>
        g.type === 'Polygon' || g.type === 'MultiPolygon'
    );

  const progress =
    targetGeometry &&
    (targetGeometry.type === 'Polygon' || targetGeometry.type === 'MultiPolygon')
      ? calculateRemainingArea(
          targetGeometry as PolygonGeometry,
          cleanupGeometries
        )
      : null;

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-900">
        <div className="text-gray-400 text-lg">Načítavam...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-900">
        <div className="text-red-400 text-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative">
      {/* Full-screen map */}
      <Map targetGeometry={targetGeometry} cleanups={cleanups} interactive />

      {/* Title overlay */}
      <div className="absolute top-4 left-4 bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-lg px-4 py-3">
        <h1 className="text-xl font-bold text-cyan-400">Čistá Trnávka</h1>
        <p className="text-sm text-gray-400">Sledovanie čistenia rieky</p>
      </div>

      {/* Progress badge */}
      {progress && (
        <ProgressBadge
          percentage={progress.percentage}
          className="absolute top-4 right-4"
        />
      )}

      {/* Info when no target is set */}
      {!targetGeometry && (
        <div className="absolute bottom-4 left-4 right-4 bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-lg p-4 text-center">
          <p className="text-gray-400">
            Zatiaľ nebola definovaná cieľová oblasť na čistenie.
          </p>
        </div>
      )}

      {/* Admin link */}
      <a
        href="/admin"
        className="absolute bottom-4 right-4 bg-gray-800/80 hover:bg-gray-700/80 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        Admin
      </a>
    </div>
  );
}
