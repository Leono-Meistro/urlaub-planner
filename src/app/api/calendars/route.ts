import { NextRequest, NextResponse } from 'next/server';
import {
  createCalendar,
  getAllCalendars,
  getCalendarByAdminCode,
  getCalendarByTitle,
  deleteCalendar,
  getCalendarOwnerId,
  getUserById,
  getUserCalendars,
} from '@/lib/db';
import { getSession } from '@/lib/auth';

function getInclusiveDayCount(startDate: string, endDate: string) {
  return Math.round(
    (new Date(`${endDate}T12:00:00`).getTime() - new Date(`${startDate}T12:00:00`).getTime()) /
    (1000 * 60 * 60 * 24)
  ) + 1;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminCode = searchParams.get('adminCode');

    if (adminCode) {
      const calendar = getCalendarByAdminCode(adminCode);

      if (!calendar) {
        return NextResponse.json(
          { error: 'Planung nicht gefunden' },
          { status: 404 }
        );
      }

      return NextResponse.json(calendar);
    }

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

    const calendars = user.isSupervisor ? getAllCalendars() : getUserCalendars(user.id);
    return NextResponse.json(calendars);
  } catch (error) {
    console.error('Error fetching calendars:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendars' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, startDate, endDate, minDurationDays } = body;

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

    const trimmedTitle = typeof title === 'string' ? title.trim() : '';
    const parsedMinDurationDays = Number(minDurationDays ?? 1);
    const dayCount = typeof startDate === 'string' && typeof endDate === 'string'
      ? getInclusiveDayCount(startDate, endDate)
      : 0;

    if (!trimmedTitle || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(dayCount) || dayCount <= 1) {
      return NextResponse.json(
        { error: 'Das Enddatum muss nach dem Startdatum liegen.' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(parsedMinDurationDays) || parsedMinDurationDays < 1) {
      return NextResponse.json(
        { error: 'Die Mindestdauer muss mindestens 1 Tag sein.' },
        { status: 400 }
      );
    }

    if (parsedMinDurationDays > dayCount) {
      return NextResponse.json(
        { error: `Die Mindestdauer darf nicht größer als ${dayCount} Tage sein.` },
        { status: 400 }
      );
    }

    const existingCalendar = getCalendarByTitle(trimmedTitle) || getCalendarByAdminCode(trimmedTitle);
    if (existingCalendar) {
      return NextResponse.json(
        {
          error: 'Eine Planung mit diesem Namen gibt es bereits. Bitte ändern Sie den Namen, damit der Admin-Code eindeutig bleibt.',
          field: 'title',
        },
        { status: 409 }
      );
    }

    const calendar = createCalendar(
      trimmedTitle,
      typeof description === 'string' ? description.trim() : '',
      startDate,
      endDate,
      parsedMinDurationDays,
      user.id
    );
    return NextResponse.json(calendar, { status: 201 });
  } catch (error) {
    console.error('Error creating calendar:', error);
    return NextResponse.json(
      { error: 'Failed to create calendar' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing id' },
        { status: 400 }
      );
    }

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

    const ownerId = getCalendarOwnerId(id);
    if (!user.isSupervisor && ownerId !== user.id) {
      return NextResponse.json(
        { error: 'Keine Berechtigung' },
        { status: 403 }
      );
    }

    const success = deleteCalendar(id);
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Calendar not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error deleting calendar:', error);
    return NextResponse.json(
      { error: 'Failed to delete calendar' },
      { status: 500 }
    );
  }
}
