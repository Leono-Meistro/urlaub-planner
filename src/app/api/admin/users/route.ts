import { NextRequest, NextResponse } from 'next/server';
import {
  createAccount,
  getAllAccounts,
  getUserById,
  setAccountPassword,
  updateAccount,
  updateAccountSupervisor,
} from '@/lib/db';
import { getSession } from '@/lib/auth';

async function requireSupervisor() {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 }) };
  }

  const user = getUserById(session.userId);
  if (!user) {
    return { error: NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 }) };
  }

  if (!user.isSupervisor) {
    return { error: NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 }) };
  }

  return { user };
}

export async function GET() {
  try {
    const access = await requireSupervisor();
    if ('error' in access) {
      return access.error;
    }

    return NextResponse.json({ users: getAllAccounts() });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Benutzer konnten nicht geladen werden' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireSupervisor();
    if ('error' in access) {
      return access.error;
    }

    const { email, username, password, isSupervisor } = await request.json();
    if (!email || !username || !password) {
      return NextResponse.json({ error: 'E-Mail, Name und Passwort sind erforderlich' }, { status: 400 });
    }

    const user = await createAccount(email, username, password, Boolean(isSupervisor));
    if (!user) {
      return NextResponse.json({ error: 'E-Mail ist bereits vergeben' }, { status: 400 });
    }

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Benutzer konnte nicht erstellt werden' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const access = await requireSupervisor();
    if ('error' in access) {
      return access.error;
    }

    const body = await request.json();
    const {
      action,
      userId,
      email,
      username,
      isSupervisor,
    } = body;

    if (action === 'reset-password') {
      if (typeof userId !== 'number') {
        return NextResponse.json({ error: 'Ungültige Daten' }, { status: 400 });
      }

      const success = setAccountPassword(userId, 'changeme');
      if (!success) {
        return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
      }

      return NextResponse.json({ success: true, userId, resetPassword: 'changeme' });
    }

    if (action === 'update-account') {
      if (
        typeof userId !== 'number'
        || typeof email !== 'string'
        || !email.trim()
        || typeof username !== 'string'
        || !username.trim()
        || typeof isSupervisor !== 'boolean'
      ) {
        return NextResponse.json({ error: 'Ungültige Daten' }, { status: 400 });
      }

      if (access.user.id === userId && !isSupervisor) {
        return NextResponse.json({ error: 'Der eigene Supervisor-Zugang kann nicht entfernt werden' }, { status: 400 });
      }

      const result = updateAccount(userId, {
        email,
        username,
        isSupervisor,
      });

      if (result.emailTaken) {
        return NextResponse.json({ error: 'E-Mail ist bereits vergeben' }, { status: 400 });
      }

      if (!result.account) {
        return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
      }

      return NextResponse.json(result.account);
    }

    if (typeof userId !== 'number' || typeof isSupervisor !== 'boolean') {
      return NextResponse.json({ error: 'Ungültige Daten' }, { status: 400 });
    }

    if (access.user.id === userId && !isSupervisor) {
      return NextResponse.json({ error: 'Der eigene Supervisor-Zugang kann nicht entfernt werden' }, { status: 400 });
    }

    const updatedUser = updateAccountSupervisor(userId, isSupervisor);
    if (!updatedUser) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Benutzer konnte nicht aktualisiert werden' }, { status: 500 });
  }
}
