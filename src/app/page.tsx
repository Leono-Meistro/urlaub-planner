'use client';

import { useState, useSyncExternalStore, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  LogIn,
  UserPlus,
} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Notice from '@/components/Notice';
import { normalizeCalendarAdminCode } from '@/lib/calendar-code';
import { readStoredHolidayCode, storeHolidayCode } from '@/lib/holiday-code-storage';

export default function Home() {
  const router = useRouter();
  const storedCode = useSyncExternalStore(
    () => () => {},
    readStoredHolidayCode,
    () => ''
  );
  const [editedCode, setEditedCode] = useState<string | null>(null);
  const code = editedCode ?? storedCode;
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/user/profile');
        setIsAuthenticated(response.ok);
      } catch {
        setIsAuthenticated(false);
      }
    }

    void checkAuth();
  }, []);

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const normalizedCode = normalizeCalendarAdminCode(code);
      const response = await fetch(`/api/calendars?adminCode=${encodeURIComponent(normalizedCode)}`);

      if (response.status === 404) {
        setError('Kein Urlaub mit diesem Code gefunden.');
        return;
      }

      if (!response.ok) {
        setError('Planung konnte gerade nicht geladen werden.');
        return;
      }

      const calendar = await response.json();
      storeHolidayCode(calendar.adminCode);
      router.push(`/calendar/${calendar.id}`);
    } catch (err) {
      setError('Beim Öffnen ist ein Fehler aufgetreten.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen py-4 sm:py-6">
      <div className="app-shell space-y-4">
        <AppHeader subtitle="Urlaube einfach abstimmen" />

        <section className="app-card px-4 py-5 sm:px-6 sm:py-6">
          <div className="home-card-layout grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
            <div className="space-y-4">
              <p className="app-kicker">Direkt loslegen</p>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Urlaub mit Code öffnen
              </h1>
              <p className="text-sm leading-6 text-slate-600">
                Code eingeben, Namen wählen, Tage markieren.
              </p>

              {error && <Notice tone="error">{error}</Notice>}

              <form onSubmit={handleCodeSubmit} className="space-y-3">
                <div className="space-y-2">
                  <label htmlFor="holiday-code" className="text-sm font-medium text-slate-800">
                    Urlaubscode
                  </label>
                  <div className="relative">
                    <KeyRound size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="holiday-code"
                      type="text"
                      value={code}
                      onChange={(e) => setEditedCode(normalizeCalendarAdminCode(e.target.value))}
                      placeholder="SOMMERURLAUB"
                      className="app-input app-input-with-icon font-medium tracking-[0.14em] uppercase"
                      disabled={loading}
                      autoCapitalize="characters"
                    />
                  </div>
                </div>

                <button type="submit" disabled={!code || loading} className="app-button w-full sm:w-auto">
                  {loading ? 'Wird geöffnet...' : 'Urlaub öffnen'}
                  {!loading && <ArrowRight size={18} />}
                </button>
              </form>
            </div>

            <div className="grid gap-3">
              <div className="app-panel p-4">
                <p className="app-kicker mb-2">Kurz erklärt</p>
                <div className="space-y-3 text-sm text-slate-700">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-blue-700" />
                    <span>Code eingeben</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-blue-700" />
                    <span>Name auswählen</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-blue-700" />
                    <span>Verfügbare Tage speichern</span>
                  </div>
                </div>
              </div>


            </div>
          </div>
        </section>

        <section className="app-card px-4 py-5 sm:px-6 sm:py-6">
          <div className="home-card-layout grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
            <div className="space-y-4">
              <p className="app-kicker">{isAuthenticated ? 'Für dich' : 'Neu hier?'}</p>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                {isAuthenticated ? 'Deine Planungen verwalten' : 'Planung erstellen'}
              </h2>
              <p className="text-sm leading-6 text-slate-600">
                {isAuthenticated 
                  ? 'Deine Planungen übersichtlich auf dem Dashboard.'
                  : 'Einfach Titel, Zeitraum und Mindestdauer eingeben und schon kann es losgehen.'
                }
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
                <Link 
                  href={isAuthenticated ? '/dashboard' : '/login'} 
                  className="app-button"
                >
                  <LogIn size={18} />
                  {isAuthenticated ? 'Zum Dashboard' : 'Anmelden'}
                </Link>
                {!isAuthenticated && (
                  <Link 
                    href="/register" 
                    className="app-button app-button-ghost"
                  >
                    <UserPlus size={18} />
                    Registrieren
                  </Link>
                )}
              </div>
            </div>

            <div className="grid gap-3">
              <div className="app-panel p-4">
                <p className="app-kicker mb-2">{isAuthenticated ? 'Tipps' : 'Warum anmelden?'}</p>
                <div className="space-y-3 text-sm text-slate-700">
                  {!isAuthenticated && (
                    <>
                      <div className="flex items-start gap-3">
                        <UserPlus size={16} className="mt-0.5 shrink-0 text-blue-700" />
                        <span>Eigene Planungen erstellen</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <UserPlus size={16} className="mt-0.5 shrink-0 text-blue-700" />
                        <span>Planungen verwalten und löschen</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <UserPlus size={16} className="mt-0.5 shrink-0 text-blue-700" />
                        <span>Alle Planungen auf einen Blick</span>
                      </div>
                    </>
                  )}
                  {isAuthenticated && (
                    <>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                        <span>Alle Planungen verwalten</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                        <span>Neue Planungen erstellen</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                        <span>Schnelle Übersicht</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
