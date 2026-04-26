import { cookies } from 'next/headers';
import {
  sessionCookieName,
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
} from '@/lib/session-token';

export type { SessionPayload };

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await signSessionToken(payload);

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(sessionCookieName)?.value);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
}
