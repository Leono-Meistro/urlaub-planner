import { NextRequest, NextResponse } from 'next/server';
import {
  createCalendarUser,
  deleteCalendarUser,
  getCalendar,
  getCalendarOwnerId,
  getCalendarUsers,
  getOrCreateUser,
  getUserById,
} from '@/lib/db';
import { getSession } from '@/lib/auth';

async function requireCalendarManager(calendarId: string) {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 }) };
  }

  const user = getUserById(session.userId);
  if (!user) {
    return { error: NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 }) };
  }

  const ownerId = getCalendarOwnerId(calendarId);
  if (!user.isSupervisor && ownerId !== user.id) {
    return { error: NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 }) };
  }

  return { user };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const calendar = getCalendar(id);

    if (!calendar) {
      return NextResponse.json({ error: 'Urlaub nicht gefunden' }, { status: 404 });
    }

    const access = await requireCalendarManager(id);
    if ('error' in access) {
      return access.error;
    }

    return NextResponse.json({ users: getCalendarUsers(id) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Nutzer konnten nicht geladen werden' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const calendar = getCalendar(id);

    if (!calendar) {
      return NextResponse.json({ error: 'Urlaub nicht gefunden' }, { status: 404 });
    }

    const { name, selfRegister } = await request.json();
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 });
    }

    if (selfRegister === true) {
      return NextResponse.json(getOrCreateUser(id, name), { status: 201 });
    }

    const access = await requireCalendarManager(id);
    if ('error' in access) {
      return access.error;
    }

    const user = createCalendarUser(id, name);
    if (!user) {
      return NextResponse.json({ error: 'Name existiert bereits oder ist ungültig' }, { status: 400 });
    }

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Nutzer konnte nicht angelegt werden' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const calendar = getCalendar(id);

    if (!calendar) {
      return NextResponse.json({ error: 'Urlaub nicht gefunden' }, { status: 404 });
    }

    const access = await requireCalendarManager(id);
    if ('error' in access) {
      return access.error;
    }

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    const userId = userIdParam ? Number(userIdParam) : NaN;

    if (!Number.isInteger(userId)) {
      return NextResponse.json({ error: 'Ungültige Nutzer-ID' }, { status: 400 });
    }

    const deletedUser = deleteCalendarUser(id, userId);
    if (!deletedUser) {
      return NextResponse.json({ error: 'Nutzer nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: deletedUser });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Nutzer konnte nicht gelöscht werden' }, { status: 500 });
  }
}
