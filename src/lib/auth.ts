import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { createSession, validateSession, deleteSession } from './db';

const SESSION_COOKIE = 'cleanup_session';

export async function getSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value || null;
}

export async function isAuthenticated(): Promise<boolean> {
  const sessionId = await getSessionId();
  if (!sessionId) return false;
  return validateSession(sessionId);
}

export async function login(password: string): Promise<{ success: boolean; sessionId?: string }> {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('ADMIN_PASSWORD environment variable not set');
    return { success: false };
  }

  if (password !== adminPassword) {
    return { success: false };
  }

  const sessionId = uuidv4();
  createSession(sessionId);

  return { success: true, sessionId };
}

export async function logout(): Promise<void> {
  const sessionId = await getSessionId();
  if (sessionId) {
    deleteSession(sessionId);
  }
}

export function setSessionCookie(sessionId: string): { name: string; value: string; options: object } {
  return {
    name: SESSION_COOKIE,
    value: sessionId,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    },
  };
}

export function clearSessionCookie(): { name: string; value: string; options: object } {
  return {
    name: SESSION_COOKIE,
    value: '',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 0,
      path: '/',
    },
  };
}
