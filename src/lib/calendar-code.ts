export function normalizeCalendarAdminCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}
