'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import EventList from '@/components/EventList';
import SponsorBadge from '@/components/SponsorBadge';
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
  const [eventsExpanded, setEventsExpanded] = useState(false);
  const [cleanupsExpanded, setCleanupsExpanded] = useState(false);

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

      {/* Motivational GIF - top left corner, desktop only */}
      <img
        src="/motivation.gif"
        alt="Just do it!"
        className="hidden xl:block absolute left-4 top-4 w-48 rounded-lg shadow-2xl pointer-events-none z-10"
      />

      {/* Title - centered on desktop, part of stacked layout on mobile */}
      <div className="absolute top-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-20 flex flex-col sm:block gap-2">
        {/* Title with dynamic progress gradient */}
        <div className="px-4 py-2">
          <h1
            className="text-2xl sm:text-2xl md:text-3xl font-bold text-transparent bg-clip-text tracking-wide text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
            style={{
              backgroundImage: (() => {
                const pct = progress?.percentage || 0;
                const transitionWidth = 10;
                const start = Math.max(0, pct - transitionWidth / 2);
                const end = Math.min(100, pct + transitionWidth / 2);
                return `linear-gradient(to right, #00ff8c 0%, #00ff8c ${start}%, #ff003c ${end}%, #ff003c 100%)`;
              })(),
            }}
          >
            Čistá Trnávka
          </h1>
        </div>

        {/* Stats and share - stacks below title on mobile only */}
        <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2 flex items-center justify-center gap-2 sm:hidden">
          {progress && (
            <div className="text-center">
              <div className="text-lg font-bold text-green-400">
                {Math.round(progress.percentage * 10) / 10}%
              </div>
              <div className="text-[10px] text-gray-400">vyčistené</div>
            </div>
          )}
          {totalVolumeLitres > 0 && (
            <div className="text-center border-l border-gray-700 pl-2">
              <div className="text-lg font-bold text-cyan-400">
                {totalVolumeLitres.toLocaleString('sk-SK')}L
              </div>
              <div className="text-[10px] text-gray-400">odpadu</div>
            </div>
          )}
          <div className="border-l border-gray-700 pl-2">
            <ShareButtons
              percentage={progress?.percentage || 0}
              totalVolunteers={totalVolunteers}
              totalVolumeLitres={totalVolumeLitres}
            />
          </div>
        </div>
      </div>

      {/* Stats and share - top right on desktop only */}
      <div className="hidden sm:flex absolute top-4 right-4 z-20 bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2 items-center gap-3">
        {progress && (
          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold text-green-400">
              {Math.round(progress.percentage * 10) / 10}%
            </div>
            <div className="text-[10px] md:text-xs text-gray-400">vyčistené</div>
          </div>
        )}
        {totalVolumeLitres > 0 && (
          <div className="text-center border-l border-gray-700 pl-3">
            <div className="text-xl md:text-2xl font-bold text-cyan-400">
              {totalVolumeLitres.toLocaleString('sk-SK')}L
            </div>
            <div className="text-[10px] md:text-xs text-gray-400">odpadu</div>
          </div>
        )}
        <div className="border-l border-gray-700 pl-3">
          <ShareButtons
            percentage={progress?.percentage || 0}
            totalVolunteers={totalVolunteers}
            totalVolumeLitres={totalVolumeLitres}
          />
        </div>
      </div>

      {/* Bottom panels container - stacks on mobile, side by side on larger screens */}
      <div className="absolute bottom-16 sm:bottom-20 left-4 right-4 flex flex-col sm:flex-row sm:justify-between gap-3 z-50 pointer-events-none">
        {/* Previous cleanups list - left on desktop */}
        {cleanups.length > 0 && (
          <div className="bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-xl w-full sm:max-w-sm pointer-events-auto order-2 sm:order-1 sm:self-end">
            <button
              className="w-full p-3 sm:p-4 border-b border-gray-800 sm:cursor-default"
              onClick={() => setCleanupsExpanded(!cleanupsExpanded)}
            >
              <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                <span>🧹</span>
                Predchádzajúce čistenia
                <span className="sm:hidden ml-auto text-gray-400 text-sm">
                  {cleanupsExpanded ? '▲' : '▼'}
                </span>
              </h2>
            </button>

            <div className={`${cleanupsExpanded ? 'max-h-40' : 'max-h-0'} sm:max-h-64 overflow-y-auto transition-all duration-300`}>
              <ul className="divide-y divide-gray-800 pb-2">
                {cleanups
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((cleanup) => (
                    <li
                      key={cleanup.id}
                      className="p-3 sm:p-4 hover:bg-gray-800/50 transition-colors cursor-pointer"
                      onClick={() => setFocusedCleanup(cleanup)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-green-600 rounded-lg flex flex-col items-center justify-center text-white">
                          <span className="text-[10px] sm:text-xs font-medium">
                            {new Date(cleanup.date).toLocaleDateString('sk-SK', { month: 'short' })}
                          </span>
                          <span className="text-base sm:text-lg font-bold leading-none">
                            {new Date(cleanup.date).getDate()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm sm:text-base">
                            {new Date(cleanup.date).toLocaleDateString('sk-SK', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                            })}
                          </p>
                          <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm text-gray-400 mt-1">
                            {cleanup.volunteers && (
                              <span>{cleanup.volunteers} dobrovoľníkov</span>
                            )}
                            {cleanup.volume_litres && (
                              <span className="text-green-400">{cleanup.volume_litres}L odpadu</span>
                            )}
                          </div>
                          {cleanup.notes && (
                            <p className="text-gray-400 text-xs sm:text-sm mt-1 truncate">
                              {cleanup.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        )}

        {/* Upcoming events list - right on desktop */}
        {events.length > 0 && (
          <div className="w-full sm:max-w-sm pointer-events-auto order-1 sm:order-2 sm:ml-auto sm:self-end">
            <EventList
              events={events}
              onEventClick={setFocusedEvent}
              expanded={eventsExpanded}
              onToggle={() => setEventsExpanded(!eventsExpanded)}
            />
          </div>
        )}
      </div>

      {/* Info when no target is set */}
      {!targetGeometry && (
        <div className="absolute bottom-16 sm:bottom-20 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-lg p-3 sm:p-4 text-center z-40">
          <p className="text-gray-400 text-sm sm:text-base">
            Zatiaľ nebola definovaná cieľová oblasť na čistenie.
          </p>
        </div>
      )}

      {/* Sponsor bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800">
        <SponsorBadge />
        <div className="text-center py-1.5 sm:py-2 border-t border-gray-800">
          <span className="text-[10px] sm:text-xs text-gray-500">
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
