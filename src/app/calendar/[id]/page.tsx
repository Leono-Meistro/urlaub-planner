'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  CalendarPlus2,
  CalendarRange,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  Search,
  Settings2,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import AppBrand from '@/components/AppBrand';
import AppHeader from '@/components/AppHeader';
import Notice from '@/components/Notice';
import { copyTextToClipboard } from '@/lib/clipboard';
import { storeHolidayCode } from '@/lib/holiday-code-storage';

interface Calendar {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  minDurationDays: number;
  adminCode: string;
}

interface User {
  id: number;
  calendarId: string;
  name: string;
  createdAt: string;
}

interface Availability {
  id: number;
  calendarId: string;
  userId: number;
  userName: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

interface Permissions {
  canManage: boolean;
  isAuthenticated: boolean;
  isSupervisor: boolean;
}

interface DraftRange {
  startDate: string;
  endDate: string;
  days: number;
}

interface MergedAvailabilityRange {
  ids: number[];
  startDate: string;
  endDate: string;
  days: number;
}

interface NameOption {
  id: number;
  name: string;
  savedDays: number;
}

interface HoverTooltip {
  text: string;
  x: number;
  y: number;
}

const HOVER_TOOLTIP_MAX_WIDTH = 260;
const HOVER_TOOLTIP_OFFSET = 12;

const timelineColors = [
  {
    dot: 'bg-sky-500',
    bar: 'bg-sky-500',
    glow: 'shadow-[0_14px_26px_-18px_rgba(14,165,233,0.95)]',
  },
  {
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
    glow: 'shadow-[0_14px_26px_-18px_rgba(16,185,129,0.95)]',
  },
  {
    dot: 'bg-rose-500',
    bar: 'bg-rose-500',
    glow: 'shadow-[0_14px_26px_-18px_rgba(244,63,94,0.95)]',
  },
  {
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
    glow: 'shadow-[0_14px_26px_-18px_rgba(245,158,11,0.95)]',
  },
  {
    dot: 'bg-violet-500',
    bar: 'bg-violet-500',
    glow: 'shadow-[0_14px_26px_-18px_rgba(139,92,246,0.95)]',
  },
  {
    dot: 'bg-cyan-600',
    bar: 'bg-cyan-600',
    glow: 'shadow-[0_14px_26px_-18px_rgba(8,145,178,0.95)]',
  },
];

const fullDateFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const shortDateFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
});

const monthFormatter = new Intl.DateTimeFormat('de-DE', {
  month: 'long',
  year: 'numeric',
});

const timelineMonthFormatter = new Intl.DateTimeFormat('de-DE', {
  month: 'short',
  year: 'numeric',
});

const MESSAGE_DISMISS_MS = 4500;
const TOUCH_TOOLTIP_DISMISS_MS = 2400;

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

function fromDateKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`);
}

function formatDate(date: string) {
  return fullDateFormatter.format(fromDateKey(date));
}

function formatShortDate(date: string) {
  return shortDateFormatter.format(fromDateKey(date));
}

function differenceInDays(startDate: string, endDate: string) {
  return Math.round(
    (fromDateKey(endDate).getTime() - fromDateKey(startDate).getTime()) /
    (1000 * 60 * 60 * 24)
  );
}

function addDays(dateKey: string, days: number) {
  const date = fromDateKey(dateKey);
  return toDateKey(new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    12,
    0,
    0
  ));
}

function clampDateKey(dateKey: string, minDate: string, maxDate: string) {
  if (dateKey < minDate) {
    return minDate;
  }

  if (dateKey > maxDate) {
    return maxDate;
  }

  return dateKey;
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

function groupSelectedDates(selectedDates: string[]): DraftRange[] {
  const sortedDates = [...selectedDates].sort();
  if (sortedDates.length === 0) {
    return [];
  }

  const ranges: DraftRange[] = [];
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

function getShortDateRanges(dateKeys: string[], minDurationDays: number) {
  if (minDurationDays <= 1) {
    return [];
  }

  return groupSelectedDates(dateKeys).filter((range) => range.days < minDurationDays);
}

function collectDateKeysFromRanges(ranges: DraftRange[]) {
  const dateKeys = new Set<string>();

  ranges.forEach((range) => {
    forEachDateInRange(range.startDate, range.endDate, (dateKey) => {
      dateKeys.add(dateKey);
    });
  });

  return dateKeys;
}

function rangeContainsAnyDate(range: DraftRange, dateKeys: Set<string>) {
  let containsDate = false;

  forEachDateInRange(range.startDate, range.endDate, (dateKey) => {
    if (dateKeys.has(dateKey)) {
      containsDate = true;
    }
  });

  return containsDate;
}

function formatDateRangeList(ranges: DraftRange[]) {
  return ranges.map((range) => (
    range.startDate === range.endDate
      ? formatDate(range.startDate)
      : `${formatDate(range.startDate)} bis ${formatDate(range.endDate)}`
  )).join(', ');
}

function getTooltipPosition(event: ReactPointerEvent<Element>) {
  const maxX = window.innerWidth - HOVER_TOOLTIP_MAX_WIDTH - 8;
  const maxY = window.innerHeight - 56;

  return {
    x: Math.max(8, Math.min(event.clientX + HOVER_TOOLTIP_OFFSET, maxX)),
    y: Math.max(8, Math.min(event.clientY + HOVER_TOOLTIP_OFFSET, maxY)),
  };
}

function mergeAvailabilityEntries(entries: Availability[]): MergedAvailabilityRange[] {
  const sortedEntries = [...entries].sort((firstEntry, secondEntry) => (
    firstEntry.startDate.localeCompare(secondEntry.startDate)
      || firstEntry.endDate.localeCompare(secondEntry.endDate)
  ));
  const ranges: MergedAvailabilityRange[] = [];

  sortedEntries.forEach((entry) => {
    const lastRange = ranges.at(-1);

    if (!lastRange) {
      ranges.push({
        ids: [entry.id],
        startDate: entry.startDate,
        endDate: entry.endDate,
        days: differenceInDays(entry.startDate, entry.endDate) + 1,
      });
      return;
    }

    const dayAfterLastRange = addDays(lastRange.endDate, 1);
    if (entry.startDate <= dayAfterLastRange) {
      lastRange.ids.push(entry.id);
      if (entry.endDate > lastRange.endDate) {
        lastRange.endDate = entry.endDate;
        lastRange.days = differenceInDays(lastRange.startDate, lastRange.endDate) + 1;
      }
      return;
    }

    ranges.push({
      ids: [entry.id],
      startDate: entry.startDate,
      endDate: entry.endDate,
      days: differenceInDays(entry.startDate, entry.endDate) + 1,
    });
  });

  return ranges;
}

function buildShareLink(origin: string, calendarId: string, name?: string) {
  const baseUrl = `${origin}/calendar/${calendarId}`;
  if (!name) {
    return baseUrl;
  }

  return `${baseUrl}?name=${encodeURIComponent(name)}`;
}

function resolvePreferredUserName(
  availableUsers: User[],
  nameStorageKey: string,
  fallbackSelectedUser?: string | null
) {
  const fallbackName = fallbackSelectedUser?.trim() || null;
  const preferredName = (typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('name')?.trim()
      || window.localStorage.getItem(nameStorageKey)?.trim()
    : null) || fallbackName;

  if (!preferredName) {
    return null;
  }

  // Only return the name if the user actually exists in the list
  const matchingUser = availableUsers.find((user) => (
    user.name.toLowerCase() === preferredName.toLowerCase()
  ));

  if (matchingUser) {
    return matchingUser.name;
  }

  // Allow logged-in users to use their own default name before first save.
  if (fallbackName && preferredName.toLowerCase() === fallbackName.toLowerCase()) {
    return fallbackName;
  }

  return null;
}

function NamePickerModal({
  loading,
  selectedUser,
  existingUsers,
  onClose,
  onSelect,
}: {
  loading: boolean;
  selectedUser: string | null;
  existingUsers: NameOption[];
  onClose: () => void;
  onSelect: (name: string) => Promise<void>;
}) {
  const [newName, setNewName] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [savingName, setSavingName] = useState(false);
  const isBusy = loading || savingName;

  useEffect(() => {
    if (!error) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setError('');
    }, MESSAGE_DISMISS_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [error]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return existingUsers;
    }

    return existingUsers.filter((user) => user.name.toLowerCase().includes(normalizedQuery));
  }, [existingUsers, query]);

  const handleExistingUser = async (name: string) => {
    setError('');
    setSavingName(true);

    try {
      await onSelect(name);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Name konnte nicht ausgewählt werden.');
    } finally {
      setSavingName(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newName.trim();

    if (!trimmedName) {
      setError('Bitte einen Namen eingeben.');
      return;
    }

    const existingUser = existingUsers.find((user) => (
      user.name.toLowerCase() === trimmedName.toLowerCase()
    ));

    setError('');
    setSavingName(true);

    try {
      await onSelect(existingUser?.name || trimmedName);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Name konnte nicht gespeichert werden.');
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-6">
      <div className="app-card w-full max-w-2xl overflow-hidden p-0">
        <div className="px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">Wer bist du?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Wählen Sie einen Namen oder erstellen Sie einen neuen Eintrag.
              </p>
            </div>
            {selectedUser && (
              <button type="button" onClick={onClose} className="app-button-ghost px-3">
                <X size={18} />
              </button>
            )}
          </div>

          {selectedUser && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
              <CheckCircle2 size={16} />
              Aktiv: {selectedUser}
            </div>
          )}

          {existingUsers.length > 0 && (
            <>
              <div className="mt-6">
                <label htmlFor="name-search" className="text-sm font-medium text-slate-800">
                  Vorhandene Namen
                </label>
                <div className="relative mt-2">
                  <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="name-search"
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setError('');
                    }}
                    placeholder="Namen filtern"
                    className="app-input app-input-with-icon"
                    disabled={isBusy}
                  />
                </div>
              </div>

              <div className="mt-4 grid max-h-[28rem] gap-2 overflow-y-auto pr-1">
                {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleExistingUser(user.name)}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
                      user.name === selectedUser
                        ? 'border-emerald-500 bg-emerald-50 text-slate-900 ring-1 ring-emerald-200'
                        : 'border-slate-200 bg-white text-slate-900 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{user.name}</p>
                      {user.savedDays > 0 && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {user.savedDays} Tag{user.savedDays === 1 ? '' : 'e'} gespeichert
                        </p>
                      )}
                    </div>
                    {user.name === selectedUser && <Check size={18} className="ml-2 shrink-0 text-emerald-600" />}
                  </button>
                )) : (
                  query && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                      Kein Name gefunden.
                    </div>
                  )
                )}
              </div>
            </>
          )}

          <form onSubmit={handleCreateUser} className={`${existingUsers.length > 0 ? 'mt-6 border-t border-slate-200 pt-6' : 'mt-0'} space-y-3`}>
            <label htmlFor="new-user-name" className="text-sm font-medium text-slate-800">
              {existingUsers.length > 0 ? 'Neuer Name' : 'Namen eingeben'}
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="new-user-name"
                type="text"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setError('');
                }}
                placeholder="Name eingeben"
                className="app-input flex-1"
                disabled={isBusy}
                aria-busy={savingName}
                autoFocus={existingUsers.length === 0}
              />
              <button type="submit" disabled={isBusy} className="app-button sm:w-auto">
                <Plus size={18} />
                <span className="hidden sm:inline">{savingName ? 'Speichert...' : 'Weiter'}</span>
              </button>
            </div>
            {error && <Notice tone="error" className="text-sm">{error}</Notice>}
          </form>
        </div>
      </div>
    </div>
  );
}

export default function CalendarView() {
  const params = useParams();
  const calendarId = params.id as string;
  const nameStorageKey = `urlaub-planner:selected-user:${calendarId}`;

  const [calendar, setCalendar] = useState<Calendar | null>(null);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Permissions>({
    canManage: false,
    isAuthenticated: false,
    isSupervisor: false,
  });
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [adminError, setAdminError] = useState('');
  const [newManagedUserName, setNewManagedUserName] = useState('');
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [deletingAvailability, setDeletingAvailability] = useState(false);
  const [pendingDeleteDates, setPendingDeleteDates] = useState<string[]>([]);
  const [dismissedSelectionWarningKey, setDismissedSelectionWarningKey] = useState('');
  const [hoverTooltip, setHoverTooltip] = useState<HoverTooltip | null>(null);
  const hasInitializedMonth = useRef(false);
  const dragModeRef = useRef<'add' | 'remove' | 'delete-add' | 'delete-remove' | null>(null);
  const dragStartDateRef = useRef<string | null>(null);
  const dragInitialDatesRef = useRef<Set<string>>(new Set());
  const dragInitialDeleteDatesRef = useRef<Set<string>>(new Set());
  const dragMovedRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const touchTooltipTimeoutRef = useRef<number | null>(null);

  const selectedRanges = useMemo(() => groupSelectedDates(selectedDates), [selectedDates]);
  const selectedDateKeys = useMemo(() => new Set(selectedDates), [selectedDates]);
  const selectedUserRecord = useMemo(
    () => selectedUser
      ? users.find((user) => user.name.toLowerCase() === selectedUser.toLowerCase()) || null
      : null,
    [selectedUser, users]
  );
  const mergedAvailabilityByUser = useMemo(() => {
    const rangesByUser = new Map<number, MergedAvailabilityRange[]>();

    users.forEach((user) => {
      rangesByUser.set(
        user.id,
        mergeAvailabilityEntries(availability.filter((entry) => entry.userId === user.id))
      );
    });

    return rangesByUser;
  }, [availability, users]);
  const selectedUserAvailability = useMemo(() => {
    if (!selectedUser) {
      return [];
    }

    const normalizedSelectedUser = selectedUser.toLowerCase();
    return availability.filter((entry) => (
      entry.userName.toLowerCase() === normalizedSelectedUser
        || (!!selectedUserRecord && entry.userId === selectedUserRecord.id)
    ));
  }, [availability, selectedUser, selectedUserRecord]);
  const selectedUserMergedAvailability = useMemo(
    () => mergeAvailabilityEntries(selectedUserAvailability),
    [selectedUserAvailability]
  );

  const existingUserOptions = useMemo(() => users.map((user) => {
    const userEntries = mergedAvailabilityByUser.get(user.id) || [];
    const savedDays = new Set<string>();

    userEntries.forEach((entry) => {
      forEachDateInRange(entry.startDate, entry.endDate, (dateKey) => {
        savedDays.add(dateKey);
      });
    });

    return {
      id: user.id,
      name: user.name,
      savedDays: savedDays.size,
    };
  }), [mergedAvailabilityByUser, users]);

  const availabilityCountByDate = useMemo(() => {
    const counts = new Map<string, number>();

    availability.forEach((entry) => {
      forEachDateInRange(entry.startDate, entry.endDate, (dateKey) => {
        counts.set(dateKey, (counts.get(dateKey) ?? 0) + 1);
      });
    });

    return counts;
  }, [availability]);

  const selectedUserSavedDates = useMemo(() => {
    const savedDates = new Set<string>();

    selectedUserMergedAvailability.forEach((entry) => {
      forEachDateInRange(entry.startDate, entry.endDate, (dateKey) => {
        savedDates.add(dateKey);
      });
    });

    return savedDates;
  }, [selectedUserMergedAvailability]);
  const selectedUserSavedDateList = useMemo(
    () => Array.from(selectedUserSavedDates).sort(),
    [selectedUserSavedDates]
  );
  const datesAfterSelection = useMemo(() => (
    Array.from(new Set([...selectedUserSavedDateList, ...selectedDates])).sort()
  ), [selectedDates, selectedUserSavedDateList]);

  const remainingDatesAfterPendingDelete = useMemo(() => (
    selectedUserSavedDateList.filter((dateKey) => !pendingDeleteDates.includes(dateKey))
  ), [pendingDeleteDates, selectedUserSavedDateList]);

  const remainingDeleteConflictRanges = useMemo(() => {
    if (!calendar || pendingDeleteDates.length === 0) {
      return [];
    }

    return getShortDateRanges(remainingDatesAfterPendingDelete, calendar.minDurationDays);
  }, [calendar, pendingDeleteDates, remainingDatesAfterPendingDelete]);

  const deleteConflictDateKeys = useMemo(
    () => collectDateKeysFromRanges(remainingDeleteConflictRanges),
    [remainingDeleteConflictRanges]
  );

  const canDeletePendingDates = pendingDeleteDates.length > 0 && deleteConflictDateKeys.size === 0;

  const selectedAddConflictRanges = useMemo(() => {
    if (!calendar || selectedDates.length === 0) {
      return [];
    }

    return getShortDateRanges(datesAfterSelection, calendar.minDurationDays)
      .filter((range) => rangeContainsAnyDate(range, selectedDateKeys));
  }, [calendar, datesAfterSelection, selectedDateKeys, selectedDates.length]);

  const invalidSelectedDateKeys = useMemo(
    () => collectDateKeysFromRanges(selectedAddConflictRanges),
    [selectedAddConflictRanges]
  );
  const selectionWarningKey = useMemo(
    () => Array.from(invalidSelectedDateKeys).sort().join('|'),
    [invalidSelectedDateKeys]
  );

  const hasInvalidSelection = invalidSelectedDateKeys.size > 0;
  const shouldShowSelectionWarning = !!selectionWarningKey
    && dismissedSelectionWarningKey !== selectionWarningKey;

  function applyCalendarData(data: {
    calendar: Calendar;
    availability: Availability[];
    users: User[];
    defaultUserName?: string | null;
    permissions?: Permissions;
  }, fallbackSelectedUser?: string | null) {
    setCalendar(data.calendar);
    setAvailability(data.availability);
    setUsers(data.users);
    setPermissions(data.permissions || { canManage: false, isAuthenticated: false, isSupervisor: false });
    storeHolidayCode(data.calendar.adminCode);
    setSelectedDates((currentDates) => (
      currentDates.filter((dateKey) => dateKey >= data.calendar.startDate && dateKey <= data.calendar.endDate)
    ));
    setPendingDeleteDates((currentDates) => (
      currentDates.filter((dateKey) => dateKey >= data.calendar.startDate && dateKey <= data.calendar.endDate)
    ));

    if (!hasInitializedMonth.current) {
      setCurrentDate(fromDateKey(data.calendar.startDate));
      hasInitializedMonth.current = true;
    }

    const preferredUserName = resolvePreferredUserName(data.users, nameStorageKey, fallbackSelectedUser || data.defaultUserName);
    if (preferredUserName) {
      setSelectedUser(preferredUserName);
      setNameModalOpen(false);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(nameStorageKey, preferredUserName);
      }

      return;
    }

    setSelectedUser(null);
    setNameModalOpen(true);
  }

  async function fetchCalendarData(
    fallbackSelectedUser?: string | null,
    showLoading: boolean = false
  ) {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const response = await fetch(`/api/calendars/${calendarId}`);
      if (!response.ok) {
        setError('Die Planung wurde nicht gefunden.');
        return;
      }

      const data = await response.json();
      applyCalendarData(data, fallbackSelectedUser);
    } catch (err) {
      console.error(err);
      setError('Beim Laden der Planung ist ein Fehler aufgetreten.');
    } finally {
      setLoading(false);
    }
  }

  function clearDragState() {
    dragModeRef.current = null;
    dragStartDateRef.current = null;
    dragInitialDatesRef.current.clear();
    dragInitialDeleteDatesRef.current.clear();
    dragMovedRef.current = false;
    activePointerIdRef.current = null;
  }

  const clearMessages = useCallback(() => {
    setError('');
    setSuccessMessage('');
    setDismissedSelectionWarningKey(selectionWarningKey);
  }, [selectionWarningKey]);

  const clearTouchTooltipTimeout = useCallback(() => {
    if (touchTooltipTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(touchTooltipTimeoutRef.current);
    touchTooltipTimeoutRef.current = null;
  }, []);

  const showHoverTooltip = useCallback((event: ReactPointerEvent<Element>, text?: string) => {
    if (!text) {
      return;
    }

    clearTouchTooltipTimeout();
    setHoverTooltip({
      text,
      ...getTooltipPosition(event),
    });
  }, [clearTouchTooltipTimeout]);

  const showTouchTooltip = useCallback((event: ReactPointerEvent<Element>, text?: string) => {
    if (!text || event.pointerType === 'mouse') {
      return;
    }

    setHoverTooltip({
      text,
      ...getTooltipPosition(event),
    });

    clearTouchTooltipTimeout();
    touchTooltipTimeoutRef.current = window.setTimeout(() => {
      setHoverTooltip(null);
      touchTooltipTimeoutRef.current = null;
    }, TOUCH_TOOLTIP_DISMISS_MS);
  }, [clearTouchTooltipTimeout]);

  const moveHoverTooltip = useCallback((event: ReactPointerEvent<Element>) => {
    setHoverTooltip((currentTooltip) => {
      if (!currentTooltip) {
        return null;
      }

      return {
        ...currentTooltip,
        ...getTooltipPosition(event),
      };
    });
  }, []);

  const hideHoverTooltip = useCallback(() => {
    clearTouchTooltipTimeout();
    setHoverTooltip(null);
  }, [clearTouchTooltipTimeout]);

  const hideMouseTooltip = useCallback((event: ReactPointerEvent<Element>) => {
    if (event.pointerType !== 'mouse') {
      return;
    }

    hideHoverTooltip();
  }, [hideHoverTooltip]);

  const isDateInCalendarRange = (dateKey: string) => (
    !!calendar && dateKey >= calendar.startDate && dateKey <= calendar.endDate
  );

  useEffect(() => {
    if (!error && !successMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      clearMessages();
    }, MESSAGE_DISMISS_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [clearMessages, error, successMessage]);

  useEffect(() => {
    const dismissTooltip = () => {
      clearTouchTooltipTimeout();
      setHoverTooltip(null);
    };

    window.addEventListener('scroll', dismissTooltip, true);

    return () => {
      clearTouchTooltipTimeout();
      window.removeEventListener('scroll', dismissTooltip, true);
    };
  }, [clearTouchTooltipTimeout]);

  useEffect(() => {
    if (!selectionWarningKey) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDismissedSelectionWarningKey(selectionWarningKey);
    }, MESSAGE_DISMISS_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [selectionWarningKey]);

  useEffect(() => {
    let cancelled = false;
    hasInitializedMonth.current = false;

    async function loadCalendar() {
      try {
        const response = await fetch(`/api/calendars/${calendarId}`);
        if (!response.ok) {
          if (!cancelled) {
            setError('Die Planung wurde nicht gefunden.');
            setLoading(false);
          }
          return;
        }

        const data = await response.json();
        if (!cancelled) {
          setCalendar(data.calendar);
          setAvailability(data.availability);
          setUsers(data.users);
          setPermissions(data.permissions || { canManage: false, isAuthenticated: false, isSupervisor: false });
          storeHolidayCode(data.calendar.adminCode);

          if (!hasInitializedMonth.current) {
            setCurrentDate(fromDateKey(data.calendar.startDate));
            hasInitializedMonth.current = true;
          }

          const preferredUserName = resolvePreferredUserName(data.users, nameStorageKey, data.defaultUserName);
          if (preferredUserName) {
            setSelectedUser(preferredUserName);
            setNameModalOpen(false);
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(nameStorageKey, preferredUserName);
            }
          } else {
            setSelectedUser(null);
            setNameModalOpen(true);
          }
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError('Beim Laden der Planung ist ein Fehler aufgetreten.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCalendar();

    return () => {
      cancelled = true;
      dragModeRef.current = null;
      dragStartDateRef.current = null;
      dragInitialDatesRef.current.clear();
      dragInitialDeleteDatesRef.current.clear();
      dragMovedRef.current = false;
      activePointerIdRef.current = null;
    };
  }, [calendarId, nameStorageKey]);

  useEffect(() => {
    const stopDragging = () => {
      clearDragState();
    };

    window.addEventListener('pointercancel', stopDragging);

    return () => {
      window.removeEventListener('pointercancel', stopDragging);
    };
  }, []);

  useEffect(() => {
    if (!nameModalOpen) {
      return;
    }

    const scrollY = window.scrollY;
    const bodyStyle = document.body.style;
    const htmlStyle = document.documentElement.style;
    const previousBodyOverflow = bodyStyle.overflow;
    const previousBodyPosition = bodyStyle.position;
    const previousBodyTop = bodyStyle.top;
    const previousBodyLeft = bodyStyle.left;
    const previousBodyRight = bodyStyle.right;
    const previousBodyWidth = bodyStyle.width;
    const previousHtmlOverflow = htmlStyle.overflow;

    htmlStyle.overflow = 'hidden';
    bodyStyle.overflow = 'hidden';
    bodyStyle.position = 'fixed';
    bodyStyle.top = `-${scrollY}px`;
    bodyStyle.left = '0';
    bodyStyle.right = '0';
    bodyStyle.width = '100%';

    return () => {
      htmlStyle.overflow = previousHtmlOverflow;
      bodyStyle.overflow = previousBodyOverflow;
      bodyStyle.position = previousBodyPosition;
      bodyStyle.top = previousBodyTop;
      bodyStyle.left = previousBodyLeft;
      bodyStyle.right = previousBodyRight;
      bodyStyle.width = previousBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [nameModalOpen]);

  const updateDateSelection = (dateStr: string, shouldSelect: boolean) => {
    clearMessages();
    setDismissedSelectionWarningKey('');
    setSelectedDates((currentDates) => {
      const nextDates = new Set(currentDates.filter(isDateInCalendarRange));
      if (shouldSelect && isDateInCalendarRange(dateStr)) {
        nextDates.add(dateStr);
      } else {
        nextDates.delete(dateStr);
      }
      return Array.from(nextDates).sort();
    });
  };

  const updateDateRangeSelection = (
    startDate: string,
    endDate: string,
    shouldSelect: boolean
  ) => {
    clearMessages();
    setDismissedSelectionWarningKey('');
    const rangeStart = startDate <= endDate ? startDate : endDate;
    const rangeEnd = startDate <= endDate ? endDate : startDate;
    const nextDates = new Set(
      Array.from(dragInitialDatesRef.current).filter(isDateInCalendarRange)
    );

    forEachDateInRange(rangeStart, rangeEnd, (dateKey) => {
      if (!isDateInCalendarRange(dateKey)) {
        return;
      }

      if (shouldSelect) {
        nextDates.add(dateKey);
      } else {
        nextDates.delete(dateKey);
      }
    });

    setSelectedDates(Array.from(nextDates).sort());
  };

  const updateDeleteRangeSelection = (
    startDate: string,
    endDate: string,
    shouldDelete: boolean
  ) => {
    clearMessages();
    const rangeStart = startDate <= endDate ? startDate : endDate;
    const rangeEnd = startDate <= endDate ? endDate : startDate;
    const nextDates = new Set(
      Array.from(dragInitialDeleteDatesRef.current).filter(isDateInCalendarRange)
    );

    forEachDateInRange(rangeStart, rangeEnd, (dateKey) => {
      if (!isDateInCalendarRange(dateKey) || !selectedUserSavedDates.has(dateKey)) {
        return;
      }

      if (shouldDelete) {
        nextDates.add(dateKey);
      } else {
        nextDates.delete(dateKey);
      }
    });

    setPendingDeleteDates(Array.from(nextDates).sort());
  };

  const togglePendingDeleteDate = (dateKey: string) => {
    if (!selectedUserSavedDates.has(dateKey) || deletingAvailability) {
      return;
    }

    clearDragState();
    setPendingDeleteDates((currentDates) => {
      const nextDates = new Set(currentDates);

      if (nextDates.has(dateKey)) {
        nextDates.delete(dateKey);
      } else {
        nextDates.add(dateKey);
      }

      return Array.from(nextDates).sort();
    });
    clearMessages();
  };

  const cancelDeleteSelection = () => {
    clearDragState();
    setPendingDeleteDates([]);
    clearMessages();
  };

  const confirmDeleteSavedDate = async () => {
    if (!selectedUser || deletingAvailability || pendingDeleteDates.length === 0) {
      return;
    }

    if (!canDeletePendingDates) {
      const conflictText = remainingDeleteConflictRanges.length > 0
        ? ` Betroffen: ${formatDateRangeList(remainingDeleteConflictRanges)}.`
        : '';
      setError(`Die Lösch-Auswahl ist noch nicht gültig, weil danach ein Block unter ${calendar?.minDurationDays ?? 1} Tagen übrig bliebe.${conflictText}`);
      return;
    }

    try {
      setDeletingAvailability(true);
      clearMessages();

      const response = await fetch(`/api/calendars/${calendarId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dates: pendingDeleteDates,
          userId: selectedUserRecord?.id,
          userName: selectedUser,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Die Tage konnten nicht gelöscht werden.');
        return;
      }

      setSelectedDates([]);
      setPendingDeleteDates([]);
      const dayCount = pendingDeleteDates.length;
      setSuccessMessage(
        dayCount === 1 ? 'Tag wurde gelöscht.' : `${dayCount} Tage wurden gelöscht.`
      );
      await fetchCalendarData(selectedUser);
    } catch (err) {
      console.error(err);
      setError('Die Tage konnten nicht gelöscht werden.');
    } finally {
      setDeletingAvailability(false);
    }
  };

  const handleDayPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    dateStr: string
  ) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    if (!isDateInCalendarRange(dateStr)) {
      clearDragState();
      return;
    }

    event.preventDefault();

    if (selectedUserSavedDates.has(dateStr)) {
      event.currentTarget.setPointerCapture?.(event.pointerId);
      activePointerIdRef.current = event.pointerId;
      dragStartDateRef.current = dateStr;
      dragInitialDeleteDatesRef.current = new Set(pendingDeleteDates);
      dragMovedRef.current = false;

      const shouldDelete = !pendingDeleteDates.includes(dateStr);
      dragModeRef.current = shouldDelete ? 'delete-add' : 'delete-remove';
      updateDeleteRangeSelection(dateStr, dateStr, shouldDelete);
      clearMessages();
      return;
    }

    if (pendingDeleteDates.length > 0) {
      clearDragState();
      setError('Bitte zuerst die rote Lösch-Auswahl löschen oder aufheben.');
      return;
    }

    event.currentTarget.setPointerCapture?.(event.pointerId);
    activePointerIdRef.current = event.pointerId;
    dragStartDateRef.current = dateStr;
    dragInitialDatesRef.current = new Set(selectedDates);
    dragMovedRef.current = false;

    const shouldSelect = !selectedDates.includes(dateStr);
    dragModeRef.current = shouldSelect ? 'add' : 'remove';
    updateDateRangeSelection(dateStr, dateStr, shouldSelect);
  };

  const handleDayPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    const hoveredElement = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-date-key]');
    const hoveredDate = hoveredElement?.dataset.dateKey;

    if (
      !hoveredDate
      || hoveredDate === dragStartDateRef.current
      || !isDateInCalendarRange(hoveredDate)
    ) {
      return;
    }

    dragMovedRef.current = true;

    if (!dragStartDateRef.current) {
      return;
    }

    if (dragModeRef.current === 'delete-add' || dragModeRef.current === 'delete-remove') {
      updateDeleteRangeSelection(
        dragStartDateRef.current,
        hoveredDate,
        dragModeRef.current === 'delete-add'
      );
      return;
    }

    if (pendingDeleteDates.length > 0) {
      return;
    }

    if (!dragModeRef.current) {
      const shouldSelect = !dragInitialDatesRef.current.has(dragStartDateRef.current);
      dragModeRef.current = shouldSelect ? 'add' : 'remove';
    }

    updateDateRangeSelection(
      dragStartDateRef.current,
      hoveredDate,
      dragModeRef.current === 'add'
    );
  };

  const handleDayPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    clearDragState();
  };

  const handleDayKeyToggle = (dateStr: string) => {
    if (selectedUserSavedDates.has(dateStr)) {
      togglePendingDeleteDate(dateStr);
      return;
    }

    if (pendingDeleteDates.length > 0) {
      setError('Bitte zuerst die rote Lösch-Auswahl löschen oder aufheben.');
      return;
    }

    setPendingDeleteDates([]);
    updateDateSelection(dateStr, !selectedDates.includes(dateStr));
  };

  const handleUserSelection = async (name: string) => {
    let finalName = name.trim();
    if (!finalName) {
      return;
    }

    const existingUser = users.find((user) => (
      user.name.toLowerCase() === finalName.toLowerCase()
    ));

    if (!existingUser) {
      const response = await fetch(`/api/calendars/${calendarId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: finalName, selfRegister: true }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Name konnte nicht gespeichert werden.');
      }

      finalName = data.name || finalName;
      setUsers((currentUsers) => {
        if (currentUsers.some((user) => user.id === data.id || user.name.toLowerCase() === finalName.toLowerCase())) {
          return currentUsers;
        }

        return [...currentUsers, data].sort((firstUser, secondUser) => (
          firstUser.name.localeCompare(secondUser.name)
        ));
      });
    }

    setSelectedUser(finalName);
    setSelectedDates([]);
    clearMessages();
    setPendingDeleteDates([]);
    setNameModalOpen(false);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(nameStorageKey, finalName);
    }

    if (!existingUser) {
      await fetchCalendarData(finalName);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (pendingDeleteDates.length > 0) {
      setError('Bitte zuerst die rote Lösch-Auswahl löschen oder aufheben.');
      return;
    }

    if (!selectedUser) {
      setError('Bitte zuerst einen Namen auswählen.');
      setNameModalOpen(true);
      return;
    }

    if (selectedRanges.length === 0) {
      setError('Bitte mindestens einen Tag markieren.');
      return;
    }

    if (!calendar) {
      return;
    }

    if (selectedAddConflictRanges.length > 0) {
      setError(`Die neue Auswahl muss zusammen mit angrenzenden gespeicherten Tagen mindestens ${calendar.minDurationDays} zusammenhängende Tage lang sein.`);
      return;
    }

    try {
      setSubmitting(true);

      for (const range of selectedRanges) {
        const response = await fetch(`/api/calendars/${calendarId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userName: selectedUser,
            startDate: range.startDate,
            endDate: range.endDate,
          }),
        });

        if (!response.ok) {
          throw new Error('Fehler beim Speichern');
        }
      }

      await fetchCalendarData();
      setSelectedDates([]);
      setSuccessMessage(
        selectedRanges.length === 1
          ? 'Die Tage wurden gespeichert.'
          : `${selectedRanges.length} Auswahlen wurden als einzelne Tage gespeichert.`
      );
    } catch (err) {
      setError('Beim Speichern der Verfügbarkeit ist ein Fehler aufgetreten.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = async (name?: string) => {
    if (!calendar || typeof window === 'undefined') {
      return;
    }

    try {
      const link = buildShareLink(window.location.origin, calendar.id, name);
      await copyTextToClipboard(link);
      setCopiedMessage(name ? `Link für ${name} kopiert.` : 'Link ohne Namen kopiert.');
      setTimeout(() => setCopiedMessage(''), 2200);
    } catch (err) {
      console.error(err);
      setAdminError('Link konnte nicht kopiert werden.');
    }
  };

  const handleCreateManagedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    setAdminMessage('');

    if (!newManagedUserName.trim()) {
      setAdminError('Bitte einen Namen eingeben.');
      return;
    }

    try {
      setAdminSubmitting(true);
      const response = await fetch(`/api/calendars/${calendarId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newManagedUserName }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAdminError(data.error || 'Nutzer konnte nicht angelegt werden.');
        return;
      }

      setNewManagedUserName('');
      setAdminMessage(`Nutzer ${data.name} angelegt.`);
      await fetchCalendarData();
    } catch (err) {
      console.error(err);
      setAdminError('Nutzer konnte nicht angelegt werden.');
    } finally {
      setAdminSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-3 py-6">
        <div className="app-panel flex w-full max-w-sm flex-col items-center gap-5 px-5 py-7 text-center">
          <AppBrand variant="stacked" title="Planung wird geladen" subtitle="Einen Moment bitte" />
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" />
        </div>
      </main>
    );
  }

  if (!calendar) {
    return (
      <main className="min-h-screen py-4 sm:py-6">
        <div className="app-shell space-y-4">
          <AppHeader subtitle="Planung nicht gefunden" backHref="/" backLabel="Startseite" />
          <section className="app-card px-4 py-8 text-center sm:px-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-red-100 text-red-700">
              <CalendarRange size={28} />
            </div>
            <h1 className="mt-4 text-2xl font-semibold text-slate-950">Planung nicht gefunden</h1>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
              {error || 'Der Link ist ungültig oder die Planung wurde gelöscht.'}
            </p>
          </section>
        </div>
      </main>
    );
  }

  const monthName = monthFormatter.format(currentDate);
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = (new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() + 6) % 7;
  const calendarStartMonth = new Date(fromDateKey(calendar.startDate).getFullYear(), fromDateKey(calendar.startDate).getMonth(), 1);
  const calendarEndMonth = new Date(fromDateKey(calendar.endDate).getFullYear(), fromDateKey(calendar.endDate).getMonth(), 1);
  const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const canGoPrevMonth = currentMonthStart.getTime() > calendarStartMonth.getTime();
  const canGoNextMonth = currentMonthStart.getTime() < calendarEndMonth.getTime();
  const days: (number | null)[] = Array(firstDay)
    .fill(null)
    .concat(Array.from({ length: daysInMonth }, (_, index) => index + 1));

  const backHref = permissions.isAuthenticated ? '/dashboard' : '/';
  const backLabel = permissions.isAuthenticated ? 'Dashboard' : 'Startseite';
  const totalSelectedDays = selectedDates.length;
  const totalSavedDays = selectedUserSavedDates.size;
  const totalCalendarDays = differenceInDays(calendar.startDate, calendar.endDate) + 1;
  const timelineBaseDayWidth = 20;
  const timelineNameColumnWidth = 148;
  const timelineChartWidth = Math.max(640, totalCalendarDays * timelineBaseDayWidth);
  const timelineDayWidth = timelineChartWidth / totalCalendarDays;
  const timelineTotalWidth = timelineNameColumnWidth + timelineChartWidth;
  const timelineDates = Array.from({ length: totalCalendarDays }, (_, index) => (
    addDays(calendar.startDate, index)
  ));
  const timelineFirstMondayIndex = Math.max(
    0,
    timelineDates.findIndex((dateKey) => fromDateKey(dateKey).getDay() === 1)
  );
  const timelineGridStyle = {
    backgroundImage: [
      'linear-gradient(to right, rgba(148, 163, 184, 0.2) 1px, transparent 1px)',
      'linear-gradient(to right, rgba(15, 23, 42, 0.08) 1px, transparent 1px)',
    ].join(', '),
    backgroundSize: `${timelineDayWidth}px 100%, ${timelineDayWidth * 7}px 100%`,
    backgroundPosition: `0 0, ${timelineFirstMondayIndex * timelineDayWidth}px 0`,
  };
  const timelineMonthSegments = timelineDates.reduce<{
    key: string;
    label: string;
    startIndex: number;
    spanDays: number;
  }[]>((segments, dateKey, index) => {
    const key = dateKey.slice(0, 7);
    const lastSegment = segments.at(-1);

    if (lastSegment?.key === key) {
      lastSegment.spanDays += 1;
      return segments;
    }

    segments.push({
      key,
      label: timelineMonthFormatter.format(fromDateKey(dateKey)),
      startIndex: index,
      spanDays: 1,
    });

    return segments;
  }, []);
  const timelineTicks = timelineDates
    .map((dateKey, index) => ({ dateKey, index }))
    .filter(({ dateKey, index }) => {
      const date = fromDateKey(dateKey);
      return index === 0
        || date.getDay() === 1;
    })
    .map((tick) => ({
      ...tick,
      left: tick.index * timelineDayWidth,
      isStart: tick.index === 0,
    }));
  const maxAvailableCount = Math.max(
    0,
    ...timelineDates.map((dateKey) => availabilityCountByDate.get(dateKey) ?? 0)
  );
  const summaryAvailabilityBlocks = timelineDates
    .reduce<{
      id: string;
      startDate: string;
      endDate: string;
      startIndex: number;
      spanDays: number;
      count: number;
      opacity: number;
    }[]>((blocks, dateKey, index) => {
      const count = availabilityCountByDate.get(dateKey) ?? 0;

      if (count <= 0) {
        return blocks;
      }

      const opacity = 0.18 + (count / Math.max(maxAvailableCount, 1)) * 0.62;
      const lastBlock = blocks.at(-1);

      if (lastBlock?.count === count && lastBlock.startIndex + lastBlock.spanDays === index) {
        lastBlock.endDate = dateKey;
        lastBlock.spanDays += 1;
        return blocks;
      }

      blocks.push({
        id: dateKey,
        startDate: dateKey,
        endDate: dateKey,
        startIndex: index,
        spanDays: 1,
        count,
        opacity,
      });

      return blocks;
    }, [])
    .map((block) => ({
      ...block,
      hasPreviousAvailability: block.startIndex > 0
        && (availabilityCountByDate.get(timelineDates[block.startIndex - 1]) ?? 0) > 0,
      hasNextAvailability: block.startIndex + block.spanDays < totalCalendarDays
        && (availabilityCountByDate.get(timelineDates[block.startIndex + block.spanDays]) ?? 0) > 0,
    }));
  const participantsWithAvailability = users.filter((user) => (
    availability.some((entry) => entry.userId === user.id)
  )).length;
  const mergedAvailabilityAreaCount = users.reduce((areaCount, user) => (
    areaCount + (mergedAvailabilityByUser.get(user.id)?.length || 0)
  ), 0);
  const timelineRows = users.map((user, userIndex) => {
    const color = timelineColors[userIndex % timelineColors.length];
    const ranges = (mergedAvailabilityByUser.get(user.id) || [])
      .flatMap((entry) => {
        const startDate = clampDateKey(entry.startDate, calendar.startDate, calendar.endDate);
        const endDate = clampDateKey(entry.endDate, calendar.startDate, calendar.endDate);

        if (startDate > endDate) {
          return [];
        }

        const offsetDays = differenceInDays(calendar.startDate, startDate);
        const spanDays = differenceInDays(startDate, endDate) + 1;

        return [{
          id: entry.ids.join('-'),
          startDate,
          endDate,
          spanDays,
          left: `${(offsetDays / totalCalendarDays) * 100}%`,
          width: `max(${(spanDays / totalCalendarDays) * 100}%, 0.75rem)`,
        }];
      });

    return {
      user,
      color,
      ranges,
    };
  });

  return (
    <main className="min-h-screen py-4 sm:py-6">
      <div className="app-shell space-y-4">
        <AppHeader subtitle={calendar.title} backHref={backHref} backLabel={backLabel} />

        <section className="app-card px-4 py-5 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                {calendar.title}
              </h1>
              {calendar.description && (
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {calendar.description}
                </p>
              )}
              
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
                  <CalendarRange size={15} />
                  {formatDate(calendar.startDate)} bis {formatDate(calendar.endDate)}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
                  <Clock3 size={15} />
                  Min. {calendar.minDurationDays} Tage
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-sm font-medium text-white w-fit">
                <Users size={16} />
                {users.length} Teilnehmende
              </div>

              <div>
                <p className="app-kicker">Schritt 1: Name auswählen</p>
                <button type="button" onClick={() => setNameModalOpen(true)} className="app-button-secondary w-full mt-2">
                  <UserRound size={18} />
                  {selectedUser ? selectedUser : 'Name auswählen'}
                </button>
                {selectedUser && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                      {totalSavedDays} Tage gespeichert
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        

        {selectedUser && (
          <form
            onSubmit={handleSubmit}
            onPointerDownCapture={clearMessages}
            onKeyDownCapture={clearMessages}
            className="app-card px-4 py-5 sm:px-6"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="app-kicker">Schritt 2</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">Tage markieren</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Tage antippen oder mit dem Finger über mehrere Tage wischen. Neue Tage müssen zusammen mit angrenzenden gespeicherten Tagen mindestens {calendar.minDurationDays} zusammenhängende Tage ergeben.
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-blue-700">
                    <span className="h-3 w-3 rounded-full bg-blue-600" />
                    Neue Auswahl
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
                    <span className="h-3 w-3 rounded-full border border-emerald-300 bg-emerald-200" />
                    Bereits gespeichert
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-red-700">
                    <span className="h-3 w-3 rounded-full border border-red-300 bg-red-200" />
                    Lösch-Auswahl
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">
                    <span className="h-3 w-3 rounded-full border border-amber-300 bg-amber-200" />
                    Mindestdauer-Konflikt
                  </span>
                </div>
              </div>
              <div className={`rounded-2xl px-4 py-3 text-sm ${
                pendingDeleteDates.length > 0 ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-slate-50 text-slate-700'
              }`}>
                <p>{pendingDeleteDates.length > 0 ? `${pendingDeleteDates.length} Tag${pendingDeleteDates.length === 1 ? '' : 'e'} zum Löschen` : `${totalSelectedDays} Tage markiert`}</p>
                <p>{pendingDeleteDates.length > 0 ? 'Lösch-Auswahl aktiv' : `${selectedRanges.length} Auswahl${selectedRanges.length === 1 ? '' : 'en'}`}</p>
              </div>
            </div>

            <div className="mt-5 rounded-[1.25rem] border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1, 12, 0, 0))}
                  className="app-button-ghost px-3"
                  disabled={!canGoPrevMonth}
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-base font-semibold capitalize text-slate-950">{monthName}</span>
                <button
                  type="button"
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1, 12, 0, 0))}
                  className="app-button-ghost px-3"
                  disabled={!canGoNextMonth}
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
                  <div key={day} className="py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="mt-1 grid grid-cols-7 gap-1 touch-none select-none" onPointerMove={handleDayPointerMove}>
                {days.map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className="aspect-square" />;
                  }

                  const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day, 12, 0, 0);
                  const dateKey = toDateKey(date);
                  const inRange = date >= fromDateKey(calendar.startDate) && date <= fromDateKey(calendar.endDate);
                  const isSelected = selectedDates.includes(dateKey);
                  const isInvalidSelection = invalidSelectedDateKeys.has(dateKey);
                  const isSavedBySelectedUser = selectedUserSavedDates.has(dateKey);
                  const isPendingDelete = pendingDeleteDates.includes(dateKey);
                  const hasDeleteConflict = deleteConflictDateKeys.has(dateKey);
                  const isLockedByDeleteSelection = pendingDeleteDates.length > 0 && !isPendingDelete && !isSavedBySelectedUser;
                  const count = availabilityCountByDate.get(dateKey) ?? 0;
                  const dayTooltip = isPendingDelete
                    ? 'Aus Lösch-Auswahl entfernen'
                    : isLockedByDeleteSelection
                    ? 'Erst Lösch-Auswahl löschen oder aufheben'
                    : hasDeleteConflict
                    ? `Mitlöschen, sonst bleibt ein Block unter ${calendar.minDurationDays} Tagen übrig`
                    : isSavedBySelectedUser
                    ? 'Gespeicherten Tag zur Lösch-Auswahl hinzufügen'
                    : undefined;

                  return (
                    <button
                      key={dateKey}
                      data-date-key={dateKey}
                      type="button"
                      disabled={!inRange || submitting || deletingAvailability}
                      aria-pressed={isSelected || isPendingDelete}
                      aria-label={dayTooltip}
                      onPointerEnter={(event) => showHoverTooltip(event, dayTooltip)}
                      onPointerMove={moveHoverTooltip}
                      onPointerLeave={hideMouseTooltip}
                      onPointerCancel={hideHoverTooltip}
                      onBlur={hideHoverTooltip}
                      onPointerDown={(event) => {
                        hideHoverTooltip();
                        handleDayPointerDown(event, dateKey);
                      }}
                      onPointerUp={handleDayPointerUp}
                      onKeyDown={(event) => {
                        if (event.key === ' ' || event.key === 'Enter') {
                          event.preventDefault();
                          handleDayKeyToggle(dateKey);
                        }
                      }}
                      className={`relative flex aspect-square min-h-12 flex-col items-center justify-center rounded-[0.95rem] border text-sm font-semibold transition-colors ${
                        !inRange
                          ? 'border-transparent bg-slate-100 text-slate-300'
                          : isPendingDelete
                          ? 'border-red-300 bg-red-50 text-red-700 shadow-[0_0_0_3px_rgba(254,202,202,0.7)]'
                          : hasDeleteConflict
                          ? 'border-amber-300 bg-amber-50 text-amber-800 shadow-[0_0_0_3px_rgba(253,230,138,0.55)]'
                          : isLockedByDeleteSelection
                          ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 opacity-70'
                          : isInvalidSelection
                          ? 'border-amber-300 bg-amber-50 text-amber-800 shadow-[0_18px_30px_-24px_rgba(245,158,11,0.45)]'
                          : isSelected
                          ? 'border-blue-300 bg-blue-50 text-blue-700'
                          : isSavedBySelectedUser
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800 shadow-[0_18px_30px_-24px_rgba(16,185,129,0.55)]'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <span>{day}</span>
                      {isSavedBySelectedUser && (
                        <span className={`absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full ${
                          isPendingDelete
                            ? 'bg-red-100 text-red-700'
                            : hasDeleteConflict
                            ? 'bg-amber-100 text-amber-700'
                            : isSelected
                            ? 'bg-blue-200 text-blue-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isPendingDelete ? (
                            <Trash2 size={12} />
                          ) : hasDeleteConflict ? (
                            <AlertTriangle size={12} />
                          ) : (
                            <Check size={12} />
                          )}
                        </span>
                      )}
                      {count > 0 && (
                        <span className={`mt-1 rounded-full px-1.5 text-[10px] font-medium ${
                          isPendingDelete
                            ? 'bg-red-100 text-red-700'
                            : isLockedByDeleteSelection
                            ? 'bg-slate-100 text-slate-400'
                            : hasDeleteConflict
                            ? 'bg-amber-100 text-amber-700'
                            : isInvalidSelection
                            ? 'bg-amber-100 text-amber-700'
                            : isSelected
                            ? 'bg-blue-200 text-blue-700'
                            : isSavedBySelectedUser
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {pendingDeleteDates.length > 0 && selectedUser && (
                <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-4 text-red-800">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                        <AlertTriangle size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Rote Lösch-Auswahl aktiv</p>
                        <p className="mt-1 text-sm leading-6 text-red-700">
                          {pendingDeleteDates.length === 1
                            ? `${formatDate(pendingDeleteDates[0])} wird für ${selectedUser} gelöscht.`
                            : `${pendingDeleteDates.length} Tage werden für ${selectedUser} gelöscht.`}
                          {' '}Normale Tage sind blockiert, bis Sie löschen oder die Auswahl aufheben.
                        </p>
                        {remainingDeleteConflictRanges.length > 0 && (
                          <div className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-medium leading-5 text-amber-800 ring-1 ring-amber-200">
                            Gelb markierte Tage würden als zu kurzer Block übrig bleiben: {formatDateRangeList(remainingDeleteConflictRanges)}. Wählen Sie sie zusätzlich aus oder heben Sie die Lösch-Auswahl auf.
                          </div>
                        )}
                        <p className="mt-1 text-xs font-medium text-red-600">
                          {pendingDeleteDates.length} gespeicherte Tag{pendingDeleteDates.length === 1 ? '' : 'e'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                      <button
                        type="button"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={deletingAvailability}
                        onClick={cancelDeleteSelection}
                      >
                        Auswahl aufheben
                      </button>
                      <div
                        className="flex"
                        onPointerEnter={(event) => showHoverTooltip(
                          event,
                          !canDeletePendingDates
                            ? `Gelbe Tage mitlöschen oder Lösch-Auswahl aufheben. Mindestdauer: ${calendar?.minDurationDays ?? 1} Tage`
                            : undefined
                        )}
                        onPointerDown={(event) => showTouchTooltip(
                          event,
                          !canDeletePendingDates
                            ? `Gelbe Tage mitlöschen oder Lösch-Auswahl aufheben. Mindestdauer: ${calendar?.minDurationDays ?? 1} Tage`
                            : undefined
                        )}
                        onPointerMove={moveHoverTooltip}
                        onPointerLeave={hideMouseTooltip}
                        onPointerCancel={hideHoverTooltip}
                      >
                        <button
                          type="button"
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-[0_18px_30px_-24px_rgba(220,38,38,0.8)] transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                          disabled={deletingAvailability || !canDeletePendingDates}
                          onClick={confirmDeleteSavedDate}
                        >
                          <Trash2 size={16} />
                          {deletingAvailability ? 'Wird gelöscht...' : 'Löschen'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedRanges.length > 0 && (
                <div className="app-panel p-4">
                  <p className="text-sm font-semibold text-slate-950">Auswahl</p>
                  <div className="mt-3 space-y-2">
                    {selectedRanges.map((range) => {
                      const hasRangeConflict = selectedAddConflictRanges.some((conflictRange) => (
                        conflictRange.startDate <= range.endDate && conflictRange.endDate >= range.startDate
                      ));

                      return (
                        <div
                          key={`${range.startDate}-${range.endDate}`}
                          className={`flex items-start justify-between gap-3 rounded-2xl px-3 py-3 text-sm ${
                            hasRangeConflict
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span>{formatDate(range.startDate)} bis {formatDate(range.endDate)}</span>
                          <span className={`shrink-0 font-medium ${
                            hasRangeConflict ? 'text-amber-700' : 'text-emerald-700'
                          }`}>
                            {range.days} neue Tag{range.days === 1 ? '' : 'e'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {hasInvalidSelection && shouldShowSelectionWarning && (
                <Notice tone="warning">
                  Gelb markierte Blöcke liegen auch mit angrenzenden gespeicherten Tagen unter der Mindestdauer von {calendar.minDurationDays} Tagen.
                </Notice>
              )}
              {error && <Notice tone="error">{error}</Notice>}
              {successMessage && <Notice tone="success">{successMessage}</Notice>}
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={submitting || pendingDeleteDates.length > 0 || selectedRanges.length === 0}
                className="app-button w-full sm:w-auto"
              >
                <CalendarPlus2 size={18} />
                {submitting ? 'Wird gespeichert...' : 'Auswahl speichern'}
              </button>
              {selectedDates.length > 0 && (
                <button
                  type="button"
                  className="app-button-secondary w-full sm:w-auto"
                  onClick={() => {
                    setSelectedDates([]);
                    setPendingDeleteDates([]);
                    clearMessages();
                  }}
                >
                  Auswahl aufheben
                </button>
              )}
            </div>
          </form>
        )}

        <section className="calendar-results-card app-card px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="app-kicker">Alle Teilnehmenden</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Auswertung und Verfügbarkeiten</h2>
              <p className="mt-1 text-sm text-slate-600">
                {formatDate(calendar.startDate)} bis {formatDate(calendar.endDate)}
              </p>
            </div>
          </div>

          {users.length > 0 ? (
            <div className="mt-5 overflow-x-auto pb-2">
              <div
                className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white"
                style={{ width: timelineTotalWidth, minWidth: '100%' }}
              >
                <div
                  className="grid border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500"
                  style={{ gridTemplateColumns: `${timelineNameColumnWidth}px ${timelineChartWidth}px` }}
                >
                  <div className="sticky left-0 z-20 flex items-center border-r border-slate-200 bg-slate-50 px-3 py-3">
                    Name
                  </div>
                  <div className="bg-slate-50">
                    <div className="relative h-8 border-b border-slate-200/80 text-[11px] font-semibold normal-case text-slate-700">
                      {timelineMonthSegments.map((segment) => (
                        <div
                          key={segment.key}
                          className="absolute top-0 flex h-full items-center justify-center border-r border-slate-200/80 px-2 last:border-r-0"
                          style={{
                            left: segment.startIndex * timelineDayWidth,
                            width: segment.spanDays * timelineDayWidth,
                          }}
                        >
                          <span className="truncate">{segment.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="relative h-12" style={timelineGridStyle}>
                      {timelineTicks.map(({ dateKey, index, left, isStart }) => {
                        const labelPositionClass = isStart
                          ? 'translate-x-0 text-left'
                          : timelineChartWidth - left < 36
                          ? '-translate-x-full text-right'
                          : '-translate-x-1/2 text-center';
                        const markerClass = isStart
                          ? 'top-0 h-full w-0.5 rounded-full bg-blue-500'
                          : 'top-1 h-3 w-px bg-slate-300';
                        const labelClass = isStart
                          ? 'top-1 text-blue-700'
                          : 'bottom-2 text-slate-500';

                        return (
                          <div
                            key={`${dateKey}-${index}`}
                            className="absolute top-0 h-full"
                            style={{ left }}
                          >
                            <span className={`absolute left-0 ${markerClass}`} />
                            <span className={`absolute left-0 whitespace-nowrap text-[10px] font-medium normal-case ${labelClass} ${labelPositionClass}`}>
                              {formatShortDate(dateKey)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div
                  className="grid border-b border-slate-200 bg-white"
                  style={{ gridTemplateColumns: `${timelineNameColumnWidth}px ${timelineChartWidth}px` }}
                >
                  <div className="sticky left-0 z-20 flex items-center border-r border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700">
                    Gesamt
                  </div>
                  <div className="relative h-11 py-2">
                    {summaryAvailabilityBlocks.map((block) => {
                      const roundedClass = `${block.hasPreviousAvailability ? 'rounded-l-none' : 'rounded-l-sm'} ${
                        block.hasNextAvailability ? 'rounded-r-none' : 'rounded-r-sm'
                      }`;
                      const title = block.spanDays === 1
                        ? `${formatDate(block.startDate)}: ${block.count} verfügbar`
                        : `${formatDate(block.startDate)} bis ${formatDate(block.endDate)}: ${block.count} verfügbar`;

                      return (
                        <div
                          key={block.id}
                          aria-label={title}
                          onPointerEnter={(event) => showHoverTooltip(event, title)}
                          onPointerDown={(event) => showTouchTooltip(event, title)}
                          onPointerMove={moveHoverTooltip}
                          onPointerLeave={hideMouseTooltip}
                          onPointerCancel={hideHoverTooltip}
                          className={`absolute bottom-2 top-2 ${roundedClass}`}
                          style={{
                            left: block.startIndex * timelineDayWidth,
                            width: block.spanDays * timelineDayWidth,
                            backgroundColor: `rgba(22, 163, 74, ${block.opacity})`,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>

                {timelineRows.map(({ user, color, ranges }) => (
                  <div
                    key={user.id}
                    className="grid min-h-14 border-b border-slate-100 last:border-b-0"
                    style={{ gridTemplateColumns: `${timelineNameColumnWidth}px ${timelineChartWidth}px` }}
                  >
                    <div className={`sticky left-0 z-10 flex min-w-0 items-center gap-2 border-r border-slate-200 px-3 py-3 ${
                      selectedUser === user.name ? 'bg-emerald-50' : 'bg-white'
                    }`}>
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color.dot}`} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{user.name}</p>
                        <p className="text-xs text-slate-500">
                          {mergedAvailabilityByUser.get(user.id)?.length ?? 0} Tag{(mergedAvailabilityByUser.get(user.id)?.length ?? 0) === 1 ? '' : 'e'}
                        </p>
                      </div>
                    </div>

                    <div className="relative h-14 bg-slate-50/60" style={timelineGridStyle}>
                      {ranges.length > 0 ? ranges.map((range) => {
                        const title = `${user.name}: ${formatDate(range.startDate)} bis ${formatDate(range.endDate)}`;

                        return (
                          <div
                            key={range.id}
                            aria-label={title}
                            onPointerEnter={(event) => showHoverTooltip(event, title)}
                            onPointerDown={(event) => showTouchTooltip(event, title)}
                            onPointerMove={moveHoverTooltip}
                            onPointerLeave={hideMouseTooltip}
                            onPointerCancel={hideHoverTooltip}
                            className={`absolute top-1/2 h-7 -translate-y-1/2 rounded-md ${color.bar} ${color.glow}`}
                            style={{ left: range.left, width: range.width }}
                          >
                            <span className="sr-only">{title}</span>
                          </div>
                        );
                      }) : (
                        <div className="flex h-full items-center px-3 text-sm text-slate-400">
                          Keine Einträge
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Noch keine Namen vorhanden.
            </div>
          )}

        </section>

        {permissions.canManage && (
          <section className="app-card px-4 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Admin-Bereich</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Verwaltung der Planung, Links und Teilnehmer.
                </p>
              </div>
              <Link 
                href={`/admin/calendars/${calendarId}/edit`}
                className="app-button"
              >
                <Settings2 size={18} />
                <span className="hidden sm:inline">Verwalten</span>
              </Link>
            </div>
          </section>
        )}

        {nameModalOpen && (
          <NamePickerModal
            loading={submitting}
            selectedUser={selectedUser}
            existingUsers={existingUserOptions}
            onClose={() => setNameModalOpen(false)}
            onSelect={handleUserSelection}
          />
        )}

        {hoverTooltip && (
          <div
            role="tooltip"
            className="pointer-events-none fixed z-[80] rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-medium leading-5 text-white shadow-lg"
            style={{
              left: hoverTooltip.x,
              top: hoverTooltip.y,
              maxWidth: HOVER_TOOLTIP_MAX_WIDTH,
            }}
          >
            {hoverTooltip.text}
          </div>
        )}
      </div>
    </main>
  );
}
