# Urlaubsplanung

Eine intuitive Mobile-First Web-Anwendung zur gemeinsamen Urlaubsplanung. Administratoren können Kalender erstellen, und Benutzer können ihre Verfügbarkeit eintragen.

## Features

- 📅 Admin-Panel zum Erstellen von Urlaubskalendern
- 👥 Benutzer können ihre Verfügbarkeit markieren
- 📊 Übersichtliche Darstellung der Verfügbarkeit aller Teilnehmer
- 📱 Optimiert für Smartphones und Tablets (Mobile-First)
- 🎨 Modernes, responsives Design mit Tailwind CSS
- ⚡ Schnell und zuverlässig mit Next.js

## Tech Stack

- **Frontend**: React, Next.js 16+, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite (better-sqlite3)
- **UI Components**: Lucide Icons

## Installation

1. **Abhängigkeiten installieren**:
```bash
npm install
```

2. **Umgebungsvariablen einrichten**:
Kopieren Sie `.env.example` zu `.env.local` und setzen Sie einen Admin-Code:
```bash
cp .env.example .env.local
```

Bearbeiten Sie `.env.local`:
```
NEXT_PUBLIC_ADMIN_CODE=IhrAdmin123Code
```

3. **Entwicklungsserver starten**:
```bash
npm run dev
```

Die Anwendung läuft auf `http://localhost:3000`

## Verwendung

### Admin - Kalender erstellen

1. Navigieren Sie zur Startseite (`/`)
2. Klicken Sie auf das "Neu" Button oben rechts
3. Füllen Sie die erforderlichen Informationen aus:
   - **Titel**: Name des Urlaubs (z.B. "Sommerurlaub 2025")
   - **Beschreibung** (optional): Weitere Informationen
   - **Startdatum**: Erster Tag des Urlaubs
   - **Enddatum**: Letzter Tag des Urlaubs
   - **Admin-Code**: Der in `.env.local` festgelegte Code
4. Klicken Sie auf "Kalender erstellen"

### Benutzer - Verfügbarkeit eintragen

1. Wählen Sie einen Kalender von der Startseite aus
2. Geben Sie Ihren Namen ein
3. Klicken Sie auf die Tage, an denen Sie verfügbar sind (die Tage werden grün)
4. Klicken Sie auf "Verfügbarkeit speichern"
5. Sehen Sie Ihre Verfügbarkeit in der Übersichtstabelle unten

## Struktur

```
src/
├── app/
│   ├── api/
│   │   └── calendars/
│   │       ├── route.ts          # Kalender CRUD-Operationen
│   │       └── [id]/
│   │           └── route.ts      # Verfügbarkeit aktualisieren
│   ├── admin/
│   │   └── create/
│   │       └── page.tsx          # Admin-Seite zum Erstellen von Kalendern
│   ├── calendar/
│   │   └── [id]/
│   │       └── page.tsx          # Kalender-Ansicht für Benutzer
│   ├── layout.tsx                # Hauptlayout
│   ├── page.tsx                  # Startseite mit Kalender-Übersicht
│   └── globals.css               # Globale Styles
├── lib/
│   └── db.ts                     # Datenbank-Funktionen und Schnittstellen
└── ...
```

## Datenbank

Die Anwendung verwendet SQLite für die Datenspeicherung. Die Datenbank wird automatisch initialisiert.

### Tabellen

- **calendars**: Speichert Kalender-Informationen
  - id, title, description, startDate, endDate, createdAt, adminCode

- **availability**: Speichert Benutzer-Verfügbarkeit
  - id, calendarId, userName, date, available, createdAt

## Bereitstellung

### Vercel (empfohlen)

1. Push Sie Ihren Code zu GitHub
2. Verbinden Sie Ihr Repository mit Vercel
3. Stellen Sie Umgebungsvariablen ein (NEXT_PUBLIC_ADMIN_CODE)
4. Stellen Sie bereit!

Hinweis: Vercel hat ein Dateisystem-Limit für bezahlte Pläne. Für produktive Nutzung mit vielen Benutzern erwägen Sie, SQLite durch PostgreSQL zu ersetzen.

## Sicherheit

- Der Admin-Code wird in `.env.local` gespeichert (wird nicht in Git gespeichert)
- Benutzerdaten werden lokal in der SQLite-Datenbank gespeichert
- Keine Authentifizierung erforderlich (idealerweise durch einen eindeutigen Kalender-Link geschützt)

## Mobile-First Design

Die App ist mit mobilen Geräten im Fokus entworfen:
- Touch-optimierte Buttons (mindestens 44x44px)
- Große, lesbare Schrift
- Einfache Navigation mit minimalem Tippen
- Responsive Grid-Layout für verschiedene Bildschirmgrößen

## Lizenz

MIT
