'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
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
  const [focusedEvent, setFocusedEvent] = useState<Event | null>(null);

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
      <Map
        targetGeometry={targetGeometry}
        cleanups={cleanups}
        events={events}
        focusedEvent={focusedEvent}
        onFocusComplete={() => setFocusedEvent(null)}
        interactive
      />

      {/* Title overlay */}
      <div className="absolute top-4 left-4 bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-lg px-4 py-3 h-[88px] flex flex-col justify-center">
        <h1 className="text-xl font-bold text-cyan-400">Čistá Trnávka</h1>
        <p className="text-sm text-gray-400">Sledovanie čistenia rieky</p>
      </div>

      {/* Progress badge and share */}
      <div className="absolute top-4 right-4 bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-lg px-4 py-3 h-[88px] flex items-center gap-4">
        {progress && (
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-400">
              {Math.round(progress.percentage * 10) / 10}%
            </div>
            <div className="text-xs text-gray-400">vyčistené</div>
          </div>
        )}
        <ShareButtons
          percentage={progress?.percentage || 0}
          totalVolunteers={totalVolunteers}
          totalWeightKg={totalWeightKg}
        />
      </div>

      {/* Upcoming events list */}
      <EventList events={events} onEventClick={setFocusedEvent} />

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
        className="absolute bottom-20 left-4 bg-gray-800/80 hover:bg-gray-700/80 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        Admin
      </a>

      {/* Motivational GIF - desktop only */}
      <img
        src="/motivation.gif"
        alt="Just do it!"
        className="hidden xl:block absolute left-4 top-1/2 -translate-y-1/2 w-64 rounded-lg shadow-2xl pointer-events-none z-10"
      />

      {/* Sponsor bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800">
        <div className="flex items-center justify-center px-4 py-2">
          <a
            href="mailto:matej@matejlukasik.com?subject=Podpora%20projektu%20Čistá%20Trnávka"
            className="text-xs text-gray-400 hover:text-cyan-400 transition-colors"
          >
            Ak tu chcete mať vaše logo, podporte projekt!
          </a>
        </div>
        <div className="text-center py-2 border-t border-gray-800">
          <span className="text-xs text-gray-500">
            Created with ❤️ by{' '}
            <a
              href="https://matejlukasik.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Matej Lukášik
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}
