import { NextResponse } from 'next/server';
import { getCleanups, getUpcomingEvents, getTargetArea } from '@/lib/db';
import { calculateRemainingArea, type PolygonGeometry } from '@/lib/geo';

export interface Stats {
  percentage: number;
  totalCleanups: number;
  totalVolunteers: number;
  totalVolumeLitres: number;
  nextEvent: {
    date: string;
    time: string;
    note: string | null;
  } | null;
}

export async function GET() {
  try {
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

    // Get next event
    const nextEvent = events.length > 0
      ? {
          date: events[0].date,
          time: events[0].time,
          note: events[0].note,
        }
      : null;

    const stats: Stats = {
      percentage,
      totalCleanups,
      totalVolunteers,
      totalVolumeLitres: Math.round(totalVolumeLitres),
      nextEvent,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
