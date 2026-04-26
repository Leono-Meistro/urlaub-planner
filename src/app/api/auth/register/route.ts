import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, username, password } = await request.json();

    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'Alle Felder sind erforderlich' },
        { status: 400 }
      );
    }

    const user = await registerUser(email, username, password);

    if (!user) {
      return NextResponse.json(
        { error: 'E-Mail ist bereits registriert' },
        { status: 400 }
      );
    }

    await createSession({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    return NextResponse.json(
      {
        message: 'Registrierung erfolgreich',
        user: { id: user.id, email: user.email, username: user.username },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Registrierung fehlgeschlagen' },
      { status: 500 }
    );
  }
}
