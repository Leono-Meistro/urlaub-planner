import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await deleteSession();
    return NextResponse.json({ message: 'Abmeldung erfolgreich' }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Abmeldung fehlgeschlagen' },
      { status: 500 }
    );
  }
}
