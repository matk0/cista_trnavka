'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import type { Event } from '@/lib/db';

interface EventListProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
  expanded?: boolean;
  onToggle?: () => void;
}

export default function EventList({ events, onEventClick, expanded = false, onToggle }: EventListProps) {
  const [openShareId, setOpenShareId] = useState<number | null>(null);
  const [copiedEventId, setCopiedEventId] = useState<number | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (events.length === 0) {
    return null;
  }

  const openShareDropdown = (eventId: number, buttonEl: HTMLButtonElement) => {
    if (openShareId === eventId) {
      setOpenShareId(null);
      setDropdownPos(null);
      return;
    }

    const containerRect = containerRef.current?.getBoundingClientRect();
    const buttonRect = buttonEl.getBoundingClientRect();

    if (containerRect) {
      setDropdownPos({
        top: buttonRect.top - containerRect.top - 8,
        right: containerRect.right - buttonRect.right,
      });
    }
    setOpenShareId(eventId);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const formatted = date.toLocaleDateString('sk-SK', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    // Capitalize first letter of day name
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const getSignUpMessage = (event: Event) => {
    const dateFormatted = formatDate(event.date);
    return `Ahoj, hlásim sa na čistenie ${dateFormatted} o ${event.time}. Ďakujem!`;
  };

  const getShareData = (event: Event) => {
    const shareUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const dateFormatted = new Date(event.date).toLocaleDateString('sk-SK', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const shareText = `Pridaj sa k čisteniu rieky Trnávka! 📅 ${dateFormatted} o ${event.time}${event.note ? ` - ${event.note}` : ''}`;
    return { shareUrl, shareText };
  };

  const handleCopyLink = useCallback(async (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    const { shareUrl, shareText } = getShareData(event);
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setCopiedEventId(event.id);
      setTimeout(() => setCopiedEventId(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
    setOpenShareId(null);
  }, []);

  const shareToFacebook = useCallback((event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    const { shareUrl } = getShareData(event);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'width=600,height=400');
    setOpenShareId(null);
  }, []);

  const shareToTwitter = useCallback((event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    const { shareUrl, shareText } = getShareData(event);
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank', 'width=600,height=400');
    setOpenShareId(null);
  }, []);

  const shareToWhatsApp = useCallback((event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    const { shareUrl, shareText } = getShareData(event);
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
    setOpenShareId(null);
  }, []);

  return (
    <>
      {/* Click outside to close share dropdown */}
      {openShareId !== null && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpenShareId(null)}
        />
      )}
      <div ref={containerRef} className="bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-xl w-full">
      <button
        className="w-full p-3 sm:p-4 border-b border-gray-800 sm:cursor-default"
        onClick={onToggle}
      >
        <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
          <span>📅</span>
          Najbližšie čistenia
          <span className="sm:hidden ml-auto text-gray-400 text-sm">
            {expanded ? '▲' : '▼'}
          </span>
        </h2>
      </button>

      <div className={`${expanded ? 'max-h-40' : 'max-h-0'} sm:max-h-64 overflow-y-auto transition-all duration-300`}>
        <ul className="divide-y divide-gray-800">
          {events.map((event) => (
            <li
              key={event.id}
              className={`p-3 sm:p-4 hover:bg-gray-800/50 transition-colors ${
                onEventClick ? 'cursor-pointer' : ''
              }`}
              onClick={() => onEventClick?.(event)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-cyan-600 rounded-lg flex flex-col items-center justify-center text-white">
                  <span className="text-[10px] sm:text-xs font-medium">
                    {new Date(event.date).toLocaleDateString('sk-SK', { month: 'short' })}
                  </span>
                  <span className="text-base sm:text-lg font-bold leading-none">
                    {new Date(event.date).getDate()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm sm:text-base">
                    {formatDate(event.date)}
                  </p>
                  <p className="text-cyan-400 text-xs sm:text-sm">
                    {event.time}
                  </p>
                  {event.note && (
                    <p className="text-gray-400 text-xs sm:text-sm mt-1 truncate">
                      {event.note}
                    </p>
                  )}
                  {event.meeting_point && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${event.meeting_point.coordinates[1]},${event.meeting_point.coordinates[0]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-amber-500 hover:text-amber-400 text-xs sm:text-sm mt-1.5 transition-colors"
                    >
                      <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Navigovať
                    </a>
                  )}
                  {/* Sign up button */}
                  <div className="mt-2 flex justify-end">
                    <a
                      href={`https://wa.me/421944302185?text=${encodeURIComponent(getSignUpMessage(event))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-md transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      Nahlásiť sa
                    </a>
                  </div>
                </div>
                <div className="relative flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openShareDropdown(event.id, e.currentTarget);
                    }}
                    className={`p-2 rounded-lg transition-colors ${
                      copiedEventId === event.id
                        ? 'text-green-400 bg-green-900/30'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                    title={copiedEventId === event.id ? 'Skopírované!' : 'Zdieľať udalosť'}
                  >
                    {copiedEventId === event.id ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                        />
                      </svg>
                    )}
                  </button>

                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Share dropdown - rendered outside scrollable area */}
      {openShareId !== null && dropdownPos && (() => {
        const event = events.find(e => e.id === openShareId);
        if (!event) return null;
        return (
          <div
            className="absolute bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg p-2 min-w-[160px] z-[100]"
            style={{
              top: dropdownPos.top,
              right: dropdownPos.right,
              transform: 'translateY(-100%)',
            }}
          >
            <button
              onClick={(e) => shareToFacebook(event, e)}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-md transition-colors"
            >
              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </button>
            <button
              onClick={(e) => shareToTwitter(event, e)}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-md transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              X (Twitter)
            </button>
            <button
              onClick={(e) => shareToWhatsApp(event, e)}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-md transition-colors"
            >
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </button>
            <hr className="my-1 border-gray-700" />
            <button
              onClick={(e) => handleCopyLink(event, e)}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-md transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Kopírovať odkaz
            </button>
          </div>
        );
      })()}
    </div>
    </>
  );
}
