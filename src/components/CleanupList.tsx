'use client';

import { useState } from 'react';
import type { Cleanup } from '@/lib/db';

interface CleanupListProps {
  cleanups: Cleanup[];
  onEdit: (cleanup: Cleanup) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
}

export default function CleanupList({
  cleanups,
  onEdit,
  onDelete,
  onClose,
}: CleanupListProps) {
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const handleDelete = (id: number) => {
    if (confirmDelete === id) {
      onDelete(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
    }
  };

  return (
    <div className="absolute top-16 right-4 w-80 max-h-[calc(100vh-8rem)] bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-xl overflow-hidden">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white">
          Čistenia ({cleanups.length})
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="overflow-y-auto max-h-[calc(100vh-12rem)]">
        {cleanups.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            Zatiaľ žiadne čistenia
          </div>
        ) : (
          <ul className="divide-y divide-gray-800">
            {cleanups.map((cleanup) => (
              <li key={cleanup.id} className="p-4 hover:bg-gray-800/50">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-cyan-400">
                      {new Date(cleanup.date).toLocaleDateString('sk-SK', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    {cleanup.notes && (
                      <p className="text-sm text-gray-400 truncate mt-1">
                        {cleanup.notes}
                      </p>
                    )}
                    <div className="flex gap-3 mt-2 text-xs text-gray-500">
                      {cleanup.volunteers && (
                        <span>{cleanup.volunteers} dobrovoľníkov</span>
                      )}
                      {cleanup.weight_kg && (
                        <span>{cleanup.weight_kg} kg</span>
                      )}
                      {cleanup.photos.length > 0 && (
                        <span>{cleanup.photos.length} fotiek</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1 ml-2">
                    {confirmDelete === cleanup.id ? (
                      <>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                        >
                          Nie
                        </button>
                        <button
                          onClick={() => handleDelete(cleanup.id)}
                          className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                        >
                          Áno, zmazať
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => onEdit(cleanup)}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                          title="Upraviť"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => setConfirmDelete(cleanup.id)}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
                          title="Odstrániť"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
