'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { Map as MapboxMap } from 'mapbox-gl';
import type { Geometry } from 'geojson';
import type { Cleanup } from '@/lib/db';
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

interface TargetResponse {
  target: {
    id: number;
    geometry: Geometry;
  } | null;
}

interface CleanupsResponse {
  cleanups: Cleanup[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const mapRef = useRef<MapboxMap | null>(null);

  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [targetGeometry, setTargetGeometry] = useState<Geometry | null>(null);
  const [cleanups, setCleanups] = useState<Cleanup[]>([]);
  const [drawMode, setDrawMode] = useState<DrawMode>('none');
  const [showCleanupForm, setShowCleanupForm] = useState(false);
  const [pendingCleanupGeometry, setPendingCleanupGeometry] =
    useState<Geometry | null>(null);
  const [showCleanupList, setShowCleanupList] = useState(false);
  const [editingCleanup, setEditingCleanup] = useState<Cleanup | null>(null);

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
        const [targetRes, cleanupsRes] = await Promise.all([
          fetch('/api/target'),
          fetch('/api/cleanups'),
        ]);

        const targetData: TargetResponse = await targetRes.json();
        const cleanupsData: CleanupsResponse = await cleanupsRes.json();

        setTargetGeometry(targetData.target?.geometry || null);
        setCleanups(cleanupsData.cleanups || []);
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
      }
    },
    [drawMode]
  );

  // Handle cleanup form submit
  const handleCleanupSubmit = async (data: {
    date: string;
    notes?: string;
    volunteers?: number;
    weight_kg?: number;
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

  // Handle cleanup edit
  const handleCleanupEdit = (cleanup: Cleanup) => {
    setEditingCleanup(cleanup);
    setShowCleanupForm(true);
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
        targetGeometry={targetGeometry}
        cleanups={cleanups}
        onMapLoad={handleMapLoad}
        interactive={drawMode === 'none'}
      />

      {/* Drawing tools */}
      <DrawingTools
        map={mapRef.current}
        mode={drawMode}
        onDrawComplete={handleDrawComplete}
        onDrawCancel={() => setDrawMode('none')}
      />

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
      {drawMode === 'none' && !showCleanupForm && (
        <div className="absolute bottom-4 left-4 flex gap-2">
          <button
            onClick={() => setDrawMode('target')}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-lg"
          >
            {targetGeometry ? 'Zmeniť cieľ' : 'Nastaviť cieľ'}
          </button>
          <button
            onClick={() => setDrawMode('cleanup')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-lg"
            disabled={!targetGeometry}
          >
            Pridať čistenie
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

      {/* Cleanup list */}
      {showCleanupList && (
        <CleanupList
          cleanups={cleanups}
          onEdit={handleCleanupEdit}
          onDelete={handleCleanupDelete}
          onClose={() => setShowCleanupList(false)}
        />
      )}
    </div>
  );
}
