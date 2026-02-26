import { ImageResponse } from 'next/og';
import { getCleanups, getUpcomingEvents, getTargetArea } from '@/lib/db';
import { calculateRemainingArea, type PolygonGeometry } from '@/lib/geo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const alt = 'Čistá Trnávka - Sledovanie čistenia rieky';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  // Fetch stats
  const cleanups = getCleanups();
  const events = getUpcomingEvents();
  const target = getTargetArea();

  // Calculate progress percentage
  let percentage = 0;
  if (target && (target.geometry.type === 'Polygon' || target.geometry.type === 'MultiPolygon')) {
    const cleanupGeometries = cleanups
      .map((c) => c.geometry)
      .filter(
        (g): g is PolygonGeometry =>
          g.type === 'Polygon' || g.type === 'MultiPolygon'
      );

    const progress = calculateRemainingArea(
      target.geometry as PolygonGeometry,
      cleanupGeometries
    );
    percentage = Math.round(progress.percentage * 10) / 10;
  }

  // Aggregate stats
  const totalCleanups = cleanups.length;
  const totalVolunteers = cleanups.reduce(
    (sum, c) => sum + (c.volunteers || 0),
    0
  );
  const totalVolumeLitres = cleanups.reduce(
    (sum, c) => sum + (c.volume_litres || 0),
    0
  );

  // Next event
  const nextEvent = events.length > 0 ? events[0] : null;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0f',
          backgroundImage: 'linear-gradient(to bottom right, #0a0a0f, #1a1a2e)',
        }}
      >
        {/* Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 40,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 'bold',
              color: '#22d3ee',
              marginBottom: 8,
            }}
          >
            Čistá Trnávka
          </div>
          <div
            style={{
              fontSize: 28,
              color: '#9ca3af',
            }}
          >
            Sledovanie čistenia rieky Trnávka v Trnave
          </div>
        </div>

        {/* Progress section */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 40,
          }}
        >
          <div
            style={{
              fontSize: 120,
              fontWeight: 'bold',
              color: '#22d3ee',
              lineHeight: 1,
            }}
          >
            {`${percentage}%`}
          </div>
          <div
            style={{
              fontSize: 24,
              color: '#9ca3af',
              marginTop: 8,
            }}
          >
            vyčistené
          </div>

          {/* Progress bar */}
          <div
            style={{
              display: 'flex',
              width: 400,
              height: 16,
              backgroundColor: '#374151',
              borderRadius: 8,
              marginTop: 20,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, percentage)}%`,
                height: '100%',
                backgroundImage: 'linear-gradient(to right, #06b6d4, #4ade80)',
                borderRadius: 8,
              }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            gap: 60,
            marginBottom: 30,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontSize: 48,
                fontWeight: 'bold',
                color: 'white',
              }}
            >
              {totalCleanups}
            </div>
            <div
              style={{
                fontSize: 20,
                color: '#9ca3af',
              }}
            >
              čistení
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontSize: 48,
                fontWeight: 'bold',
                color: 'white',
              }}
            >
              {totalVolunteers}
            </div>
            <div
              style={{
                fontSize: 20,
                color: '#9ca3af',
              }}
            >
              dobrovoľníkov
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontSize: 48,
                fontWeight: 'bold',
                color: 'white',
              }}
            >
              {`${Math.round(totalVolumeLitres)} L`}
            </div>
            <div
              style={{
                fontSize: 20,
                color: '#9ca3af',
              }}
            >
              odpadu
            </div>
          </div>
        </div>

        {/* Next event */}
        {nextEvent && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#1f2937',
              padding: '16px 32px',
              borderRadius: 12,
            }}
          >
            <div
              style={{
                fontSize: 20,
                color: '#9ca3af',
                marginRight: 12,
              }}
            >
              Najbližšia akcia:
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 'bold',
                color: '#22d3ee',
              }}
            >
              {`${new Date(nextEvent.date).toLocaleDateString('sk-SK', {
                day: 'numeric',
                month: 'long',
              })} o ${nextEvent.time}`}
            </div>
          </div>
        )}
      </div>
    ),
    {
      ...size,
    }
  );
}
