'use client';

import { useState } from 'react';
import type { Cleanup } from '@/lib/db';

interface CleanupPopupProps {
  cleanup: Cleanup;
  onClose?: () => void;
}

export default function CleanupPopup({ cleanup, onClose }: CleanupPopupProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const hasPhotos = cleanup.photos && cleanup.photos.length > 0;

  return (
    <div className="bg-gray-900 text-white rounded-lg shadow-xl max-w-sm overflow-hidden">
      {/* Photo carousel */}
      {hasPhotos && (
        <div className="relative">
          <img
            src={`/api/uploads/${cleanup.photos[currentPhotoIndex]}`}
            alt={`Cleanup photo ${currentPhotoIndex + 1}`}
            className="w-full h-48 object-cover"
          />
          {cleanup.photos.length > 1 && (
            <>
              <button
                onClick={() =>
                  setCurrentPhotoIndex((i) =>
                    i === 0 ? cleanup.photos.length - 1 : i - 1
                  )
                }
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center"
              >
                ←
              </button>
              <button
                onClick={() =>
                  setCurrentPhotoIndex((i) =>
                    i === cleanup.photos.length - 1 ? 0 : i + 1
                  )
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center"
              >
                →
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {cleanup.photos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPhotoIndex(index)}
                    className={`w-2 h-2 rounded-full ${
                      index === currentPhotoIndex
                        ? 'bg-white'
                        : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold text-cyan-400">
            {new Date(cleanup.date).toLocaleDateString('sk-SK', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {cleanup.notes && (
          <p className="mt-2 text-gray-300">{cleanup.notes}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          {cleanup.volunteers && (
            <div className="flex items-center gap-1 text-gray-400">
              <span>👥</span>
              <span>{cleanup.volunteers} dobrovoľníkov</span>
            </div>
          )}
          {cleanup.volume_litres && (
            <div className="flex items-center gap-1 text-gray-400">
              <span>🗑️</span>
              <span>{cleanup.volume_litres} L odpadu</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
