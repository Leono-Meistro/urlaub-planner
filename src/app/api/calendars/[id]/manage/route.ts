import { NextRequest, NextResponse } from 'next/server';
import { getCalendar, updateCalendar, deleteCalendar, getUserById, getCalendarOwnerId } from '@/lib/db';
import { getSession } from '@/lib/auth';

function getInclusiveDayCount(startDate: string, endDate: string) {
  return Math.round(
    (new Date(`${endDate}T12:00:00`).getTime() - new Date(`${startDate}T12:00:00`).getTime()) /
    (1000 * 60 * 60 * 24)
  ) + 1;
}

async function requireCalendarOwner(calendarId: string) {
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const calendar = getCalendar(id);

    if (!calendar) {
      return NextResponse.json({ error: 'Planung nicht gefunden' }, { status: 404 });
    }

    const auth = await requireCalendarOwner(id);
    if ('error' in auth) {
      return auth.error;
    }

    const { title, description, startDate, endDate, minDurationDays } = await request.json();
    const parsedMinDurationDays = Number(minDurationDays);
    const dayCount = typeof startDate === 'string' && typeof endDate === 'string'
      ? getInclusiveDayCount(startDate, endDate)
      : 0;

    if (typeof title !== 'string' || !title.trim() || !startDate || !endDate) {
      return NextResponse.json({ error: 'Titel, Startdatum und Enddatum sind erforderlich.' }, { status: 400 });
    }

    if (!Number.isFinite(dayCount) || dayCount <= 1) {
      return NextResponse.json({ error: 'Das Enddatum muss nach dem Startdatum liegen.' }, { status: 400 });
    }

    if (!Number.isInteger(parsedMinDurationDays) || parsedMinDurationDays < 1) {
      return NextResponse.json({ error: 'Die Mindestdauer muss mindestens 1 Tag sein.' }, { status: 400 });
    }

    if (parsedMinDurationDays > dayCount) {
      return NextResponse.json({ error: `Die Mindestdauer darf nicht größer als ${dayCount} Tage sein.` }, { status: 400 });
    }

    const updated = updateCalendar(id, {
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      startDate,
      endDate,
      minDurationDays: parsedMinDurationDays,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Planung konnte nicht aktualisiert werden' }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating calendar:', error);
    return NextResponse.json({ error: 'Planung konnte nicht aktualisiert werden' }, { status: 500 });
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
      return NextResponse.json({ error: 'Planung nicht gefunden' }, { status: 404 });
    }

    const auth = await requireCalendarOwner(id);
    if ('error' in auth) {
      return auth.error;
    }

    const success = deleteCalendar(id);
    if (!success) {
      return NextResponse.json({ error: 'Planung konnte nicht gelöscht werden' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting calendar:', error);
    return NextResponse.json({ error: 'Planung konnte nicht gelöscht werden' }, { status: 500 });
  }
}
