import { NextRequest, NextResponse } from 'next/server';
import { getCleanups, createCleanup } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function GET() {
  try {
    const cleanups = getCleanups();
    return NextResponse.json({ cleanups });
  } catch (error) {
    console.error('Error fetching cleanups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cleanups' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { geometry, date, notes, volunteers, volume_litres, photos, before_photos } = body;

    if (!geometry || !date) {
      return NextResponse.json(
        { error: 'Geometry and date are required' },
        { status: 400 }
      );
    }

    const id = createCleanup({
      geometry,
      date,
      notes,
      volunteers,
      volume_litres,
      photos,
      before_photos,
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error creating cleanup:', error);
    return NextResponse.json(
      { error: 'Failed to create cleanup' },
      { status: 500 }
    );
  }
}
