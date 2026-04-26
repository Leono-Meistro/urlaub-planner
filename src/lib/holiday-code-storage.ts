import { normalizeCalendarAdminCode } from '@/lib/calendar-code';

const holidayCodeStorageKey = 'urlaub-planner:last-holiday-code';

export function readStoredHolidayCode() {
  if (typeof window === 'undefined') {
    return '';
  }

  return normalizeCalendarAdminCode(window.localStorage.getItem(holidayCodeStorageKey) || '');
}

export function storeHolidayCode(code: string) {
  const normalizedCode = normalizeCalendarAdminCode(code);
  if (!normalizedCode || typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(holidayCodeStorageKey, normalizedCode);
}
