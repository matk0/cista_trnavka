'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import ProgressBadge from '@/components/ProgressBadge';
import EventList from '@/components/EventList';
import ShareButtons from '@/components/ShareButtons';
import { calculateRemainingArea, type PolygonGeometry } from '@/lib/geo';
import type { Cleanup, Event } from '@/lib/db';
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

interface EventsResponse {
  events: Event[];
}

export default function Home() {
  const [targetGeometry, setTargetGeometry] = useState<Geometry | null>(null);
  const [cleanups, setCleanups] = useState<Cleanup[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [targetRes, cleanupsRes, eventsRes] = await Promise.all([
          fetch('/api/target'),
          fetch('/api/cleanups'),
          fetch('/api/events'),
        ]);

        if (!targetRes.ok || !cleanupsRes.ok || !eventsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const targetData: TargetResponse = await targetRes.json();
        const cleanupsData: CleanupsResponse = await cleanupsRes.json();
        const eventsData: EventsResponse = await eventsRes.json();

        setTargetGeometry(targetData.target?.geometry || null);
        setCleanups(cleanupsData.cleanups || []);
        setEvents(eventsData.events || []);
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

  // Calculate stats for sharing
  const totalVolunteers = cleanups.reduce(
    (sum, c) => sum + (c.volunteers || 0),
    0
  );
  const totalWeightKg = cleanups.reduce(
    (sum, c) => sum + (c.weight_kg || 0),
    0
  );

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
      <Map targetGeometry={targetGeometry} cleanups={cleanups} events={events} interactive />

      {/* Title overlay */}
      <div className="absolute top-4 left-4 bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-lg px-4 py-3">
        <h1 className="text-xl font-bold text-cyan-400">Čistá Trnávka</h1>
        <p className="text-sm text-gray-400">Sledovanie čistenia rieky</p>
      </div>

      {/* Progress badge and share */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
        {progress && (
          <ProgressBadge percentage={progress.percentage} />
        )}
        <ShareButtons
          percentage={progress?.percentage || 0}
          totalVolunteers={totalVolunteers}
          totalWeightKg={totalWeightKg}
        />
      </div>

      {/* Upcoming events list */}
      <EventList events={events} />

      {/* Info when no target is set */}
      {!targetGeometry && (
        <div className="absolute bottom-20 left-4 right-4 bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-lg p-4 text-center">
          <p className="text-gray-400">
            Zatiaľ nebola definovaná cieľová oblasť na čistenie.
          </p>
        </div>
      )}

      {/* Admin link */}
      <a
        href="/admin"
        className="absolute bottom-4 left-4 bg-gray-800/80 hover:bg-gray-700/80 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        Admin
      </a>
    </div>
  );
}
