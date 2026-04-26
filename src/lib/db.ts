import Database from 'better-sqlite3';
import path from 'path';
import { createHash } from 'crypto';
import { normalizeCalendarAdminCode } from '@/lib/calendar-code';

let db: Database;

export function getDatabase() {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'data', 'calendar.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    initializeDatabase();
  }
  return db;
}

function initializeDatabase() {
  const db = getDatabase();

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      username TEXT NOT NULL,
      passwordHash TEXT NOT NULL,
      isSupervisor INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS calendars (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      minDurationDays INTEGER NOT NULL DEFAULT 1,
      createdByUserId INTEGER,
      createdAt TEXT NOT NULL,
      adminCode TEXT UNIQUE NOT NULL,
      FOREIGN KEY (createdByUserId) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      calendarId TEXT NOT NULL,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (calendarId) REFERENCES calendars(id),
      UNIQUE(calendarId, name)
    );

    CREATE TABLE IF NOT EXISTS availability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      calendarId TEXT NOT NULL,
      userId INTEGER NOT NULL,
      userName TEXT NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (calendarId) REFERENCES calendars(id),
      FOREIGN KEY (userId) REFERENCES users(id),
      UNIQUE(calendarId, userId, startDate, endDate)
    );

    CREATE INDEX IF NOT EXISTS idx_availability_calendar ON availability(calendarId);
    CREATE INDEX IF NOT EXISTS idx_availability_user ON availability(calendarId, userId);
    CREATE INDEX IF NOT EXISTS idx_users_calendar ON users(calendarId);
    CREATE INDEX IF NOT EXISTS idx_calendars_user ON calendars(createdByUserId);
    CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
    CREATE INDEX IF NOT EXISTS idx_accounts_supervisor ON accounts(isSupervisor);
  `);

  // Create default supervisor account if it doesn't exist
  const supervisorExists = db
    .prepare('SELECT id FROM accounts WHERE isSupervisor = 1')
    .get();

  if (!supervisorExists) {
    const supervisorPassword = 'admin123'; // Default password
    const passwordHash = createHash('sha256').update(supervisorPassword).digest('hex');

    db.prepare(`
      INSERT INTO accounts (email, username, passwordHash, isSupervisor, createdAt)
      VALUES (?, ?, ?, 1, ?)
    `).run('admin@urlaub.local', 'Administrator', passwordHash, new Date().toISOString());
  }
}

export interface Calendar {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  minDurationDays: number;
  createdAt: string;
  adminCode: string;
}

export interface User {
  id: number;
  calendarId: string;
  name: string;
  createdAt: string;
}

export interface Availability {
  id: number;
  calendarId: string;
  userId: number;
  userName: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

interface ShortDateRange {
  startDate: string;
  endDate: string;
  days: number;
}

interface AvailabilityDeleteResult {
  blocked: boolean;
  deletedCount: number;
  invalidRange?: ShortDateRange;
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

function findShortDateRange(dateKeys: Set<string>, minDurationDays: number): ShortDateRange | null {
  const sortedDates = Array.from(dateKeys).sort();
  if (sortedDates.length === 0 || minDurationDays <= 1) {
    return null;
  }

  let rangeStart = sortedDates[0];
  let previousDate = sortedDates[0];

  for (let index = 1; index < sortedDates.length; index += 1) {
    const currentDate = sortedDates[index];
    if (differenceInDays(previousDate, currentDate) === 1) {
      previousDate = currentDate;
      continue;
    }

    const days = differenceInDays(rangeStart, previousDate) + 1;
    if (days < minDurationDays) {
      return { startDate: rangeStart, endDate: previousDate, days };
    }

    rangeStart = currentDate;
    previousDate = currentDate;
  }

  const days = differenceInDays(rangeStart, previousDate) + 1;
  if (days < minDurationDays) {
    return { startDate: rangeStart, endDate: previousDate, days };
  }

  return null;
}

function normalizeAvailabilityDateKeys(dateKeys: string[]) {
  return Array.from(new Set(
    dateKeys.filter((dateKey) => (
      typeof dateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateKey)
    ))
  )).sort();
}

function getAvailabilityEntriesForUser(
  db: Database,
  calendarId: string,
  userId?: number,
  userName?: string
) {
  const normalizedName = userName?.trim();

  if (!userId && !normalizedName) {
    return [];
  }

  return db.prepare(`
    SELECT * FROM availability
    WHERE calendarId = ?
      AND (userId = ? OR lower(userName) = lower(?))
  `).all(calendarId, userId ?? -1, normalizedName ?? '') as Availability[];
}

export function createCalendar(
  title: string,
  description: string,
  startDate: string,
  endDate: string,
  minDurationDays: number = 1,
  createdByUserId?: number
): Calendar {
  const db = getDatabase();
  const id = Math.random().toString(36).substring(2, 11);

  const adminCode = normalizeCalendarAdminCode(title);
  if (!adminCode) {
    throw new Error('Admin code cannot be empty');
  }
  
  const createdAt = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO calendars (id, title, description, startDate, endDate, minDurationDays, createdByUserId, createdAt, adminCode)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, title, description, startDate, endDate, minDurationDays, createdByUserId || null, createdAt, adminCode);

  return {
    id,
    title,
    description,
    startDate,
    endDate,
    minDurationDays,
    createdAt,
    adminCode,
  };
}

export function getCalendar(id: string): Calendar | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM calendars WHERE id = ?');
  return stmt.get(id) as Calendar | undefined || null;
}

export function getCalendarByAdminCode(adminCode: string): Calendar | null {
  const db = getDatabase();
  const normalizedAdminCode = normalizeCalendarAdminCode(adminCode);
  const stmt = db.prepare('SELECT * FROM calendars WHERE lower(adminCode) = lower(?)');
  return stmt.get(normalizedAdminCode) as Calendar | undefined || null;
}

export function getCalendarByTitle(title: string): Calendar | null {
  const db = getDatabase();
  const normalizedTitle = title.trim();

  const stmt = db.prepare(`
    SELECT * FROM calendars
    WHERE lower(trim(title)) = lower(trim(?))
    LIMIT 1
  `);

  return stmt.get(normalizedTitle) as Calendar | undefined || null;
}

export function updateCalendar(
  calendarId: string,
  updates: {
    title?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    minDurationDays?: number;
  }
): Calendar | null {
  const db = getDatabase();
  const calendar = getCalendar(calendarId);
  
  if (!calendar) {
    return null;
  }

  const newTitle = updates.title ?? calendar.title;
  const newDescription = updates.description ?? calendar.description;
  const newStartDate = updates.startDate ?? calendar.startDate;
  const newEndDate = updates.endDate ?? calendar.endDate;
  const newMinDurationDays = updates.minDurationDays ?? calendar.minDurationDays;

  const stmt = db.prepare(`
    UPDATE calendars 
    SET title = ?, description = ?, startDate = ?, endDate = ?, minDurationDays = ?
    WHERE id = ?
  `);

  stmt.run(newTitle, newDescription, newStartDate, newEndDate, newMinDurationDays, calendarId);

  return getCalendar(calendarId);
}


export function addAvailabilityDays(
  calendarId: string,
  userId: number,
  userName: string,
  startDate: string,
  endDate: string
): Availability[] {
  const db = getDatabase();
  const createdAt = new Date().toISOString();
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO availability (calendarId, userId, userName, startDate, endDate, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const existingStmt = db.prepare(
    'SELECT * FROM availability WHERE calendarId = ? AND userId = ? AND startDate <= ? AND endDate >= ? LIMIT 1'
  );
  const selectStmt = db.prepare(
    'SELECT * FROM availability WHERE calendarId = ? AND userId = ? AND startDate = ? AND endDate = ?'
  );
  const savedAvailability: Availability[] = [];

  forEachDateInRange(startDate, endDate, (dateKey) => {
    const existingAvailability = existingStmt.get(calendarId, userId, dateKey, dateKey) as Availability | undefined;
    if (existingAvailability) {
      savedAvailability.push(existingAvailability);
      return;
    }

    insertStmt.run(calendarId, userId, userName, dateKey, dateKey, createdAt);
    savedAvailability.push(selectStmt.get(calendarId, userId, dateKey, dateKey) as Availability);
  });

  return savedAvailability;
}

export function getOrCreateUser(calendarId: string, userName: string): User {
  const db = getDatabase();
  const normalizedName = userName.trim();
  
  const stmt = db.prepare('SELECT * FROM users WHERE calendarId = ? AND lower(name) = lower(?)');
  const user = stmt.get(calendarId, normalizedName) as User | undefined;
  
  if (user) {
    return user;
  }
  
  const createdAt = new Date().toISOString();
  const insertStmt = db.prepare(
    'INSERT INTO users (calendarId, name, createdAt) VALUES (?, ?, ?)'
  );
  const result = insertStmt.run(calendarId, normalizedName, createdAt);
  
  return {
    id: result.lastInsertRowid as number,
    calendarId,
    name: normalizedName,
    createdAt,
  };
}

export function getCalendarUsers(calendarId: string): User[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM users WHERE calendarId = ? ORDER BY name');
  return stmt.all(calendarId) as User[];
}

export function getAvailability(calendarId: string): Availability[] {
  const db = getDatabase();
  const stmt = db.prepare(
    'SELECT * FROM availability WHERE calendarId = ? ORDER BY startDate, endDate'
  );
  return stmt.all(calendarId) as Availability[];
}

export function getUserAvailability(calendarId: string, userId: number): Availability[] {
  const db = getDatabase();
  const stmt = db.prepare(
    'SELECT * FROM availability WHERE calendarId = ? AND userId = ? ORDER BY startDate'
  );
  return stmt.all(calendarId, userId) as Availability[];
}

export function deleteAvailabilityRecords(
  calendarId: string,
  availabilityIds: number[]
): number {
  const db = getDatabase();
  const normalizedIds = availabilityIds.filter((id) => Number.isInteger(id) && id > 0);

  if (normalizedIds.length === 0) {
    return 0;
  }

  const stmt = db.prepare(
    'DELETE FROM availability WHERE calendarId = ? AND id = ?'
  );
  let deletedCount = 0;

  normalizedIds.forEach((id) => {
    deletedCount += stmt.run(calendarId, id).changes;
  });

  return deletedCount;
}

export function deleteAvailabilityDay(
  calendarId: string,
  dateKey: string,
  minDurationDays: number,
  userId?: number,
  userName?: string
): AvailabilityDeleteResult {
  return deleteAvailabilityDays(
    calendarId,
    [dateKey],
    minDurationDays,
    userId,
    userName
  );
}

export function deleteAvailabilityDays(
  calendarId: string,
  dateKeys: string[],
  minDurationDays: number,
  userId?: number,
  userName?: string
): AvailabilityDeleteResult {
  const db = getDatabase();
  const normalizedDateKeys = normalizeAvailabilityDateKeys(dateKeys);

  if (normalizedDateKeys.length === 0) {
    return { blocked: false, deletedCount: 0 };
  }

  const entries = getAvailabilityEntriesForUser(db, calendarId, userId, userName);
  if (entries.length === 0) {
    return { blocked: false, deletedCount: 0 };
  }

  const savedDates = new Set<string>();
  entries.forEach((entry) => {
    forEachDateInRange(entry.startDate, entry.endDate, (entryDateKey) => {
      savedDates.add(entryDateKey);
    });
  });

  const datesToDelete = new Set(normalizedDateKeys.filter((dateKey) => savedDates.has(dateKey)));

  if (datesToDelete.size === 0) {
    return { blocked: false, deletedCount: 0 };
  }

  datesToDelete.forEach((dateKey) => {
    savedDates.delete(dateKey);
  });

  const invalidRange = findShortDateRange(savedDates, minDurationDays);
  if (invalidRange) {
    return { blocked: true, deletedCount: 0, invalidRange };
  }

  const entriesToUpdate = entries.filter((entry) => {
    let touchesDeletedDate = false;

    forEachDateInRange(entry.startDate, entry.endDate, (entryDateKey) => {
      if (datesToDelete.has(entryDateKey)) {
        touchesDeletedDate = true;
      }
    });

    return touchesDeletedDate;
  });

  const deleteStmt = db.prepare('DELETE FROM availability WHERE calendarId = ? AND id = ?');
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO availability (calendarId, userId, userName, startDate, endDate, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const applyDelete = db.transaction(() => {
    entriesToUpdate.forEach((entry) => {
      deleteStmt.run(calendarId, entry.id);

      forEachDateInRange(entry.startDate, entry.endDate, (entryDateKey) => {
        if (!datesToDelete.has(entryDateKey)) {
          insertStmt.run(
            calendarId,
            entry.userId,
            entry.userName,
            entryDateKey,
            entryDateKey,
            entry.createdAt
          );
        }
      });
    });
  });

  applyDelete();

  return { blocked: false, deletedCount: datesToDelete.size };
}

export function deleteCalendar(id: string): boolean {
  const db = getDatabase();
  
  // Delete availability records first
  const deleteAvailStmt = db.prepare('DELETE FROM availability WHERE calendarId = ?');
  deleteAvailStmt.run(id);
  
  // Delete users
  const deleteUsersStmt = db.prepare('DELETE FROM users WHERE calendarId = ?');
  deleteUsersStmt.run(id);
  
  // Delete calendar
  const deleteCalStmt = db.prepare('DELETE FROM calendars WHERE id = ?');
  const result = deleteCalStmt.run(id);
  
  return result.changes > 0;
}

// Account management
export interface Account {
  id: number;
  email: string;
  username: string;
  isSupervisor: boolean;
  createdAt: string;
}

export interface AccountWithPassword extends Account {
  passwordHash: string;
}

interface AccountRow {
  id: number;
  email: string;
  username: string;
  isSupervisor: number;
  createdAt: string;
}

function mapAccountRow(result: AccountRow): Account {
  return {
    id: result.id,
    email: result.email,
    username: result.username,
    isSupervisor: result.isSupervisor === 1,
    createdAt: result.createdAt,
  };
}

export async function createAccount(
  email: string,
  username: string,
  password: string,
  isSupervisor: boolean = false
): Promise<Account | null> {
  const db = getDatabase();
  
  const existingStmt = db.prepare('SELECT id FROM accounts WHERE email = ?');
  if (existingStmt.get(email)) {
    return null;
  }
  
  const passwordHash = createHash('sha256').update(password).digest('hex');
  
  const createdAt = new Date().toISOString();
  const insertStmt = db.prepare(
    'INSERT INTO accounts (email, username, passwordHash, isSupervisor, createdAt) VALUES (?, ?, ?, ?, ?)'
  );
  
  const result = insertStmt.run(email, username, passwordHash, isSupervisor ? 1 : 0, createdAt);
  
  return {
    id: result.lastInsertRowid as number,
    email,
    username,
    isSupervisor,
    createdAt,
  };
}

export async function registerUser(email: string, username: string, password: string): Promise<Account | null> {
  return createAccount(email, username, password, false);
}

export function loginUser(email: string, password: string): Account | null {
  const db = getDatabase();
  const passwordHash = createHash('sha256').update(password).digest('hex');
  
  const stmt = db.prepare('SELECT id, email, username, isSupervisor, createdAt FROM accounts WHERE email = ? AND passwordHash = ?');
  const result = stmt.get(email, passwordHash) as AccountRow | undefined;
  return result ? mapAccountRow(result) : null;
}

export function getUserById(id: number): Account | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT id, email, username, isSupervisor, createdAt FROM accounts WHERE id = ?');
  const result = stmt.get(id) as AccountRow | undefined;
  return result ? mapAccountRow(result) : null;
}

export function getAllAccounts(): Account[] {
  const db = getDatabase();
  const stmt = db.prepare(
    'SELECT id, email, username, isSupervisor, createdAt FROM accounts ORDER BY createdAt DESC'
  );
  return (stmt.all() as AccountRow[]).map(mapAccountRow);
}

export function updateAccountSupervisor(id: number, isSupervisor: boolean): Account | null {
  const db = getDatabase();
  const stmt = db.prepare('UPDATE accounts SET isSupervisor = ? WHERE id = ?');
  const result = stmt.run(isSupervisor ? 1 : 0, id);
  if (result.changes === 0) {
    return null;
  }
  return getUserById(id);
}

export function updateAccount(
  id: number,
  updates: {
    email: string;
    username: string;
    isSupervisor: boolean;
  }
): { account: Account | null; emailTaken: boolean } {
  const db = getDatabase();
  const normalizedEmail = updates.email.trim().toLowerCase();
  const normalizedUsername = updates.username.trim();

  const emailInUse = db
    .prepare('SELECT id FROM accounts WHERE lower(email) = lower(?) AND id != ? LIMIT 1')
    .get(normalizedEmail, id);

  if (emailInUse) {
    return { account: null, emailTaken: true };
  }

  const stmt = db.prepare(
    'UPDATE accounts SET email = ?, username = ?, isSupervisor = ? WHERE id = ?'
  );
  const result = stmt.run(normalizedEmail, normalizedUsername, updates.isSupervisor ? 1 : 0, id);

  if (result.changes === 0) {
    return { account: null, emailTaken: false };
  }

  return { account: getUserById(id), emailTaken: false };
}

export function verifyAccountPassword(userId: number, password: string): boolean {
  const db = getDatabase();
  const passwordHash = createHash('sha256').update(password).digest('hex');

  const result = db
    .prepare('SELECT id FROM accounts WHERE id = ? AND passwordHash = ? LIMIT 1')
    .get(userId, passwordHash);

  return !!result;
}

export function setAccountPassword(userId: number, newPassword: string): boolean {
  const db = getDatabase();
  const passwordHash = createHash('sha256').update(newPassword).digest('hex');

  const result = db
    .prepare('UPDATE accounts SET passwordHash = ? WHERE id = ?')
    .run(passwordHash, userId);

  return result.changes > 0;
}

export function getUserCalendars(userId: number): Calendar[] {
  const db = getDatabase();
  const stmt = db.prepare(
    'SELECT id, title, description, startDate, endDate, minDurationDays, createdAt, adminCode FROM calendars WHERE createdByUserId = ? ORDER BY createdAt DESC'
  );
  return stmt.all(userId) as Calendar[];
}

export function getAllCalendars(): Calendar[] {
  const db = getDatabase();
  const stmt = db.prepare(
    'SELECT id, title, description, startDate, endDate, minDurationDays, createdAt, adminCode FROM calendars ORDER BY createdAt DESC'
  );
  return stmt.all() as Calendar[];
}

export function getCalendarOwnerId(id: string): number | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT createdByUserId FROM calendars WHERE id = ?');
  const result = stmt.get(id) as { createdByUserId?: number | null } | undefined;
  return result?.createdByUserId ?? null;
}

export function createCalendarUser(calendarId: string, name: string): User | null {
  const db = getDatabase();
  const normalizedName = name.trim();

  if (!normalizedName) {
    return null;
  }

  const existingStmt = db.prepare('SELECT * FROM users WHERE calendarId = ? AND lower(name) = lower(?)');
  const existingUser = existingStmt.get(calendarId, normalizedName) as User | undefined;
  if (existingUser) {
    return null;
  }

  const createdAt = new Date().toISOString();
  const insertStmt = db.prepare(
    'INSERT INTO users (calendarId, name, createdAt) VALUES (?, ?, ?)'
  );
  const result = insertStmt.run(calendarId, normalizedName, createdAt);

  return {
    id: result.lastInsertRowid as number,
    calendarId,
    name: normalizedName,
    createdAt,
  };
}


export function deleteCalendarUser(calendarId: string, userId: number): boolean {
  const db = getDatabase();
  
  // Delete availability records for this user
  const deleteAvailStmt = db.prepare('DELETE FROM availability WHERE calendarId = ? AND userId = ?');
  deleteAvailStmt.run(calendarId, userId);
  
  // Delete user
  const deleteUserStmt = db.prepare('DELETE FROM users WHERE calendarId = ? AND id = ?');
  const result = deleteUserStmt.run(calendarId, userId);
  
  return result.changes > 0;
}