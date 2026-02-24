import Database from 'better-sqlite3';
import path from 'path';

const dataDir = process.env.DATA_PATH || path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'cleanup.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    initializeDb(db);
  }
  return db;
}

function initializeDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS target_areas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      geometry TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cleanups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      geometry TEXT NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      volunteers INTEGER,
      weight_kg REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cleanup_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cleanup_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cleanup_id) REFERENCES cleanups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      geometry TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      note TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Target area operations
export function getTargetArea() {
  const db = getDb();
  const row = db.prepare('SELECT * FROM target_areas ORDER BY id DESC LIMIT 1').get() as {
    id: number;
    geometry: string;
    created_at: string;
    updated_at: string;
  } | undefined;

  if (!row) return null;
  return {
    id: row.id,
    geometry: JSON.parse(row.geometry),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function setTargetArea(geometry: GeoJSON.Geometry) {
  const db = getDb();
  const existing = getTargetArea();

  if (existing) {
    db.prepare(
      'UPDATE target_areas SET geometry = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(JSON.stringify(geometry), existing.id);
    return existing.id;
  } else {
    const result = db.prepare(
      'INSERT INTO target_areas (geometry) VALUES (?)'
    ).run(JSON.stringify(geometry));
    return result.lastInsertRowid;
  }
}

// Cleanup operations
export interface Cleanup {
  id: number;
  geometry: GeoJSON.Geometry;
  date: string;
  notes: string | null;
  volunteers: number | null;
  weight_kg: number | null;
  created_at: string;
  photos: string[];
}

export function getCleanups(): Cleanup[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM cleanups ORDER BY date DESC').all() as {
    id: number;
    geometry: string;
    date: string;
    notes: string | null;
    volunteers: number | null;
    weight_kg: number | null;
    created_at: string;
  }[];

  return rows.map(row => {
    const photos = db.prepare(
      'SELECT filename FROM cleanup_photos WHERE cleanup_id = ?'
    ).all(row.id) as { filename: string }[];

    return {
      id: row.id,
      geometry: JSON.parse(row.geometry),
      date: row.date,
      notes: row.notes,
      volunteers: row.volunteers,
      weight_kg: row.weight_kg,
      created_at: row.created_at,
      photos: photos.map(p => p.filename),
    };
  });
}

export function getCleanup(id: number): Cleanup | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM cleanups WHERE id = ?').get(id) as {
    id: number;
    geometry: string;
    date: string;
    notes: string | null;
    volunteers: number | null;
    weight_kg: number | null;
    created_at: string;
  } | undefined;

  if (!row) return null;

  const photos = db.prepare(
    'SELECT filename FROM cleanup_photos WHERE cleanup_id = ?'
  ).all(row.id) as { filename: string }[];

  return {
    id: row.id,
    geometry: JSON.parse(row.geometry),
    date: row.date,
    notes: row.notes,
    volunteers: row.volunteers,
    weight_kg: row.weight_kg,
    created_at: row.created_at,
    photos: photos.map(p => p.filename),
  };
}

