import { jwtVerify, SignJWT, type JWTPayload } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production');

export const sessionCookieName = 'session';

export interface SessionPayload extends JWTPayload {
  userId: number;
  email: string;
  username: string;
}

export async function signSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifySessionToken(token?: string): Promise<SessionPayload | null> {
  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify(token, secret);
    return verified.payload as SessionPayload;
  } catch {
    return null;
  }
}
