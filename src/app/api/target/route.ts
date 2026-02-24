import { NextRequest, NextResponse } from 'next/server';
import { getTargetArea, setTargetArea } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function GET() {
  try {
    const target = getTargetArea();
    return NextResponse.json({ target });
  } catch (error) {
    console.error('Error fetching target area:', error);
    return NextResponse.json(
      { error: 'Failed to fetch target area' },
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
    const { geometry } = body;

    if (!geometry) {
      return NextResponse.json(
        { error: 'Geometry is required' },
        { status: 400 }
      );
    }

    const id = setTargetArea(geometry);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error setting target area:', error);
    return NextResponse.json(
      { error: 'Failed to set target area' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  return POST(request);
}
