import { NextRequest, NextResponse } from 'next/server';
import { getCleanup, updateCleanup, deleteCleanup } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const cleanup = getCleanup(parseInt(id, 10));

    if (!cleanup) {
      return NextResponse.json(
        { error: 'Cleanup not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ cleanup });
  } catch (error) {
    console.error('Error fetching cleanup:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cleanup' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const { geometry, date, notes, volunteers, weight_kg, photos } = body;

    const success = updateCleanup(parseInt(id, 10), {
      geometry,
      date,
      notes,
      volunteers,
      weight_kg,
      photos,
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Cleanup not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating cleanup:', error);
    return NextResponse.json(
      { error: 'Failed to update cleanup' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const success = deleteCleanup(parseInt(id, 10));

    if (!success) {
      return NextResponse.json(
        { error: 'Cleanup not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting cleanup:', error);
    return NextResponse.json(
      { error: 'Failed to delete cleanup' },
      { status: 500 }
    );
  }
}
