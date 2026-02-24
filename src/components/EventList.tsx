'use client';

import { useCallback } from 'react';
import type { Event } from '@/lib/db';

interface EventListProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
}

export default function EventList({ events, onEventClick }: EventListProps) {
  if (events.length === 0) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('sk-SK', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const shareEvent = useCallback(async (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();

    const shareUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const dateFormatted = new Date(event.date).toLocaleDateString('sk-SK', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const shareText = `Pridaj sa k čisteniu rieky Trnávka! 📅 ${dateFormatted} o ${event.time}${event.note ? ` - ${event.note}` : ''}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Čistá Trnávka - Čistenie',
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        alert('Odkaz skopírovaný!');
      } catch (err) {
        // Fallback: open Twitter share
        const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
        window.open(twitterUrl, '_blank', 'width=600,height=400');
      }
    }
  }, []);

  return (
    <div className="absolute bottom-4 right-4 bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-xl max-w-sm overflow-hidden">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>📅</span>
          Najbližšie čistenia
        </h2>
      </div>

      <div className="max-h-64 overflow-y-auto">
        <ul className="divide-y divide-gray-800">
          {events.map((event) => (
            <li
              key={event.id}
              className={`p-4 hover:bg-gray-800/50 transition-colors ${
                onEventClick ? 'cursor-pointer' : ''
              }`}
              onClick={() => onEventClick?.(event)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-cyan-600 rounded-lg flex flex-col items-center justify-center text-white">
                  <span className="text-xs font-medium">
                    {new Date(event.date).toLocaleDateString('sk-SK', { month: 'short' })}
                  </span>
                  <span className="text-lg font-bold leading-none">
                    {new Date(event.date).getDate()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">
                    {formatDate(event.date)}
                  </p>
                  <p className="text-cyan-400 text-sm">
                    {event.time}
                  </p>
                  {event.note && (
                    <p className="text-gray-400 text-sm mt-1 truncate">
                      {event.note}
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => shareEvent(event, e)}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                  title="Zdieľať udalosť"
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
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