export function createCleanup(data: {
  geometry: GeoJSON.Geometry;
  date: string;
  notes?: string;
  volunteers?: number;
  weight_kg?: number;
  photos?: string[];
}): number {
  const db = getDb();

  const result = db.prepare(`
    INSERT INTO cleanups (geometry, date, notes, volunteers, weight_kg)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    JSON.stringify(data.geometry),
    data.date,
    data.notes || null,
    data.volunteers || null,
    data.weight_kg || null
  );

  const cleanupId = result.lastInsertRowid as number;

  if (data.photos && data.photos.length > 0) {
    const insertPhoto = db.prepare(
      'INSERT INTO cleanup_photos (cleanup_id, filename) VALUES (?, ?)'
    );
    for (const filename of data.photos) {
      insertPhoto.run(cleanupId, filename);
    }
  }

  return cleanupId;
}

export function updateCleanup(id: number, data: {
  geometry?: GeoJSON.Geometry;
  date?: string;
  notes?: string;
  volunteers?: number;
  weight_kg?: number;
  photos?: string[];
}): boolean {
  const db = getDb();
  const existing = getCleanup(id);
  if (!existing) return false;

  db.prepare(`
    UPDATE cleanups SET
      geometry = COALESCE(?, geometry),
      date = COALESCE(?, date),
      notes = COALESCE(?, notes),
      volunteers = COALESCE(?, volunteers),
      weight_kg = COALESCE(?, weight_kg)
    WHERE id = ?
  `).run(
    data.geometry ? JSON.stringify(data.geometry) : null,
    data.date || null,
    data.notes || null,
    data.volunteers || null,
    data.weight_kg || null,
    id
  );

  if (data.photos !== undefined) {
    db.prepare('DELETE FROM cleanup_photos WHERE cleanup_id = ?').run(id);
    const insertPhoto = db.prepare(
      'INSERT INTO cleanup_photos (cleanup_id, filename) VALUES (?, ?)'
    );
    for (const filename of data.photos) {
      insertPhoto.run(id, filename);
    }
  }

  return true;
}

export function deleteCleanup(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM cleanups WHERE id = ?').run(id);
  return result.changes > 0;
}

// Session operations
export function createSession(sessionId: string, expiresInHours = 24): void {
  const db = getDb();
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();
  db.prepare(
    'INSERT OR REPLACE INTO sessions (id, expires_at) VALUES (?, ?)'
  ).run(sessionId, expiresAt);
}

export function validateSession(sessionId: string): boolean {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM sessions WHERE id = ? AND expires_at > datetime(\'now\')'
  ).get(sessionId) as { id: string } | undefined;
  return !!row;
}

export function deleteSession(sessionId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

export function cleanExpiredSessions(): void {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE expires_at <= datetime(\'now\')').run();
}

// Event operations
export interface Event {
  id: number;
  geometry: GeoJSON.Geometry;
  date: string;
  time: string;
  note: string | null;
  created_at: string;
}

export function getEvents(): Event[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM events ORDER BY date ASC, time ASC').all() as {
    id: number;
    geometry: string;
    date: string;
    time: string;
    note: string | null;
    created_at: string;
  }[];

  return rows.map(row => ({
    id: row.id,
    geometry: JSON.parse(row.geometry),
    date: row.date,
    time: row.time,
    note: row.note,
    created_at: row.created_at,
  }));
}

export function getUpcomingEvents(): Event[] {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  const rows = db.prepare(
    'SELECT * FROM events WHERE date >= ? ORDER BY date ASC, time ASC'
  ).all(today) as {
    id: number;
    geometry: string;
    date: string;
    time: string;
    note: string | null;
    created_at: string;
  }[];

  return rows.map(row => ({
    id: row.id,
    geometry: JSON.parse(row.geometry),
    date: row.date,
    time: row.time,
    note: row.note,
    created_at: row.created_at,
  }));
}

export function getEvent(id: number): Event | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as {
    id: number;
    geometry: string;
    date: string;
    time: string;
    note: string | null;
    created_at: string;
  } | undefined;

  if (!row) return null;

  return {
    id: row.id,
    geometry: JSON.parse(row.geometry),
    date: row.date,
    time: row.time,
    note: row.note,
    created_at: row.created_at,
  };
}

export function createEvent(data: {
  geometry: GeoJSON.Geometry;
  date: string;
  time: string;
  note?: string;
}): number {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO events (geometry, date, time, note)
    VALUES (?, ?, ?, ?)
  `).run(
    JSON.stringify(data.geometry),
    data.date,
    data.time,
    data.note || null
  );

  return result.lastInsertRowid as number;
}

export function updateEvent(id: number, data: {
  date: string;
  time: string;
  note?: string;
}): boolean {
  const db = getDb();
  const result = db.prepare(`
    UPDATE events SET date = ?, time = ?, note = ?
    WHERE id = ?
  `).run(data.date, data.time, data.note || null, id);
  return result.changes > 0;
}

export function deleteEvent(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM events WHERE id = ?').run(id);
  return result.changes > 0;
}
