'use client';

import { useState } from 'react';
import type { Cleanup } from '@/lib/db';
import PhotoComparison from './PhotoComparison';

interface CleanupPopupProps {
  cleanup: Cleanup;
  onClose?: () => void;
}

export default function CleanupPopup({ cleanup, onClose }: CleanupPopupProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [comparisonIndex, setComparisonIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'comparison' | 'gallery'>('comparison');

  const hasAfterPhotos = cleanup.photos && cleanup.photos.length > 0;
  const hasBeforePhotos = cleanup.before_photos && cleanup.before_photos.length > 0;
  const hasComparison = hasBeforePhotos && hasAfterPhotos;

  // Create comparison pairs (first before with first after, etc.)
  const comparisonPairs = hasComparison
    ? cleanup.before_photos.map((before, i) => ({
        before,
        after: cleanup.photos[i] || cleanup.photos[cleanup.photos.length - 1],
      })).slice(0, Math.min(cleanup.before_photos.length, cleanup.photos.length))
    : [];

  // Combine all photos for gallery view
  const allPhotos = [
    ...(cleanup.before_photos || []).map(p => ({ src: p, type: 'before' })),
    ...(cleanup.photos || []).map(p => ({ src: p, type: 'after' })),
    ...(cleanup.other_photos || []).map(p => ({ src: p, type: 'other' })),
  ];
  const hasAnyPhotos = allPhotos.length > 0;

  const getPhotoLabel = (type: string) => {
    switch (type) {
      case 'before': return 'PRED';
      case 'after': return 'PO';
      default: return '';
    }
  };

  const goToPrevComparison = () => {
    setComparisonIndex((i) => (i === 0 ? comparisonPairs.length - 1 : i - 1));
  };

  const goToNextComparison = () => {
    setComparisonIndex((i) => (i === comparisonPairs.length - 1 ? 0 : i + 1));
  };

  return (
    <div className="bg-gray-900 text-white rounded-lg shadow-xl max-w-sm overflow-hidden">
      {/* Photo section */}
      {(hasComparison || hasAnyPhotos) && (
        <div className="relative">
          {/* View mode toggle when comparison is available */}
          {hasComparison && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex bg-black/70 rounded-full p-1">
              <button
                onClick={() => setViewMode('comparison')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  viewMode === 'comparison'
                    ? 'bg-cyan-600 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Porovnanie
              </button>
              <button
                onClick={() => setViewMode('gallery')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  viewMode === 'gallery'
                    ? 'bg-cyan-600 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Galéria
              </button>
            </div>
          )}

          {/* Comparison view */}
          {hasComparison && viewMode === 'comparison' && comparisonPairs.length > 0 && (
            <div className="relative">
              <PhotoComparison
                beforeSrc={`/api/uploads/${comparisonPairs[comparisonIndex].before}`}
                afterSrc={`/api/uploads/${comparisonPairs[comparisonIndex].after}`}
              />
              {comparisonPairs.length > 1 && (
                <>
                  <button
                    onClick={goToPrevComparison}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors text-xl font-bold z-10"
                  >
                    ‹
                  </button>
                  <button
                    onClick={goToNextComparison}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors text-xl font-bold z-10"
                  >
                    ›
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {comparisonPairs.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setComparisonIndex(index)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === comparisonIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Gallery view (or default when no comparison) - shows all photos */}
          {(!hasComparison || viewMode === 'gallery') && hasAnyPhotos && (
            <>
              <div className="relative">
                <img
                  src={`/api/uploads/${allPhotos[currentPhotoIndex].src}`}
                  alt={`Cleanup photo ${currentPhotoIndex + 1}`}
                  className="w-full h-48 object-contain bg-black"
                />
                {/* Photo type label */}
                {allPhotos[currentPhotoIndex].type !== 'other' && (
                  <div className={`absolute top-2 left-2 px-2 py-1 text-xs font-bold rounded ${
                    allPhotos[currentPhotoIndex].type === 'before'
                      ? 'bg-red-600/80 text-white'
                      : 'bg-green-600/80 text-white'
                  }`}>
                    {getPhotoLabel(allPhotos[currentPhotoIndex].type)}
                  </div>
                )}
              </div>
              {allPhotos.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setCurrentPhotoIndex((i) =>
                        i === 0 ? allPhotos.length - 1 : i - 1
                      )
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center"
                  >
                    ←
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPhotoIndex((i) =>
                        i === allPhotos.length - 1 ? 0 : i + 1
                      )
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center"
                  >
                    →
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {allPhotos.map((_, index) => (
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
