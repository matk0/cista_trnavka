'use client';

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
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
