import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Alle Felder sind erforderlich' },
        { status: 400 }
      );
    }

    const user = loginUser(email, password);

    if (!user) {
      return NextResponse.json(
        { error: 'E-Mail oder Passwort ist falsch' },
        { status: 401 }
      );
    }

    // Create session
    await createSession({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    return NextResponse.json(
      {
        message: 'Anmeldung erfolgreich',
        user: { id: user.id, email: user.email, username: user.username },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Anmeldung fehlgeschlagen' },
      { status: 500 }
    );
  }
}
