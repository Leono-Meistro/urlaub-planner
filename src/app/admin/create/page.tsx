'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  Clock3,
  FileText,
} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Notice from '@/components/Notice';
import { normalizeCalendarAdminCode } from '@/lib/calendar-code';

export default function CreateCalendar() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minDurationDays, setMinDurationDays] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [createdCalendar, setCreatedCalendar] = useState<{
    id: string;
    adminCode: string;
  } | null>(null);

  const daysCount = startDate && endDate
    ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;
  const previewAdminCode = normalizeCalendarAdminCode(title);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    const parsedMinDurationDays = parseInt(minDurationDays, 10);

    if (!title.trim() || !startDate || !endDate) {
      setError('Titel, Startdatum und Enddatum sind erforderlich.');
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setError('Das Enddatum muss nach dem Startdatum liegen.');
      return;
    }

    if (Number.isNaN(parsedMinDurationDays) || parsedMinDurationDays < 1) {
      setError('Die Mindestdauer muss mindestens 1 Tag sein.');
      return;
    }

    if (daysCount > 0 && parsedMinDurationDays > daysCount) {
      setError(`Die Mindestdauer darf nicht größer als ${daysCount} Tage sein.`);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          startDate,
          endDate,
          minDurationDays: parsedMinDurationDays,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Die Planung konnte nicht erstellt werden.');
        return;
      }

      const calendar = await response.json();
      setSuccess(true);
      setCreatedCalendar(calendar);

      setTimeout(() => {
        router.push(`/calendar/${calendar.id}`);
      }, 1800);
    } catch (err) {
      setError('Beim Erstellen ist ein Fehler aufgetreten.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen py-4 sm:py-6">
      <div className="app-shell space-y-4">
        <AppHeader
          subtitle="Neue Planung"
          backHref="/dashboard"
          backLabel="Dashboard"
          actions={(
            <>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
                <CalendarRange size={15} />
                Zeitraum
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
                <Clock3 size={15} />
                Mindestdauer
              </span>
            </>
          )}
        />

        {success ? (
          <section className="app-card px-4 py-8 text-center sm:px-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={28} />
            </div>
            <h1 className="mt-4 text-2xl font-semibold text-slate-950">Planung erstellt</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Der Code lautet <strong>{createdCalendar?.adminCode}</strong>.
            </p>
            <Link href={`/calendar/${createdCalendar?.id}`} className="app-button mt-5">
              Zur Planung
              <ArrowRight size={18} />
            </Link>
          </section>
        ) : (
          <form onSubmit={handleSubmit} className="app-card px-4 py-5 sm:px-6 sm:py-6">
            <div className="mb-5">
              <p className="app-kicker">Neue Planung</p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-950">Urlaub anlegen</h1>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="calendar-title" className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    <FileText size={16} className="text-slate-400" />
                    Titel
                  </label>
                  <input
                    id="calendar-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Sommerurlaub 2026"
                    className="app-input"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="calendar-description" className="text-sm font-medium text-slate-800">
                    Beschreibung
                  </label>
                  <textarea
                    id="calendar-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional"
                    rows={3}
                    className="app-textarea"
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="min-w-0 space-y-2">
                    <label htmlFor="calendar-start" className="text-sm font-medium text-slate-800">
                      Startdatum
                    </label>
                    <input
                      id="calendar-start"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="app-input w-full"
                      disabled={loading}
                    />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <label htmlFor="calendar-end" className="text-sm font-medium text-slate-800">
                      Enddatum
                    </label>
                    <input
                      id="calendar-end"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="app-input w-full"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="calendar-min-duration" className="text-sm font-medium text-slate-800">
                    Mindestdauer in Tagen
                  </label>
                  <input
                    id="calendar-min-duration"
                    type="number"
                    value={minDurationDays}
                    onChange={(e) => setMinDurationDays(e.target.value)}
                    min="1"
                    max={daysCount > 0 ? daysCount : undefined}
                    className="app-input"
                    disabled={loading}
                  />
                </div>

                {error && <Notice tone="error">{error}</Notice>}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button type="submit" disabled={loading} className="app-button w-full sm:w-auto">
                    {loading ? 'Wird erstellt...' : 'Erstellen'}
                    {!loading && <ArrowRight size={18} />}
                  </button>
                  <Link href="/dashboard" className="app-button-secondary w-full sm:w-auto">
                    Abbrechen
                  </Link>
                </div>
              </div>

              <aside className="app-panel p-4">
                <p className="app-kicker mb-2">Kurzinfo</p>
                <div className="space-y-3 text-sm text-slate-700">
                  <div>
                    <p className="font-medium text-slate-950">Titel</p>
                    <p className="mt-1">{title.trim() || 'Noch leer'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-950">Admin-Code</p>
                    <p className="mt-1 font-mono tracking-[0.16em] text-slate-900">
                      {previewAdminCode || 'NOCHLEER'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-950">Zeitraum</p>
                    <p className="mt-1">
                      {startDate && endDate ? `${startDate} bis ${endDate}` : 'Noch nicht gewählt'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-950">Mindestdauer</p>
                    <p className="mt-1">{minDurationDays || '1'} Tage</p>
                  </div>
                  {daysCount > 0 && (
                    <div>
                      <p className="font-medium text-slate-950">Gesamtdauer</p>
                      <p className="mt-1">{daysCount} Tage</p>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
