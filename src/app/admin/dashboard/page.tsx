'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { Map as MapboxMap } from 'mapbox-gl';
import type { Geometry } from 'geojson';
import type { Cleanup, Event } from '@/lib/db';
import type { DrawMode } from '@/components/DrawingTools';

// Dynamic imports to avoid SSR issues
const Map = dynamic(() => import('@/components/Map'), { ssr: false });
const DrawingTools = dynamic(() => import('@/components/DrawingTools'), {
  ssr: false,
});
const CleanupForm = dynamic(() => import('@/components/CleanupForm'), {
  ssr: false,
});
const CleanupList = dynamic(() => import('@/components/CleanupList'), {
  ssr: false,
});
const EventForm = dynamic(() => import('@/components/EventForm'), {
  ssr: false,
});
const PolygonEditor = dynamic(() => import('@/components/PolygonEditor'), {
  ssr: false,
});
const MeetingPointPicker = dynamic(() => import('@/components/MeetingPointPicker'), {
  ssr: false,
});

interface TargetResponse {
  target: {
    id: number;
    geometry: Geometry;
  } | null;
}

interface CleanupsResponse {
  cleanups: Cleanup[];
}

interface EventsResponse {
  events: Event[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const mapRef = useRef<MapboxMap | null>(null);

  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [targetGeometry, setTargetGeometry] = useState<Geometry | null>(null);
  const [cleanups, setCleanups] = useState<Cleanup[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [drawMode, setDrawMode] = useState<DrawMode>('none');
  const [showCleanupForm, setShowCleanupForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [pendingCleanupGeometry, setPendingCleanupGeometry] =
    useState<Geometry | null>(null);
  const [pendingEventGeometry, setPendingEventGeometry] =
    useState<Geometry | null>(null);
  const [pendingMeetingPoint, setPendingMeetingPoint] =
    useState<GeoJSON.Point | null>(null);
  const [showMeetingPointPicker, setShowMeetingPointPicker] = useState(false);
  const [showCleanupList, setShowCleanupList] = useState(false);
  const [editingCleanup, setEditingCleanup] = useState<Cleanup | null>(null);
  const [editingCleanupGeometry, setEditingCleanupGeometry] = useState<Cleanup | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingEventGeometry, setEditingEventGeometry] = useState<Event | null>(null);
  const [editingEventMeetingPoint, setEditingEventMeetingPoint] = useState<Event | null>(null);

  // Check authentication
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth');
        const data = await res.json();
        if (!data.authenticated) {
          router.push('/admin');
          return;
        }
        setAuthenticated(true);
      } catch {
        router.push('/admin');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  // Fetch data
  useEffect(() => {
    if (!authenticated) return;

    async function fetchData() {
      try {
        const [targetRes, cleanupsRes, eventsRes] = await Promise.all([
          fetch('/api/target'),
          fetch('/api/cleanups'),
          fetch('/api/events'),
        ]);

        const targetData: TargetResponse = await targetRes.json();
        const cleanupsData: CleanupsResponse = await cleanupsRes.json();
        const eventsData: EventsResponse = await eventsRes.json();

        setTargetGeometry(targetData.target?.geometry || null);
        setCleanups(cleanupsData.cleanups || []);
        setEvents(eventsData.events || []);
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    }
    fetchData();
  }, [authenticated]);

  // Handle map load
  const handleMapLoad = useCallback((map: MapboxMap) => {
    mapRef.current = map;
  }, []);

  // Handle logout
  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/admin');
  };

  // Handle drawing complete
  const handleDrawComplete = useCallback(
    async (geometry: Geometry) => {
      if (drawMode === 'target') {
        // Save target area
        try {
          const res = await fetch('/api/target', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ geometry }),
          });
          if (res.ok) {
            setTargetGeometry(geometry);
          }
        } catch (err) {
          console.error('Error saving target:', err);
        }
        setDrawMode('none');
      } else if (drawMode === 'cleanup') {
        // Show cleanup form
        setPendingCleanupGeometry(geometry);
        setShowCleanupForm(true);
        setDrawMode('none');
      } else if (drawMode === 'event') {
        // Show meeting point picker first
        setPendingEventGeometry(geometry);
        setShowMeetingPointPicker(true);
        setDrawMode('none');
      }
    },
    [drawMode]
  );

  // Handle cleanup form submit
  const handleCleanupSubmit = async (data: {
    date: string;
    notes?: string;
    volunteers?: number;
    volume_litres?: number;
    photos?: string[];
  }) => {
    if (!pendingCleanupGeometry && !editingCleanup) return;

    try {
      if (editingCleanup) {
        // Update existing cleanup
        const res = await fetch(`/api/cleanups/${editingCleanup.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          // Refresh cleanups
          const cleanupsRes = await fetch('/api/cleanups');
          const cleanupsData: CleanupsResponse = await cleanupsRes.json();
          setCleanups(cleanupsData.cleanups || []);
        }
      } else {
        // Create new cleanup
        const res = await fetch('/api/cleanups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            geometry: pendingCleanupGeometry,
            ...data,
          }),
        });
        if (res.ok) {
          // Refresh cleanups
          const cleanupsRes = await fetch('/api/cleanups');
          const cleanupsData: CleanupsResponse = await cleanupsRes.json();
          setCleanups(cleanupsData.cleanups || []);
        }
      }
    } catch (err) {
      console.error('Error saving cleanup:', err);
    }

    setShowCleanupForm(false);
    setPendingCleanupGeometry(null);
    setEditingCleanup(null);
  };

  // Handle meeting point selection complete
  const handleMeetingPointComplete = async (point: GeoJSON.Point) => {
    if (editingEventMeetingPoint) {
      // Update existing event's meeting point
      try {
        const res = await fetch('/api/events', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingEventMeetingPoint.id,
            meeting_point: point,
          }),
        });
        if (res.ok) {
          const eventsRes = await fetch('/api/events');
          const eventsData: EventsResponse = await eventsRes.json();
          setEvents(eventsData.events || []);
        }
      } catch (err) {
        console.error('Error saving meeting point:', err);
      }
      setEditingEventMeetingPoint(null);
      setShowMeetingPointPicker(false);
    } else {
      // New event - continue to form
      setPendingMeetingPoint(point);
      setShowMeetingPointPicker(false);
      setShowEventForm(true);
    }
  };

  // Handle event form submit
  const handleEventSubmit = async (data: {
    date: string;
    time: string;
    note?: string;
  }) => {
    if (!pendingEventGeometry && !editingEvent) return;

    try {
      if (editingEvent) {
        // Update existing event
        const res = await fetch('/api/events', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingEvent.id,
            ...data,
          }),
        });
        if (res.ok) {
          // Refresh events
          const eventsRes = await fetch('/api/events');
          const eventsData: EventsResponse = await eventsRes.json();
          setEvents(eventsData.events || []);
        }
      } else {
        // Create new event with meeting point
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            geometry: pendingEventGeometry,
            meeting_point: pendingMeetingPoint,
            ...data,
          }),
        });
        if (res.ok) {
          // Refresh events
          const eventsRes = await fetch('/api/events');
          const eventsData: EventsResponse = await eventsRes.json();
          setEvents(eventsData.events || []);
        }
      }
    } catch (err) {
      console.error('Error saving event:', err);
    }

    setShowEventForm(false);
    setPendingEventGeometry(null);
    setPendingMeetingPoint(null);
    setEditingEvent(null);
  };

  // Handle cleanup delete
  const handleCleanupDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/cleanups/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCleanups(cleanups.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error('Error deleting cleanup:', err);
    }
  };

  // Handle event delete
  const handleEventDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/events?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEvents(events.filter((e) => e.id !== id));
      }
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  // Handle cleanup edit
  const handleCleanupEdit = (cleanup: Cleanup) => {
    setEditingCleanup(cleanup);
    setShowCleanupForm(true);
  };

  // Handle event edit
  const handleEventEdit = (event: Event) => {
    setEditingEvent(event);
    setShowEventForm(true);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-950">
        <div className="text-gray-400">Načítavam...</div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div className="h-screen w-screen relative">
      {/* Map */}
      <Map
        targetGeometry={drawMode === 'edit-target' ? null : targetGeometry}
        cleanups={drawMode === 'edit-cleanup' ? cleanups.filter(c => c.id !== editingCleanupGeometry?.id) : cleanups}
        events={drawMode === 'edit-event' ? events.filter(e => e.id !== editingEventGeometry?.id) : events}
        onMapLoad={handleMapLoad}
        interactive={drawMode === 'none'}
      />

      {/* Drawing tools */}
      {drawMode !== 'edit-target' && drawMode !== 'edit-cleanup' && drawMode !== 'edit-event' && (
        <DrawingTools
          map={mapRef.current}
          mode={drawMode}
          onDrawComplete={handleDrawComplete}
          onDrawCancel={() => setDrawMode('none')}
        />
      )}

      {/* Polygon editor for target area */}
      {drawMode === 'edit-target' && (
        <PolygonEditor
          map={mapRef.current}
          geometry={targetGeometry}
          color="#ff003c"
          title="Upraviť cieľovú oblasť"
          onSave={async (geometry) => {
            try {
              const res = await fetch('/api/target', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ geometry }),
              });
              if (res.ok) {
                setTargetGeometry(geometry);
              }
            } catch (err) {
              console.error('Error saving target:', err);
            }
            setDrawMode('none');
          }}
          onCancel={() => setDrawMode('none')}
        />
      )}

      {/* Polygon editor for cleanup area */}
      {drawMode === 'edit-cleanup' && editingCleanupGeometry && (
        <PolygonEditor
          map={mapRef.current}
          geometry={editingCleanupGeometry.geometry}
          color="#00ff8c"
          title="Upraviť vyčistenú oblasť"
          onSave={async (geometry) => {
            try {
              const res = await fetch(`/api/cleanups/${editingCleanupGeometry.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ geometry }),
              });
              if (res.ok) {
                // Refresh cleanups
                const cleanupsRes = await fetch('/api/cleanups');
                const cleanupsData: CleanupsResponse = await cleanupsRes.json();
                setCleanups(cleanupsData.cleanups || []);
              }
            } catch (err) {
              console.error('Error saving cleanup geometry:', err);
            }
            setEditingCleanupGeometry(null);
            setDrawMode('none');
          }}
          onCancel={() => {
            setEditingCleanupGeometry(null);
            setDrawMode('none');
          }}
        />
      )}

      {/* Polygon editor for event area */}
      {drawMode === 'edit-event' && editingEventGeometry && (
        <PolygonEditor
          map={mapRef.current}
          geometry={editingEventGeometry.geometry}
          color="#ffc800"
          title="Upraviť oblasť udalosti"
          onSave={async (geometry) => {
            try {
              const res = await fetch('/api/events', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingEventGeometry.id, geometry }),
              });
              if (res.ok) {
                // Refresh events
                const eventsRes = await fetch('/api/events');
                const eventsData: EventsResponse = await eventsRes.json();
                setEvents(eventsData.events || []);
              }
            } catch (err) {
              console.error('Error saving event geometry:', err);
            }
            setEditingEventGeometry(null);
            setDrawMode('none');
          }}
          onCancel={() => {
            setEditingEventGeometry(null);
            setDrawMode('none');
          }}
        />
      )}

      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
        <div className="bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-lg px-4 py-3 pointer-events-auto">
          <h1 className="text-xl font-bold text-cyan-400">Admin Dashboard</h1>
        </div>

        <div className="flex gap-2 pointer-events-auto">
          <button
            onClick={() => setShowCleanupList(!showCleanupList)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            {showCleanupList ? 'Skryť zoznam' : 'Zoznam čistení'}
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Odhlásiť
          </button>
        </div>
      </div>

      {/* Mode buttons */}
      {drawMode === 'none' && !showCleanupForm && !showEventForm && !showMeetingPointPicker && (
        <div className="absolute bottom-4 left-4 flex gap-2">
          <button
            onClick={() => setDrawMode('target')}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-lg"
          >
            {targetGeometry ? 'Nakresliť nový cieľ' : 'Nastaviť cieľ'}
          </button>
          {targetGeometry && (
            <button
              onClick={() => setDrawMode('edit-target')}
              className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white rounded-lg transition-colors shadow-lg"
            >
              Upraviť cieľ
            </button>
          )}
          <button
            onClick={() => setDrawMode('cleanup')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-lg"
            disabled={!targetGeometry}
          >
            Pridať čistenie
          </button>
          <button
            onClick={() => setDrawMode('event')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors shadow-lg"
          >
            Pridať udalosť
          </button>
        </div>
      )}

      {/* Back to public view */}
      <a
        href="/"
        className="absolute bottom-4 right-4 bg-gray-800/80 hover:bg-gray-700/80 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        Verejný pohľad
      </a>

      {/* Cleanup form */}
      {showCleanupForm && (
        <CleanupForm
          cleanup={editingCleanup}
          onSubmit={handleCleanupSubmit}
          onCancel={() => {
            setShowCleanupForm(false);
            setPendingCleanupGeometry(null);
            setEditingCleanup(null);
          }}
        />
      )}

      {/* Meeting point picker */}
      {showMeetingPointPicker && (
        <MeetingPointPicker
          map={mapRef.current}
          initialPoint={editingEventMeetingPoint?.meeting_point}
          onComplete={handleMeetingPointComplete}
          onCancel={() => {
            setShowMeetingPointPicker(false);
            setPendingEventGeometry(null);
            setEditingEventMeetingPoint(null);
          }}
        />
      )}

      {/* Event form */}
      {showEventForm && (
        <EventForm
          event={editingEvent}
          onSubmit={handleEventSubmit}
          onCancel={() => {
            setShowEventForm(false);
            setPendingEventGeometry(null);
            setPendingMeetingPoint(null);
            setEditingEvent(null);
          }}
        />
      )}

      {/* Cleanup list */}
      {showCleanupList && (
        <CleanupList
          cleanups={cleanups}
          onEdit={handleCleanupEdit}
          onEditGeometry={(cleanup) => {
            setEditingCleanupGeometry(cleanup);
            setDrawMode('edit-cleanup');
            setShowCleanupList(false);
          }}
          onDelete={handleCleanupDelete}
          onClose={() => setShowCleanupList(false)}
        />
      )}

      {/* Events list */}
      {events.length > 0 && drawMode === 'none' && !showCleanupForm && !showEventForm && !showCleanupList && !showMeetingPointPicker && (
        <div className="absolute top-20 right-4 bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-xl w-72 overflow-hidden">
          <div className="p-3 border-b border-gray-800 flex justify-between items-center">
            <h3 className="font-semibold text-white">Plánované udalosti</h3>
          </div>
          <ul className="divide-y divide-gray-800 max-h-48 overflow-y-auto">
            {events.map((event) => (
              <li key={event.id} className="p-3 flex justify-between items-center">
                <div className="flex-1 min-w-0">
                  <p className="text-cyan-400 font-medium">
                    {new Date(event.date).toLocaleDateString('sk-SK')} {event.time}
                  </p>
                  {event.note && (
                    <p className="text-gray-400 text-sm truncate max-w-[140px]">{event.note}</p>
                  )}
                </div>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => {
                      setEditingEventGeometry(event);
                      setDrawMode('edit-event');
                    }}
                    className="text-gray-500 hover:text-amber-400 p-1"
                    title="Upraviť oblasť"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      setEditingEventMeetingPoint(event);
                      setShowMeetingPointPicker(true);
                    }}
                    className={`p-1 ${event.meeting_point ? 'text-amber-500 hover:text-amber-400' : 'text-gray-500 hover:text-amber-400'}`}
                    title={event.meeting_point ? 'Upraviť miesto stretnutia' : 'Pridať miesto stretnutia'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleEventEdit(event)}
                    className="text-gray-500 hover:text-white p-1"
                    title="Upraviť"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleEventDelete(event.id)}
                    className="text-gray-500 hover:text-red-400 p-1"
                    title="Odstrániť"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
