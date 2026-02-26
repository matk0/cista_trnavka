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
  const [focusedCleanup, setFocusedCleanup] = useState<Cleanup | null>(null);

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
  const totalVolumeLitres = cleanups.reduce(
    (sum, c) => sum + (c.volume_litres || 0),
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
        focusedEvent={focusedEvent}
        focusedCleanup={focusedCleanup}
        interactive
      />

      {/* Cyberpunk title - top center */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
        <h1
          className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 tracking-wider drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]"
          style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}
        >
          ČISTÁ TRNÁVKA
        </h1>
      </div>

      {/* Stats and share - top right */}
      <div className="absolute top-4 right-4 bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-lg px-4 py-3 flex items-center gap-4">
        {progress && (
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-400">
              {Math.round(progress.percentage * 10) / 10}%
            </div>
            <div className="text-xs text-gray-400">vyčistené</div>
          </div>
        )}
        {totalVolumeLitres > 0 && (
          <div className="text-center border-l border-gray-700 pl-4">
            <div className="text-2xl font-bold text-green-400">
              {totalVolumeLitres.toLocaleString('sk-SK')}L
            </div>
            <div className="text-xs text-gray-400">odpadu</div>
          </div>
        )}
        <div className="border-l border-gray-700 pl-4">
          <ShareButtons
            percentage={progress?.percentage || 0}
            totalVolunteers={totalVolunteers}
            totalVolumeLitres={totalVolumeLitres}
          />
        </div>
      </div>

      {/* Motivational GIF - top right corner, desktop only */}
      <img
        src="/motivation.gif"
        alt="Just do it!"
        className="hidden xl:block absolute right-4 top-24 w-48 rounded-lg shadow-2xl pointer-events-none z-10"
      />

      {/* Upcoming events list */}
      <EventList events={events} onEventClick={setFocusedEvent} />

      {/* Previous cleanups list - bottom left */}
      {cleanups.length > 0 && (
        <div className="absolute bottom-20 left-4 bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-lg p-3 max-w-xs max-h-64 overflow-y-auto">
          <h3 className="text-sm font-semibold text-cyan-400 mb-2">
            Predchádzajúce čistenia
          </h3>
          <div className="space-y-1">
            {cleanups
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((cleanup) => (
                <button
                  key={cleanup.id}
                  onClick={() => setFocusedCleanup(cleanup)}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-800 transition-colors group"
                >
                  <div className="text-sm text-white group-hover:text-cyan-400 transition-colors">
                    {new Date(cleanup.date).toLocaleDateString('sk-SK', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                  <div className="text-xs text-gray-500 flex gap-2">
                    {cleanup.volunteers && <span>{cleanup.volunteers} dobrovoľníkov</span>}
                    {cleanup.volume_litres && <span>{cleanup.volume_litres}L</span>}
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Info when no target is set */}
      {!targetGeometry && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-lg p-4 text-center">
          <p className="text-gray-400">
            Zatiaľ nebola definovaná cieľová oblasť na čistenie.
          </p>
        </div>
      )}

      {/* Sponsor bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800">
        <div className="flex items-center justify-center px-4 py-2">
          <span className="text-xs text-gray-400">
            Ak tu chcete mať vaše logo,{' '}
            <a
              href="mailto:matej@matejlukasik.com?subject=Podpora%20projektu%20Čistá%20Trnávka"
              className="text-cyan-400 hover:text-cyan-300 transition-colors font-semibold"
            >
              podporte projekt!
            </a>
          </span>
        </div>
        <div className="text-center py-2 border-t border-gray-800">
          <span className="text-xs text-gray-500">
            Created with love by{' '}
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
