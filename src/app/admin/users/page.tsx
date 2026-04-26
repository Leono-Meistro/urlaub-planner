'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Edit2,
  KeyRound,
  Mail,
  ShieldCheck,
  UserRound,
  UserRoundPlus,
  X,
} from 'lucide-react';
import AppBrand from '@/components/AppBrand';
import AppHeader from '@/components/AppHeader';
import Notice from '@/components/Notice';

interface User {
  id: number;
  email: string;
  username: string;
  isSupervisor?: boolean;
}

interface ManagedAccount {
  id: number;
  email: string;
  username: string;
  isSupervisor: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [managedAccounts, setManagedAccounts] = useState<ManagedAccount[]>([]);
  const [accountForm, setAccountForm] = useState({
    email: '',
    username: '',
    password: '',
    isSupervisor: false,
  });
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountMessage, setAccountMessage] = useState('');
  const [accountError, setAccountError] = useState('');
  const [editingAccount, setEditingAccount] = useState<ManagedAccount | null>(null);
  const [editForm, setEditForm] = useState({
    email: '',
    username: '',
    isSupervisor: false,
  });

  useEffect(() => {
    async function loadPage() {
      try {
        setLoading(true);
        setPageError('');

        const profileResponse = await fetch('/api/user/profile');
        if (!profileResponse.ok) {
          router.push('/login');
          return;
        }

        const profileData = await profileResponse.json();
        if (!profileData.user?.isSupervisor) {
          router.push('/dashboard');
          return;
        }

        setUser(profileData.user);
        await loadManagedAccounts();
      } catch (err) {
        console.error(err);
        setPageError('Benutzer konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    }

    void loadPage();
  }, [router]);

  async function loadManagedAccounts() {
    try {
      const usersResponse = await fetch('/api/admin/users');
      const usersData = await usersResponse.json();

      if (!usersResponse.ok) {
        setPageError(usersData.error || 'Benutzer konnten nicht geladen werden.');
        return;
      }

      setManagedAccounts(usersData.users || []);
    } catch (err) {
      console.error(err);
      setPageError('Benutzer konnten nicht geladen werden.');
    }
  }

  const handleAccountFormChange = (field: keyof typeof accountForm, value: string | boolean) => {
    setAccountForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError('');
    setAccountMessage('');

    if (!accountForm.email || !accountForm.username || !accountForm.password) {
      setAccountError('E-Mail, Name und Passwort sind erforderlich.');
      return;
    }

    try {
      setAccountsLoading(true);
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountForm),
      });
      const data = await response.json();

      if (!response.ok) {
        setAccountError(data.error || 'Benutzer konnte nicht erstellt werden.');
        return;
      }

      setAccountForm({
        email: '',
        username: '',
        password: '',
        isSupervisor: false,
      });
      setAccountMessage(`Benutzer ${data.username} wurde angelegt.`);
      await loadManagedAccounts();
    } catch (err) {
      console.error(err);
      setAccountError('Benutzer konnte nicht erstellt werden.');
    } finally {
      setAccountsLoading(false);
    }
  };

  const openEditModal = (account: ManagedAccount) => {
    setAccountError('');
    setAccountMessage('');
    setEditingAccount(account);
    setEditForm({
      email: account.email,
      username: account.username,
      isSupervisor: account.isSupervisor,
    });
  };

  const handleEditFormChange = (field: keyof typeof editForm, value: string | boolean) => {
    setEditForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const handleSaveAccountChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) {
      return;
    }

    setAccountError('');
    setAccountMessage('');

    try {
      setAccountsLoading(true);
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-account',
          userId: editingAccount.id,
          email: editForm.email,
          username: editForm.username,
          isSupervisor: editForm.isSupervisor,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setAccountError(data.error || 'Benutzer konnte nicht aktualisiert werden.');
        return;
      }

      setManagedAccounts((currentAccounts) => currentAccounts.map((entry) => (
        entry.id === data.id ? data : entry
      )));
      if (user?.id === data.id) {
        setUser(data);
      }
      setAccountMessage(`Benutzer ${data.username} wurde aktualisiert.`);
      setEditingAccount(null);
    } catch (err) {
      console.error(err);
      setAccountError('Benutzer konnte nicht aktualisiert werden.');
    } finally {
      setAccountsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!editingAccount) {
      return;
    }

    setAccountError('');
    setAccountMessage('');

    try {
      setAccountsLoading(true);
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset-password',
          userId: editingAccount.id,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setAccountError(data.error || 'Passwort konnte nicht zurückgesetzt werden.');
        return;
      }

      setAccountMessage(`Passwort für ${editingAccount.username} wurde auf changeme zurückgesetzt.`);
    } catch (err) {
      console.error(err);
      setAccountError('Passwort konnte nicht zurückgesetzt werden.');
    } finally {
      setAccountsLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="app-panel flex w-full max-w-sm flex-col items-center gap-5 px-6 py-8 text-center">
          <AppBrand variant="stacked" title="Benutzerverwaltung" subtitle="Inhalte werden geladen" />
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
          subtitle="Supervisor"
          backHref="/dashboard"
          backLabel="Dashboard"
          actions={(
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-sm font-medium text-white">
              <ShieldCheck size={16} />
              Benutzerverwaltung
            </span>
          )}
        />

        <section className="app-card px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="app-kicker">Supervisor</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Benutzer verwalten
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Konten anlegen und Supervisor-Rechte zentral verwalten, ohne die Planungsübersicht zu überladen.
              </p>
            </div>
          </div>

        {pageError && <Notice tone="error">{pageError}</Notice>}
        {accountMessage && <Notice tone="success">{accountMessage}</Notice>}
        {accountError && <Notice tone="error">{accountError}</Notice>}
          <div className="mt-5 grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
            <form onSubmit={handleCreateAccount} className="app-panel p-4">
              <p className="text-sm font-semibold text-slate-950">Benutzer anlegen</p>
              <div className="mt-4 space-y-3">
                <div className="space-y-2">
                  <label htmlFor="new-account-email" className="text-sm font-medium text-slate-800">
                    E-Mail
                  </label>
                  <div className="relative">
                    <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="new-account-email"
                      type="email"
                      value={accountForm.email}
                      onChange={(e) => handleAccountFormChange('email', e.target.value)}
                      className="app-input app-input-with-icon"
                      disabled={accountsLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="new-account-name" className="text-sm font-medium text-slate-800">
                    Name
                  </label>
                  <div className="relative">
                    <UserRound size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="new-account-name"
                      type="text"
                      value={accountForm.username}
                      onChange={(e) => handleAccountFormChange('username', e.target.value)}
                      className="app-input app-input-with-icon"
                      disabled={accountsLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="new-account-password" className="text-sm font-medium text-slate-800">
                    Passwort
                  </label>
                  <input
                    id="new-account-password"
                    type="password"
                    value={accountForm.password}
                    onChange={(e) => handleAccountFormChange('password', e.target.value)}
                    className="app-input"
                    disabled={accountsLoading}
                  />
                </div>

                <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={accountForm.isSupervisor}
                    onChange={(e) => handleAccountFormChange('isSupervisor', e.target.checked)}
                    disabled={accountsLoading}
                  />
                  Als Supervisor anlegen
                </label>

                <button type="submit" className="app-button w-full" disabled={accountsLoading}>
                  <UserRoundPlus size={18} />
                  Benutzer erstellen
                </button>
              </div>
            </form>

            <div className="space-y-3">
              {managedAccounts.map((account) => (
                <div key={account.id} className="app-panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{account.username}</p>
                    <p className="text-sm text-slate-500">{account.email}</p>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                      account.isSupervisor
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {account.isSupervisor ? 'Supervisor' : 'Benutzer'}
                    </span>
                    <button
                      type="button"
                      className="app-button-secondary w-full sm:w-auto"
                      disabled={accountsLoading}
                      onClick={() => openEditModal(account)}
                    >
                      <Edit2 size={16} />
                      Bearbeiten
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {editingAccount && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-6">
            <div className="app-card w-full max-w-xl overflow-hidden p-0">
              <div className="px-4 py-5 sm:px-6 sm:py-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="app-kicker">Benutzer bearbeiten</p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-950">{editingAccount.username}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingAccount(null)}
                    className="app-button-ghost px-3"
                    disabled={accountsLoading}
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveAccountChanges} className="mt-5 space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="edit-account-email" className="text-sm font-medium text-slate-800">
                      E-Mail
                    </label>
                    <input
                      id="edit-account-email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => handleEditFormChange('email', e.target.value)}
                      className="app-input"
                      disabled={accountsLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="edit-account-name" className="text-sm font-medium text-slate-800">
                      Name
                    </label>
                    <input
                      id="edit-account-name"
                      type="text"
                      value={editForm.username}
                      onChange={(e) => handleEditFormChange('username', e.target.value)}
                      className="app-input"
                      disabled={accountsLoading}
                    />
                  </div>

                  <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={editForm.isSupervisor}
                      onChange={(e) => handleEditFormChange('isSupervisor', e.target.checked)}
                      disabled={accountsLoading}
                    />
                    Supervisor
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button type="submit" className="app-button w-full" disabled={accountsLoading}>
                      Änderungen speichern
                    </button>
                    <button
                      type="button"
                      className="app-button-secondary w-full"
                      disabled={accountsLoading}
                      onClick={handleResetPassword}
                    >
                      <KeyRound size={16} />
                      Passwort auf changeme
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
