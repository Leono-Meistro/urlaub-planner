'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Save, UserRound } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Notice from '@/components/Notice';

interface UserProfile {
  id: number;
  email: string;
  username: string;
  isSupervisor?: boolean;
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [profileForm, setProfileForm] = useState({
    email: '',
    username: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const response = await fetch('/api/user/profile');
        if (!response.ok) {
          router.push('/login');
          return;
        }

        const data = await response.json();
        setUser(data.user);
        setProfileForm({
          email: data.user.email,
          username: data.user.username,
        });
      } catch (err) {
        console.error(err);
        setError('Profil konnte nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, [router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!profileForm.email.trim() || !profileForm.username.trim()) {
      setError('E-Mail und Name sind erforderlich.');
      return;
    }

    try {
      setSavingProfile(true);
      const response = await fetch('/api/user/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Profil konnte nicht aktualisiert werden.');
        return;
      }

      setUser(data.user);
      setMessage('Profil wurde aktualisiert.');
    } catch (err) {
      console.error(err);
      setError('Profil konnte nicht aktualisiert werden.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setError('Bitte alle Passwortfelder ausfüllen.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Die neuen Passwörter stimmen nicht überein.');
      return;
    }

    try {
      setSavingPassword(true);
      const response = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordForm),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Passwort konnte nicht geändert werden.');
        return;
      }

      setPasswordForm({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setMessage('Passwort wurde geändert.');
    } catch (err) {
      console.error(err);
      setError('Passwort konnte nicht geändert werden.');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen py-6 sm:py-8">
        <div className="app-shell">
          <section className="app-card px-5 py-8 text-center sm:px-8">
            <p className="text-sm text-slate-600">Konto wird geladen...</p>
          </section>
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
        <AppHeader subtitle="Konto" backHref="/dashboard" backLabel="Dashboard" />

        {message && <Notice tone="success">{message}</Notice>}
        {error && <Notice tone="error">{error}</Notice>}

        <section className="app-card px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <UserRound size={18} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Mein Konto</h1>
              <p className="text-sm text-slate-600">Eigene Daten und Passwort verwalten</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="account-email" className="text-sm font-medium text-slate-800">
                E-Mail
              </label>
              <input
                id="account-email"
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                className="app-input"
                disabled={savingProfile || savingPassword}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="account-username" className="text-sm font-medium text-slate-800">
                Name
              </label>
              <input
                id="account-username"
                type="text"
                value={profileForm.username}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, username: e.target.value }))}
                className="app-input"
                disabled={savingProfile || savingPassword}
              />
            </div>

            <button type="submit" className="app-button" disabled={savingProfile || savingPassword}>
              <Save size={18} />
              {savingProfile ? 'Wird gespeichert...' : 'Profil speichern'}
            </button>
          </form>
        </section>

        <section className="app-card px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <KeyRound size={18} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Passwort ändern</h2>
              <p className="text-sm text-slate-600">Altes Passwort einmal, neues Passwort zweimal eingeben</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="old-password" className="text-sm font-medium text-slate-800">
                Altes Passwort
              </label>
              <input
                id="old-password"
                type="password"
                value={passwordForm.oldPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, oldPassword: e.target.value }))}
                className="app-input"
                disabled={savingProfile || savingPassword}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="new-password" className="text-sm font-medium text-slate-800">
                Neues Passwort
              </label>
              <input
                id="new-password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                className="app-input"
                disabled={savingProfile || savingPassword}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-sm font-medium text-slate-800">
                Neues Passwort wiederholen
              </label>
              <input
                id="confirm-password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                className="app-input"
                disabled={savingProfile || savingPassword}
              />
            </div>

            <button type="submit" className="app-button" disabled={savingProfile || savingPassword}>
              <KeyRound size={18} />
              {savingPassword ? 'Wird geändert...' : 'Passwort ändern'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
