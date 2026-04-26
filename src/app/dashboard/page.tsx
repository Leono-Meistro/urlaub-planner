'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarRange,
  Clock3,
  FolderPlus,
  KeyRound,
  LogOut,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react';
import AppBrand from '@/components/AppBrand';
import AppHeader from '@/components/AppHeader';
import Notice from '@/components/Notice';

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
  email: string;
  username: string;
  isSupervisor?: boolean;
}

const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function formatDate(date: string) {
  return dateFormatter.format(new Date(date));
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const response = await fetch('/api/user/profile');
        if (!response.ok) {
          router.push('/login');
          return;
        }

        const data = await response.json();
        setUser(data.user);
        setCalendars(data.calendars || []);
      } catch (err) {
        console.error(err);
        setError('Die Dashboard-Daten konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="app-panel flex w-full max-w-sm flex-col items-center gap-5 px-6 py-8 text-center">
          <AppBrand variant="stacked" title="Dashboard" subtitle="Inhalte werden geladen" />
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" />
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen py-6 sm:py-8">
      <div className="app-shell space-y-6">
        <AppHeader
          subtitle="Dashboard"
          sticky
          inlineActions={(
            <button
              onClick={handleLogout}
              className="app-header-icon-button"
              aria-label="Abmelden"
              type="button"
            >
              <LogOut size={18} />
            </button>
          )}
        />

        <section className="dashboard-hero app-card px-5 py-6 sm:px-8 sm:py-8">
          <div className="dashboard-hero-layout grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  Willkommen, {user.username}
                </h1>
                {user.isSupervisor && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                    <ShieldCheck size={14} />
                    Supervisor
                  </span>
                )}
              </div>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                {user.isSupervisor
                  ? 'Sie sehen alle Planungen im System und können deren Stand schnell prüfen.'
                  : 'Hier verwalten Sie Ihre Urlaubsplanungen und springen direkt in die Details.'}
              </p>
              {user.isSupervisor && (
                <Notice tone="info">
                  Als Supervisor sehen Sie alle Planungen im System, auch wenn sie von anderen Konten erstellt wurden.
                </Notice>
              )}
            </div>

            <div className="app-panel p-4 sm:p-5">
              <p className="app-kicker mb-2">Schnellstart</p>
              <h2 className="text-lg font-semibold text-slate-950">Aktionen</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Definieren Sie Zeitraum und Mindestdauer, danach können Teilnehmende direkt ihre Verfügbarkeiten eintragen.
              </p>
              <div className="mt-4 space-y-3">
                <Link href="/admin/create" className="app-button w-full">
                  <FolderPlus size={18} />
                  Urlaub erstellen
                </Link>
                <Link href="/account" className="app-button-secondary w-full">
                  <UserRound size={18} />
                  Mein Konto
                </Link>
                {user.isSupervisor && (
                  <Link href="/admin/users" className="app-button-secondary w-full">
                    <Users size={18} />
                    Benutzerverwaltung
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        {error && <Notice tone="error">{error}</Notice>}

        {calendars.length > 0 ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-950">
                {user.isSupervisor ? 'Alle Planungen' : 'Ihre Planungen'}
              </h2>
              <p className="text-sm text-slate-500">{calendars.length} Einträge</p>
            </div>

            <div className="dashboard-calendar-grid grid gap-4 lg:grid-cols-2">
              {calendars.map((calendar) => (
                <Link
                  key={calendar.id}
                  href={`/calendar/${calendar.id}`}
                  className="app-panel group p-5 transition-transform duration-150 hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-slate-950">{calendar.title}</h3>
                      {calendar.description && (
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {calendar.description}
                        </p>
                      )}
                    </div>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                      <CalendarRange size={18} />
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 text-sm text-slate-600">
                    <div className="flex items-start gap-3">
                      <CalendarRange size={16} className="mt-0.5 shrink-0 text-slate-400" />
                      <span>{formatDate(calendar.startDate)} bis {formatDate(calendar.endDate)}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <KeyRound size={16} className="mt-0.5 shrink-0 text-slate-400" />
                      <span className="font-mono tracking-[0.18em] uppercase text-slate-800">{calendar.adminCode}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock3 size={16} className="mt-0.5 shrink-0 text-slate-400" />
                      <span>Mindestdauer: {calendar.minDurationDays} Tage</span>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4 text-sm font-medium text-blue-700">
                    <span>Planung öffnen</span>
                    <ArrowRight size={16} className="transition-transform duration-150 group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <section className="app-card px-5 py-10 text-center sm:px-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-900 text-white">
              <FolderPlus size={24} />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-slate-950">Noch keine Planungen vorhanden</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
              {user.isSupervisor
                ? 'Aktuell wurde noch keine Urlaubsplanung angelegt.'
                : 'Legen Sie Ihre erste Planung an und teilen Sie danach den Code oder Link mit anderen.'}
            </p>
            <Link href="/admin/create" className="app-button mt-6">
              <FolderPlus size={18} />
              Erste Planung erstellen
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
