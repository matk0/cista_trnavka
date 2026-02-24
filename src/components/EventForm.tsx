'use client';

import { useState } from 'react';
import type { Event } from '@/lib/db';

interface EventFormProps {
  event?: Event | null;
  onSubmit: (data: {
    date: string;
    time: string;
    note?: string;
  }) => void;
  onCancel: () => void;
}

export default function EventForm({ event, onSubmit, onCancel }: EventFormProps) {
  const [date, setDate] = useState(
    event?.date || new Date().toISOString().split('T')[0]
  );
  const [time, setTime] = useState(event?.time || '09:00');
  const [note, setNote] = useState(event?.note || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      date,
      time,
      note: note || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-bold text-cyan-400 mb-4">
            {event ? 'Upraviť udalosť' : 'Nová udalosť'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date */}
            <div>
              <label
                htmlFor="event-date"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Dátum *
              </label>
              <input
                type="date"
                id="event-date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Time */}
            <div>
              <label
                htmlFor="event-time"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Čas *
              </label>
              <input
                type="time"
                id="event-time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Note */}
            <div>
              <label
                htmlFor="event-note"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Poznámka
              </label>
              <textarea
                id="event-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Miesto stretnutia, čo si priniesť..."
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Zrušiť
              </button>
              <button
                type="submit"
                className="flex-1 py-2 px-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
              >
                {event ? 'Uložiť' : 'Vytvoriť'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
