'use client';

import { useState, useRef } from 'react';
import type { Cleanup } from '@/lib/db';

interface CleanupFormProps {
  cleanup?: Cleanup | null;
  onSubmit: (data: {
    date: string;
    notes?: string;
    volunteers?: number;
    volume_litres?: number;
    photos?: string[];
  }) => void;
  onCancel: () => void;
}

export default function CleanupForm({
  cleanup,
  onSubmit,
  onCancel,
}: CleanupFormProps) {
  const [date, setDate] = useState(
    cleanup?.date || new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState(cleanup?.notes || '');
  const [volunteers, setVolunteers] = useState(
    cleanup?.volunteers?.toString() || ''
  );
  const [volumeLitres, setVolumeLitres] = useState(
    cleanup?.volume_litres?.toString() || ''
  );
  const [photos, setPhotos] = useState<string[]>(cleanup?.photos || []);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) throw new Error('Upload failed');

        const data = await res.json();
        return data.filename;
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      setPhotos([...photos, ...uploadedFiles]);
    } catch (err) {
      console.error('Error uploading files:', err);
      alert('Nepodarilo sa nahrať súbory');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      date,
      notes: notes || undefined,
      volunteers: volunteers ? parseInt(volunteers, 10) : undefined,
      volume_litres: volumeLitres ? parseFloat(volumeLitres) : undefined,
      photos: photos.length > 0 ? photos : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-cyan-400 mb-4">
            {cleanup ? 'Upraviť čistenie' : 'Nové čistenie'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date */}
            <div>
              <label
                htmlFor="date"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Dátum *
              </label>
              <input
                type="date"
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Poznámky
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Popis čistenia..."
              />
            </div>

            {/* Volunteers */}
            <div>
              <label
                htmlFor="volunteers"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Počet dobrovoľníkov
              </label>
              <input
                type="number"
                id="volunteers"
                value={volunteers}
                onChange={(e) => setVolunteers(e.target.value)}
                min="0"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Napr. 15"
              />
            </div>

            {/* Volume */}
            <div>
              <label
                htmlFor="volume"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Objem odpadu (litrov)
              </label>
              <input
                type="number"
                id="volume"
                value={volumeLitres}
                onChange={(e) => setVolumeLitres(e.target.value)}
                min="0"
                step="1"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Napr. 120"
              />
            </div>

            {/* Photos */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Fotografie
              </label>

              {/* Photo grid */}
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={`/uploads/${photo}`}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-600 hover:bg-red-700 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full py-2 px-3 border border-dashed border-gray-600 hover:border-gray-500 rounded-lg text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50"
              >
                {uploading ? 'Nahrávam...' : '+ Pridať fotografie'}
              </button>
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
                {cleanup ? 'Uložiť' : 'Vytvoriť'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
