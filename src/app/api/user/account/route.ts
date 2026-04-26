import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, updateAccount } from '@/lib/db';

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const { email, username } = await request.json();

    if (
      typeof email !== 'string'
      || !email.trim()
      || typeof username !== 'string'
      || !username.trim()
    ) {
      return NextResponse.json({ error: 'E-Mail und Name sind erforderlich' }, { status: 400 });
    }

    const user = getUserById(session.userId);
    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    const result = updateAccount(user.id, {
      email,
      username,
      isSupervisor: user.isSupervisor,
    });

    if (result.emailTaken) {
      return NextResponse.json({ error: 'E-Mail ist bereits vergeben' }, { status: 400 });
    }

    if (!result.account) {
      return NextResponse.json({ error: 'Benutzer konnte nicht aktualisiert werden' }, { status: 500 });
    }

    return NextResponse.json({
      user: {
        id: result.account.id,
        email: result.account.email,
        username: result.account.username,
        isSupervisor: result.account.isSupervisor,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Profil konnte nicht aktualisiert werden' }, { status: 500 });
  }
}
