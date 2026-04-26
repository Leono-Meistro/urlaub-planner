'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Edit2,
  Trash2,
  Plus,
  Copy,
  AlertTriangle,
} from 'lucide-react';
import AppBrand from '@/components/AppBrand';
import AppHeader from '@/components/AppHeader';
import Notice from '@/components/Notice';
import { copyTextToClipboard } from '@/lib/clipboard';

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

const MESSAGE_DISMISS_MS = 4500;

export default function EditCalendarPage() {
  const params = useParams();
  const router = useRouter();
  const calendarId = params.id as string;

  const [calendar, setCalendar] = useState<Calendar | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [linkMessage, setLinkMessage] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minDurationDays, setMinDurationDays] = useState(1);
  const [saving, setSaving] = useState(false);

  const [newUserName, setNewUserName] = useState('');
  const [addingUser, setAddingUser] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dayCount = startDate && endDate
    ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;

  const clearMessages = useCallback(() => {
    setError('');
    setSuccessMessage('');
    setLinkMessage('');
  }, []);

  useEffect(() => {
    if (!error && !successMessage && !linkMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      clearMessages();
    }, MESSAGE_DISMISS_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [clearMessages, error, successMessage, linkMessage]);

  useEffect(() => {
    async function loadCalendar() {
      try {
        const response = await fetch(`/api/calendars/${calendarId}`);
        if (!response.ok) {
          setError('Planung nicht gefunden');
          setLoading(false);
          return;
        }

        const data = await response.json();
        setCalendar(data.calendar);
        setUsers(data.users);
        setTitle(data.calendar.title);
        setDescription(data.calendar.description);
        setStartDate(data.calendar.startDate);
        setEndDate(data.calendar.endDate);
        setMinDurationDays(data.calendar.minDurationDays);

        if (!data.permissions?.canManage) {
          setError('Sie haben keine Berechtigung, diese Planung zu bearbeiten.');
        }
      } catch (err) {
        console.error(err);
        setError('Beim Laden der Planung ist ein Fehler aufgetreten.');
      } finally {
        setLoading(false);
      }
    }

    void loadCalendar();
  }, [calendarId]);

  const handleSaveCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!title.trim()) {
      setError('Titel ist erforderlich.');
      return;
    }

    if (!startDate || !endDate) {
      setError('Startdatum und Enddatum sind erforderlich.');
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setError('Das Enddatum muss nach dem Startdatum liegen.');
      return;
    }

    if (!Number.isInteger(minDurationDays) || minDurationDays < 1) {
      setError('Die Mindestdauer muss mindestens 1 Tag sein.');
      return;
    }

    if (dayCount > 0 && minDurationDays > dayCount) {
      setError(`Die Mindestdauer darf nicht größer als ${dayCount} Tage sein.`);
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/calendars/${calendarId}/manage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          startDate,
          endDate,
          minDurationDays,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Änderungen konnten nicht gespeichert werden.');
        return;
      }

      setSuccessMessage('Änderungen gespeichert.');
      const data = await response.json();
      setCalendar(data);
    } catch (err) {
      console.error(err);
      setError('Beim Speichern ist ein Fehler aufgetreten.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLinkMessage('');

    if (!newUserName.trim()) {
      setError('Name ist erforderlich.');
      return;
    }

    try {
      setAddingUser(true);
      const response = await fetch(`/api/calendars/${calendarId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newUserName.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Nutzer konnte nicht angelegt werden.');
        return;
      }

      setUsers([...users, data]);
      setNewUserName('');
      setLinkMessage(`Nutzer "${data.name}" angelegt.`);
    } catch (err) {
      console.error(err);
      setError('Nutzer konnte nicht angelegt werden.');
    } finally {
      setAddingUser(false);
    }
  };

  const handleCopyLink = async (userName?: string) => {
    setError('');
    setLinkMessage('');

    try {
      const baseUrl = `${window.location.origin}/calendar/${calendarId}`;
      const link = userName
        ? `${baseUrl}?name=${encodeURIComponent(userName)}`
        : baseUrl;

      await copyTextToClipboard(link);
      setLinkMessage(userName ? `Link für ${userName} kopiert.` : 'Link kopiert.');
    } catch (err) {
      console.error(err);
      setError('Link konnte nicht kopiert werden.');
    }
  };

  const handleDeleteCalendar = async () => {
    clearMessages();

    try {
      setDeleting(true);
      const response = await fetch(`/api/calendars/${calendarId}/manage`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Planung konnte nicht gelöscht werden.');
        return;
      }

      setSuccessMessage('Planung gelöscht. Sie werden weitergeleitet...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err) {
      console.error(err);
      setError('Planung konnte nicht gelöscht werden.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-3 py-6">
        <div className="app-panel flex w-full max-w-sm flex-col items-center gap-5 px-5 py-7 text-center">
          <AppBrand variant="stacked" title="Wird geladen" subtitle="Einen Moment bitte" />
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" />
        </div>
      </main>
    );
  }

  if (!calendar) {
    return (
      <main className="min-h-screen py-4 sm:py-6">
        <div className="app-shell space-y-4">
          <AppHeader subtitle="Planung nicht gefunden" backHref="/dashboard" backLabel="Dashboard" />
          <section className="app-card px-4 py-8 text-center sm:px-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-red-100 text-red-700">
              <Edit2 size={28} />
            </div>
            <h1 className="mt-4 text-2xl font-semibold text-slate-950">Planung nicht gefunden</h1>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
              {error || 'Die Planung konnte nicht geladen werden.'}
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-4 sm:py-6">
      <div className="app-shell space-y-4">
        <AppHeader subtitle="Planung bearbeiten" backHref={`/calendar/${calendarId}`} backLabel="Zurück" />

        <section className="app-card px-4 py-5 sm:px-6">
          <h1 className="text-2xl font-semibold text-slate-950">{calendar.title}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Admin-Code: <code className="font-mono font-medium text-slate-900">{calendar.adminCode}</code>
          </p>

          <form onSubmit={handleSaveCalendar} onChange={clearMessages} className="mt-6 space-y-4">
            <div>
              <label htmlFor="title" className="text-sm font-medium text-slate-800">
                Titel
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="app-input mt-2"
                disabled={saving}
              />
            </div>

            <div>
              <label htmlFor="description" className="text-sm font-medium text-slate-800">
                Beschreibung
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optionale Beschreibung"
                className="app-input mt-2 min-h-24"
                disabled={saving}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <label htmlFor="startDate" className="text-sm font-medium text-slate-800">
                  Startdatum
                </label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="app-input mt-2 w-full"
                  disabled={saving}
                />
              </div>

              <div className="min-w-0">
                <label htmlFor="endDate" className="text-sm font-medium text-slate-800">
                  Enddatum
                </label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="app-input mt-2 w-full"
                  disabled={saving}
                />
              </div>
            </div>

            <div>
              <label htmlFor="minDuration" className="text-sm font-medium text-slate-800">
                Mindestdauer (zusammenhängende Tage)
              </label>
              <input
                id="minDuration"
                type="number"
                min="1"
                max={dayCount > 0 ? dayCount : undefined}
                value={minDurationDays}
                onChange={(e) => setMinDurationDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="app-input mt-2"
                disabled={saving}
              />
              {dayCount > 0 && (
                <p className="mt-2 text-sm text-slate-500">
                  Zeitraum: {dayCount} Tage
                </p>
              )}
            </div>

            {error && <Notice tone="error">{error}</Notice>}
            {successMessage && <Notice tone="success">{successMessage}</Notice>}

            <button type="submit" disabled={saving} className="app-button">
              {saving ? 'Wird gespeichert...' : 'Änderungen speichern'}
            </button>
          </form>
        </section>

        <section className="app-card px-4 py-5 sm:px-6">
          <h2 className="text-xl font-semibold text-slate-950">Links und Teilnehmer</h2>

          <div className="mt-5 space-y-3">
            {linkMessage && <Notice tone="success">{linkMessage}</Notice>}

            <div>
              <p className="text-sm font-medium text-slate-800">Link ohne Namen</p>
              <button
                type="button"
                onClick={() => handleCopyLink()}
                className="app-button-secondary mt-2 w-full"
              >
                <Copy size={18} />
                Link kopieren
              </button>
            </div>

            <form onSubmit={handleAddUser} onChange={() => setLinkMessage('')} className="app-panel p-4">
              <label htmlFor="new-user" className="text-sm font-medium text-slate-800">
                Persönlichen Link für Nutzer anlegen
              </label>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  id="new-user"
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Name eingeben"
                  className="app-input flex-1"
                  disabled={addingUser}
                />
                <button type="submit" disabled={addingUser} className="app-button sm:w-auto">
                  <Plus size={18} />
                  Anlegen
                </button>
              </div>
            </form>

            {users.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-800">Persönliche Links</p>
                {users.map((user) => (
                  <div key={user.id} className="app-panel flex items-center justify-between p-3">
                    <span className="font-medium text-slate-900">{user.name}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(user.name)}
                      className="app-button-secondary"
                    >
                      <Copy size={16} />
                      <span className="hidden sm:inline">Kopieren</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="app-card border-red-200 px-4 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700">
              <AlertTriangle size={20} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900">Planung löschen</h3>
              <p className="mt-1 text-sm text-red-800">
                Dies kann nicht rückgängig gemacht werden. Alle Daten werden gelöscht.
              </p>

              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
                >
                  <Trash2 size={16} />
                  Planung löschen
                </button>
              ) : (
                <div className="mt-4 space-y-3 rounded-2xl bg-red-50 p-4">
                  <p className="text-sm font-medium text-red-900">Sind Sie sicher?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleDeleteCalendar}
                      disabled={deleting}
                      className="app-button bg-red-600 hover:bg-red-700"
                    >
                      {deleting ? 'Wird gelöscht...' : 'Ja, löschen'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                      className="app-button-secondary"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
