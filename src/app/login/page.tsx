'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LogIn, LockKeyhole, Mail } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Notice from '@/components/Notice';

export default function Login() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registeredMessage = 'Registrierung erfolgreich. Sie können sich jetzt anmelden.';
  const nextPath = searchParams.get('next');
  const safeNextPath = nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')
    ? nextPath
    : '/dashboard';
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(searchParams.get('registered') === 'true' ? registeredMessage : '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function redirectAuthenticatedUser() {
      try {
        const response = await fetch('/api/user/profile');
        if (!cancelled && response.ok) {
          router.replace(safeNextPath);
        }
      } catch (err) {
        console.error(err);
      }
    }

    void redirectAuthenticatedUser();

    return () => {
      cancelled = true;
    };
  }, [router, safeNextPath]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!formData.email || !formData.password) {
      setError('Bitte füllen Sie E-Mail und Passwort aus.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Anmeldung fehlgeschlagen.');
        return;
      }

      router.replace(safeNextPath);
    } catch (err) {
      setError('Beim Anmelden ist ein Fehler aufgetreten.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen py-4 sm:py-6">
      <div className="app-shell space-y-4">
        <AppHeader subtitle="Anmelden" backHref="/" backLabel="Startseite" />
        <div className="flex justify-center">
          <div className="app-card w-full max-w-xl px-4 py-5 sm:px-6 sm:py-6">
            <div className="space-y-6">

              {success && <Notice tone="success">{success}</Notice>}
              {error && <Notice tone="error">{error}</Notice>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="login-email" className="text-sm font-medium text-slate-800">
                    E-Mail
                  </label>
                  <div className="relative">
                    <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="login-email"
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
                  <label htmlFor="login-password" className="text-sm font-medium text-slate-800">
                    Passwort
                  </label>
                  <div className="relative">
                    <LockKeyhole size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="login-password"
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Ihr Passwort"
                      className="app-input app-input-with-icon"
                      disabled={loading}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Passwort vergessen? Kontaktiere einen Administrator!
                  </p>
                </div>

                <button type="submit" disabled={loading} className="app-button mt-2 w-full">
                  <LogIn size={18} />
                  {loading ? 'Wird angemeldet...' : 'Anmelden'}
                </button>
              </form>

              <div className="space-y-3 border-t border-slate-200 pt-5 text-center">
                <p className="text-sm text-slate-600">
                  Noch kein Konto?{' '}
                  <Link href="/register" className="font-semibold text-blue-700 transition-colors hover:text-blue-800">
                    Jetzt registrieren
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
