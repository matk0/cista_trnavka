'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Cleanup } from '@/lib/db';
import { calculateRemainingArea, type PolygonGeometry } from '@/lib/geo';
import type { Geometry } from 'geojson';

interface TargetResponse {
  target: {
    id: number;
    geometry: Geometry;
  } | null;
}

interface CleanupsResponse {
  cleanups: Cleanup[];
}

interface TimelineItem {
  type: 'cleanup' | 'milestone';
  date: string;
  cleanup?: Cleanup;
  milestone?: {
    title: string;
    description: string;
    icon: string;
  };
}

export default function HistoriaPage() {
  const [cleanups, setCleanups] = useState<Cleanup[]>([]);
  const [targetGeometry, setTargetGeometry] = useState<Geometry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [cleanupsRes, targetRes] = await Promise.all([
          fetch('/api/cleanups'),
          fetch('/api/target'),
        ]);

        if (cleanupsRes.ok) {
          const data: CleanupsResponse = await cleanupsRes.json();
          setCleanups(data.cleanups || []);
        }

        if (targetRes.ok) {
          const data: TargetResponse = await targetRes.json();
          setTargetGeometry(data.target?.geometry || null);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Sort cleanups by date (oldest first for timeline)
  const sortedCleanups = [...cleanups].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate running totals and milestones
  const totalVolunteers = cleanups.reduce((sum, c) => sum + (c.volunteers || 0), 0);
  const totalVolumeLitres = cleanups.reduce((sum, c) => sum + (c.volume_litres || 0), 0);

  // Calculate progress
  const cleanupGeometries = cleanups
    .map((c) => c.geometry)
    .filter((g): g is PolygonGeometry => g.type === 'Polygon' || g.type === 'MultiPolygon');

  const progress =
    targetGeometry && (targetGeometry.type === 'Polygon' || targetGeometry.type === 'MultiPolygon')
      ? calculateRemainingArea(targetGeometry as PolygonGeometry, cleanupGeometries)
      : null;

  // Build timeline with milestones
  const timelineItems: TimelineItem[] = [];
  let runningVolume = 0;
  let runningVolunteers = 0;
  let addedMilestones = new Set<string>();

  sortedCleanups.forEach((cleanup, index) => {
    // Add the cleanup
    timelineItems.push({
      type: 'cleanup',
      date: cleanup.date,
      cleanup,
    });

    runningVolume += cleanup.volume_litres || 0;
    runningVolunteers += cleanup.volunteers || 0;

    // Check for milestones after this cleanup
    if (index === 0 && !addedMilestones.has('first')) {
      timelineItems.push({
        type: 'milestone',
        date: cleanup.date,
        milestone: {
          title: 'Prvé čistenie',
          description: 'Začiatok projektu Čistá Trnávka',
          icon: '🎉',
        },
      });
      addedMilestones.add('first');
    }

    if (runningVolume >= 500 && !addedMilestones.has('500L')) {
      timelineItems.push({
        type: 'milestone',
        date: cleanup.date,
        milestone: {
          title: '500 litrov odpadu',
          description: 'Vyzbierali sme pol kubíka odpadu!',
          icon: '🗑️',
        },
      });
      addedMilestones.add('500L');
    }

    if (runningVolume >= 1000 && !addedMilestones.has('1000L')) {
      timelineItems.push({
        type: 'milestone',
        date: cleanup.date,
        milestone: {
          title: '1000 litrov odpadu',
          description: 'Celý kubík odpadu z prírody!',
          icon: '🏆',
        },
      });
      addedMilestones.add('1000L');
    }

    if (runningVolunteers >= 10 && !addedMilestones.has('10volunteers')) {
      timelineItems.push({
        type: 'milestone',
        date: cleanup.date,
        milestone: {
          title: '10 dobrovoľníkov',
          description: 'Komunita rastie!',
          icon: '👥',
        },
      });
      addedMilestones.add('10volunteers');
    }

    if (runningVolunteers >= 50 && !addedMilestones.has('50volunteers')) {
      timelineItems.push({
        type: 'milestone',
        date: cleanup.date,
        milestone: {
          title: '50 dobrovoľníkov',
          description: 'Polstoročie pomocníkov!',
          icon: '🌟',
        },
      });
      addedMilestones.add('50volunteers');
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400 text-lg">Načítavam...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-cyan-400 hover:text-cyan-300 transition-colors">
            ← Späť na mapu
          </Link>
          <h1 className="text-xl font-bold">História projektu</h1>
          <div className="w-24" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Stats summary */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-cyan-400">{cleanups.length}</div>
            <div className="text-sm text-gray-400">čistení</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-400">{totalVolunteers}</div>
            <div className="text-sm text-gray-400">dobrovoľníkov</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-amber-400">{totalVolumeLitres.toLocaleString('sk-SK')}L</div>
            <div className="text-sm text-gray-400">odpadu</div>
          </div>
          {progress && (
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-400">
                {Math.round(progress.percentage * 10) / 10}%
              </div>
              <div className="text-sm text-gray-400">vyčistené</div>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-0.5 bg-gray-700 -translate-x-1/2" />

          {timelineItems.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              Zatiaľ žiadne čistenia. Pridajte sa k nám!
            </div>
          ) : (
            <div className="space-y-8">
              {timelineItems.map((item, index) => (
                <div
                  key={`${item.type}-${index}`}
                  className={`relative flex items-start gap-4 sm:gap-8 ${
                    index % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'
                  }`}
                >
                  {/* Timeline dot */}
                  <div className="absolute left-4 sm:left-1/2 w-4 h-4 rounded-full -translate-x-1/2 z-10 border-2 border-gray-900"
                    style={{
                      backgroundColor: item.type === 'milestone' ? '#f59e0b' : '#06b6d4',
                    }}
                  />

                  {/* Content */}
                  <div className={`ml-10 sm:ml-0 sm:w-1/2 ${index % 2 === 0 ? 'sm:pr-12 sm:text-right' : 'sm:pl-12'}`}>
                    {item.type === 'milestone' && item.milestone && (
                      <div className="bg-amber-900/30 border border-amber-600/50 rounded-lg p-4">
                        <div className="text-2xl mb-1">{item.milestone.icon}</div>
                        <div className="font-bold text-amber-400">{item.milestone.title}</div>
                        <div className="text-sm text-gray-400">{item.milestone.description}</div>
                      </div>
                    )}

                    {item.type === 'cleanup' && item.cleanup && (
                      <div className="bg-gray-800 rounded-lg overflow-hidden">
                        {/* Photo */}
                        {(item.cleanup.photos?.[0] || item.cleanup.before_photos?.[0]) && (
                          <img
                            src={`/api/uploads/${item.cleanup.photos?.[0] || item.cleanup.before_photos?.[0]}`}
                            alt="Čistenie"
                            className="w-full h-48 object-cover"
                          />
                        )}

                        <div className="p-4">
                          <div className="text-lg font-semibold text-cyan-400">
                            {new Date(item.cleanup.date).toLocaleDateString('sk-SK', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </div>

                          {item.cleanup.notes && (
                            <p className="text-gray-300 mt-2 text-sm">{item.cleanup.notes}</p>
                          )}

                          <div className="flex flex-wrap gap-3 mt-3 text-sm">
                            {item.cleanup.volunteers && (
                              <span className="text-gray-400">
                                👥 {item.cleanup.volunteers} dobrovoľníkov
                              </span>
                            )}
                            {item.cleanup.volume_litres && (
                              <span className="text-green-400">
                                🗑️ {item.cleanup.volume_litres}L odpadu
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Spacer for alternating layout on desktop */}
                  <div className="hidden sm:block sm:w-1/2" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-400 mb-4">Chcete sa pridať?</p>
          <Link
            href="/"
            className="inline-block bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Pozrite si najbližšie čistenia
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-16 py-6 text-center text-sm text-gray-500">
        Created with ❤️ by{' '}
        <a
          href="https://matejlukasik.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          Matej Lukášik
        </a>
      </footer>
    </div>
  );
}
