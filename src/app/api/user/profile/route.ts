import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, getUserCalendars, getAllCalendars } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    const user = getUserById(session.userId);

    if (!user) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden' },
        { status: 404 }
      );
    }

    // Supervisor sieht alle Urlaube, normale Nutzer nur ihre eigenen
    const calendars = user.isSupervisor ? getAllCalendars() : getUserCalendars(session.userId);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isSupervisor: user.isSupervisor || false,
      },
      calendars,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen des Profils' },
      { status: 500 }
    );
  }
}
