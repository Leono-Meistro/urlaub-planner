'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LockKeyhole, Mail, UserRound, UserRoundPlus } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Notice from '@/components/Notice';

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.email || !formData.username || !formData.password) {
      setError('Bitte füllen Sie alle Felder aus.');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Die Passwörter stimmen nicht überein.');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen lang sein.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registrierung fehlgeschlagen.');
        return;
      }

      router.replace('/dashboard');
    } catch (err) {
      setError('Beim Registrieren ist ein Fehler aufgetreten.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen py-4 sm:py-6">
      <div className="app-shell space-y-4">
        <AppHeader subtitle="Registrieren" backHref="/" backLabel="Startseite" />
        <div className="flex justify-center">
          <div className="app-card w-full max-w-xl px-4 py-5 sm:px-6 sm:py-6">
            <div className="space-y-6">

              {error && <Notice tone="error">{error}</Notice>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="register-email" className="text-sm font-medium text-slate-800">
                    E-Mail
                  </label>
                  <div className="relative">
                    <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="register-email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="beispiel@email.de"
                      className="app-input app-input-with-icon"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="register-username" className="text-sm font-medium text-slate-800">
                    Benutzername
                  </label>
                  <div className="relative">
                    <UserRound size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="register-username"
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="Max Mustermann"
                      className="app-input app-input-with-icon"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="register-password" className="text-sm font-medium text-slate-800">
                    Passwort
                  </label>
                  <div className="relative">
                    <LockKeyhole size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="register-password"
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Mindestens 6 Zeichen"
                      className="app-input app-input-with-icon"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="register-password-confirm" className="text-sm font-medium text-slate-800">
                    Passwort wiederholen
                  </label>
                  <div className="relative">
                    <LockKeyhole size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="register-password-confirm"
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Passwort wiederholen"
                      className="app-input app-input-with-icon"
                      disabled={loading}
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="app-button mt-2 w-full">
                  <UserRoundPlus size={18} />
                  {loading ? 'Wird registriert...' : 'Konto erstellen'}
                </button>
              </form>

              <div className="space-y-3 border-t border-slate-200 pt-5 text-center">
                <p className="text-sm text-slate-600">
                  Bereits registriert?{' '}
                  <Link href="/login" className="font-semibold text-blue-700 transition-colors hover:text-blue-800">
                    Anmelden
                  </Link>
                </p>
                <p className="text-sm text-slate-600">
                  Oder{' '}
                  <Link href="/" className="font-semibold text-slate-900 transition-colors hover:text-blue-800">
                    direkt mit Code teilnehmen
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
