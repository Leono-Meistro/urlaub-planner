import { NextRequest, NextResponse } from 'next/server';
import {
  getCalendar,
  addAvailabilityDays,
  getAvailability,
  getCalendarUsers,
  getUserAvailability,
  getOrCreateUser,
  getCalendarOwnerId,
  getUserById,
  deleteAvailabilityDay,
  deleteAvailabilityDays,
} from '@/lib/db';
import { getSession } from '@/lib/auth';

interface DateRange {
  startDate: string;
  endDate: string;
  days: number;
}

function fromDateKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`);
}

function toDateKey(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12,
    0,
    0
  ).toISOString().split('T')[0];
}

function differenceInDays(startDate: string, endDate: string) {
  return Math.round(
    (fromDateKey(endDate).getTime() - fromDateKey(startDate).getTime()) /
    (1000 * 60 * 60 * 24)
  );
}

function forEachDateInRange(
  startDate: string,
  endDate: string,
  callback: (dateKey: string) => void
) {
  let currentDate = fromDateKey(startDate);
  const finalDate = fromDateKey(endDate);

  while (currentDate.getTime() <= finalDate.getTime()) {
    callback(toDateKey(currentDate));
    currentDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate() + 1,
      12,
      0,
      0
    );
  }
}

function groupDateKeys(dateKeys: string[]): DateRange[] {
  const sortedDates = [...dateKeys].sort();
  if (sortedDates.length === 0) {
    return [];
  }

  const ranges: DateRange[] = [];
  let rangeStart = sortedDates[0];
  let previousDate = sortedDates[0];

  for (let index = 1; index < sortedDates.length; index += 1) {
    const currentDate = sortedDates[index];
    if (differenceInDays(previousDate, currentDate) === 1) {
      previousDate = currentDate;
      continue;
    }

    ranges.push({
      startDate: rangeStart,
      endDate: previousDate,
      days: differenceInDays(rangeStart, previousDate) + 1,
    });
    rangeStart = currentDate;
    previousDate = currentDate;
  }

  ranges.push({
    startDate: rangeStart,
    endDate: previousDate,
    days: differenceInDays(rangeStart, previousDate) + 1,
  });

  return ranges;
}

function rangeContainsAnyDate(range: DateRange, dateKeys: Set<string>) {
  let containsDate = false;

  forEachDateInRange(range.startDate, range.endDate, (dateKey) => {
    if (dateKeys.has(dateKey)) {
      containsDate = true;
    }
  });

  return containsDate;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const calendar = getCalendar(id);

    if (!calendar) {
      return NextResponse.json(
        { error: 'Calendar not found' },
        { status: 404 }
      );
    }

    const session = await getSession();
    const currentUser = session ? getUserById(session.userId) : null;
    
    // Only provide defaultUserName - don't auto-create user entry
    // User will be created when they first save availability
    let defaultUserName: string | null = null;
    if (currentUser) {
      defaultUserName = currentUser.username;
    }

    const availability = getAvailability(id);
    const users = getCalendarUsers(id);
    const ownerId = getCalendarOwnerId(id);
    const canManage = !!currentUser && (currentUser.isSupervisor || ownerId === currentUser.id);
    
    return NextResponse.json({
      calendar,
      availability,
      users,
      defaultUserName,
      permissions: {
        canManage,
        isAuthenticated: !!currentUser,
        isSupervisor: currentUser?.isSupervisor || false,
      },
    });
  } catch (error) {
    console.error('Error fetching calendar:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userName, startDate, endDate } = body;

    if (
      typeof userName !== 'string'
      || !userName.trim()
      || typeof startDate !== 'string'
      || typeof endDate !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const calendar = getCalendar(id);
    if (!calendar) {
      return NextResponse.json(
        { error: 'Calendar not found' },
        { status: 404 }
      );
    }

    if (
      startDate > endDate
      || startDate < calendar.startDate
      || endDate > calendar.endDate
    ) {
      return NextResponse.json(
        { error: 'Die Auswahl liegt außerhalb des Planungszeitraums.' },
        { status: 400 }
      );
    }

    const normalizedUserName = userName.trim();
    const existingUser = getCalendarUsers(id).find((user) => (
      user.name.toLowerCase() === normalizedUserName.toLowerCase()
    ));
    const datesToAdd = new Set<string>();
    forEachDateInRange(startDate, endDate, (dateKey) => {
      datesToAdd.add(dateKey);
    });

    const datesAfterSelection = new Set<string>();
    if (existingUser) {
      getUserAvailability(id, existingUser.id).forEach((entry) => {
        forEachDateInRange(entry.startDate, entry.endDate, (dateKey) => {
          datesAfterSelection.add(dateKey);
        });
      });
    }
    datesToAdd.forEach((dateKey) => {
      datesAfterSelection.add(dateKey);
    });

    const invalidRange = groupDateKeys(Array.from(datesAfterSelection)).find((range) => (
      range.days < calendar.minDurationDays && rangeContainsAnyDate(range, datesToAdd)
    ));

    if (invalidRange) {
      return NextResponse.json(
        {
          error: `Die Auswahl muss zusammen mit angrenzenden gespeicherten Tagen mindestens ${calendar.minDurationDays} Tage ergeben.`,
          invalidRange,
        },
        { status: 409 }
      );
    }

    const user = existingUser || getOrCreateUser(id, normalizedUserName);

    // Store each selected day independently so individual days remain editable.
    const result = addAvailabilityDays(id, user.id, user.name, startDate, endDate);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error updating availability:', error);
    return NextResponse.json(
      { error: 'Failed to update availability' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { date, dates, userId, userName } = await request.json();

    const isMultipleDates = Array.isArray(dates) && dates.length > 0;
    const isSingleDate = typeof date === 'string';
    const requestedDates = isMultipleDates
      ? dates.filter((entry): entry is string => typeof entry === 'string')
      : isSingleDate
      ? [date]
      : [];

    if (requestedDates.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(userId) && typeof userName !== 'string') {
      return NextResponse.json(
        { error: 'Missing user information' },
        { status: 400 }
      );
    }

    const calendar = getCalendar(id);
    if (!calendar) {
      return NextResponse.json(
        { error: 'Calendar not found' },
        { status: 404 }
      );
    }

    const deleteResult = isMultipleDates
      ? deleteAvailabilityDays(
          id,
          requestedDates,
          calendar.minDurationDays,
          Number.isInteger(userId) ? userId : undefined,
          userName
        )
      : deleteAvailabilityDay(
          id,
          date,
          calendar.minDurationDays,
          Number.isInteger(userId) ? userId : undefined,
          userName
        );

    if (deleteResult.blocked) {
      return NextResponse.json(
        {
          error: `Diese Tage können nicht gelöscht werden, weil dadurch eine Auswahl unter ${calendar.minDurationDays} Tagen entstehen würde.`,
          invalidRange: deleteResult.invalidRange,
        },
        { status: 409 }
      );
    }

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Availability not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deletedCount: deleteResult.deletedCount });
  } catch (error) {
    console.error('Error deleting availability:', error);
    return NextResponse.json(
      { error: 'Failed to delete availability' },
      { status: 500 }
    );
  }
}
