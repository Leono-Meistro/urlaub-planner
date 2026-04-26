import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { setAccountPassword, verifyAccountPassword } from '@/lib/db';

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const { oldPassword, newPassword, confirmPassword } = await request.json();

    if (
      typeof oldPassword !== 'string'
      || typeof newPassword !== 'string'
      || typeof confirmPassword !== 'string'
    ) {
      return NextResponse.json({ error: 'Ungültige Daten' }, { status: 400 });
    }

    if (!oldPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'Alle Passwortfelder sind erforderlich' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Das neue Passwort muss mindestens 6 Zeichen lang sein' }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'Die neuen Passwörter stimmen nicht überein' }, { status: 400 });
    }

    const isOldPasswordValid = verifyAccountPassword(session.userId, oldPassword);
    if (!isOldPasswordValid) {
      return NextResponse.json({ error: 'Das alte Passwort ist falsch' }, { status: 400 });
    }

    const success = setAccountPassword(session.userId, newPassword);
    if (!success) {
      return NextResponse.json({ error: 'Passwort konnte nicht geändert werden' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Passwort konnte nicht geändert werden' }, { status: 500 });
  }
}
