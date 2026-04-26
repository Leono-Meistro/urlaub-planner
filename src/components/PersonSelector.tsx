'use client';

import { useState } from 'react';
import { BadgeCheck, Plus, UserRound, UserRoundPlus, X } from 'lucide-react';
import Notice from '@/components/Notice';

interface User {
  id: number;
  calendarId: string;
  name: string;
  createdAt: string;
}

interface PersonSelectorProps {
  existingUsers: User[];
  onUserSelected: (userName: string) => void;
  selectedUser?: string | null;
  loading?: boolean;
}

export default function PersonSelector({
  existingUsers,
  onUserSelected,
  selectedUser = null,
  loading = false,
}: PersonSelectorProps) {
  const [showNewPersonForm, setShowNewPersonForm] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [error, setError] = useState('');

  const handleSelectExisting = (user: User) => {
    onUserSelected(user.name);
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPersonName.trim()) {
      setError('Bitte geben Sie einen Namen ein.');
      return;
    }

    if (existingUsers.some((user) => user.name.toLowerCase() === newPersonName.toLowerCase())) {
      setError('Dieser Name existiert bereits.');
      return;
    }

    onUserSelected(newPersonName.trim());
    setNewPersonName('');
    setShowNewPersonForm(false);
  };

  return (
    <section className="app-card px-5 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="app-kicker">1. Person wählen</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Person auswählen</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Vorhandenen Namen wählen oder neu anlegen.
          </p>
        </div>
        {selectedUser && (
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-800">
            <BadgeCheck size={16} />
            {selectedUser}
          </div>
        )}
      </div>

      {existingUsers.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-sm font-medium text-slate-700">Vorhandene Namen</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {existingUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => handleSelectExisting(user)}
                disabled={loading}
                type="button"
                className={`flex items-center gap-3 rounded-2xl border px-4 py-4 text-left transition-colors ${
                  selectedUser === user.name
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 bg-white text-slate-900 hover:border-blue-300 hover:bg-blue-50'
                } disabled:opacity-50`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                  selectedUser === user.name ? 'bg-white/15 text-white' : 'bg-slate-900 text-white'
                }`}>
                  <UserRound size={18} />
                </div>
                <span className="font-medium">{user.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={existingUsers.length > 0 ? 'mt-6 border-t border-slate-200 pt-6' : 'mt-6'}>
        {showNewPersonForm ? (
          <form onSubmit={handleCreateNew} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="new-person-name" className="text-sm font-medium text-slate-800">
                Neuer Name
              </label>
              <div className="relative">
                <UserRoundPlus size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="new-person-name"
                  type="text"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  placeholder="Vollständiger Name"
                  className="app-input app-input-with-icon"
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>

            {error && <Notice tone="error">{error}</Notice>}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="submit" disabled={loading} className="app-button w-full sm:w-auto">
                <Plus size={18} />
                Name übernehmen
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewPersonForm(false);
                  setNewPersonName('');
                  setError('');
                }}
                disabled={loading}
                className="app-button-secondary w-full sm:w-auto"
              >
                <X size={18} />
                Abbrechen
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowNewPersonForm(true)}
            disabled={loading}
            type="button"
            className="app-button-secondary w-full border-dashed"
          >
            <Plus size={18} />
            Neuen Namen anlegen
          </button>
        )}
      </div>
    </section>
  );
}
