# CLAUDE.md – Jarvis-App

## Zweck
Persönlicher Assistent nach dem Vorbild von Jarvis für genau einen Nutzer (Thies): Chat mit Gedächtnis, Fähigkeiten kommen als einzeln andockbare Module (Kalender, Briefing, To-dos, Posteingang …).
Thies programmiert nicht selbst. Er gestaltet, prüft und gibt frei; Claude schreibt den Code und erklärt ihn so, dass Thies ihn vertreten kann.

## Arbeitsregeln (zwingend)
- Vor jedem Ticket einen Plan zeigen: was sich ändert, welche Dateien, wie getestet wird. Erst nach Thies' „go" programmieren.
- Ohne ausdrückliche Freigabe: kein Deploy in Produktion, keine Migration auf Neon-Branch `production`, kein Löschen von Daten, nichts, was Geld kostet.
- Neue Ideen nicht still einbauen. Als Vorschlag für den Ideen-Parkplatz im App-Board melden.
- Erklärungen, Commit-Beschreibungen in PRs und alle UI-Texte auf Deutsch. Fachbegriffe beim ersten Auftreten in einem Satz erklären.
- Nach jedem Ticket: kurz erklären, was gebaut wurde und wie Thies es selbst ausprobiert.
- Planungsquelle ist das App-Board im claude.ai-Projekt „Bauer". Architektur: `docs/architektur.md`. Wer davon abweichen will, klärt das vorher mit Thies.

## Stack
Stand der Versionen: npm, 09.10.2026.
- Next.js 16 (App Router, aktuell 16.4.x), React 19
- TypeScript 6.0.x im strict-Modus. **Nicht TypeScript 7:** typescript-eslint unterstützt nur `<6.1`.
- Tailwind CSS 4.3, Design-Tokens per `@theme` in `src/styles/tokens.css`
- ESLint 10 mit `eslint-config-next`, Prettier 3
- Better Auth 1.x (stabile Linie, aktuell 1.7.x; keine 1.8-Beta), Login nur mit Google – ab Ticket 2
- Neon Postgres, Region Frankfurt (`aws-eu-central-1`), Drizzle ORM 0.45.x + drizzle-kit – ab Ticket 2
- AI SDK + `@ai-sdk/anthropic`, Standardmodell `claude-haiku-5-5` – ab Ticket 4. Version 6 (Pflege-Linie) oder 7 (aktuell stabil) wird in Ticket 4 mit Thies entschieden; vorher nicht installieren.
- Zod 4 (Eingaben prüfen), Vitest 5 (Unit/Integration), Playwright 1.x (E2E)
- Hosting: Vercel Hobby (nur privat, nicht-kommerziell), Projekt `jarvis`
- Node.js 24 (LTS), fixiert in `.nvmrc` und `package.json` → `engines.node: "24.x"`

Exakte Versionen stehen in `package.json`. Nur stabile Releases (npm-Tag `latest`); Beta, RC oder Canary nur nach Freigabe. Pakete erst mit dem Ticket installieren, das sie braucht.

## Ticket-Reihenfolge
1 Projektbasis → 3 App-Hülle → 2 Login und Zugangsschutz → 4 Kern-Chat → 5 Steckplätze und Test-Stecker → 6 Schutzschicht → 7 Gedächtnis → danach Module einzeln. Ticket 2 wartet auf den Google-Zugang, Ticket 4 auf den Claude-API-Schlüssel. Details stehen im App-Board.

## Befehle
Ab Ticket 1:
- `npm run dev` – lokaler Entwicklungsserver
- `npm run lint` – ESLint
- `npm run format` – Prettier (schreibt), `npm run format:check` – Prettier (prüft nur)
- `npm run typecheck` – `tsc --noEmit`
- `npm test` – Vitest
- `npm run test:e2e` – Playwright
- `npm run build` – Produktions-Build
- `npm run check` – format:check + lint + typecheck + test + build

Ab Ticket 2:
- `npm run db:generate` – Migration aus `src/db/schema.ts` erzeugen
- `npm run db:migrate` – Migration auf den Neon-Branch aus `DATABASE_URL` anwenden (in Claude Code ist das immer `dev`)

Vor jedem Commit `npm run check` ausführen. Rot heißt: nicht committen, Ursache beheben.

## Struktur
```
src/app/                 Seiten und API-Routen (App Router)
src/core/assistant/      Chat, Systemprompt, Werkzeug-Registry
src/core/guard/          Schutzschicht: pending_actions, Freigabe-Karte
src/core/memory/         Gedächtnis
src/modules/registry.ts  Liste aller aktiven Module
src/modules/<id>/        ein Ordner pro Modul
src/db/schema.ts         Drizzle-Schema (Kern-Tabellen)
src/lib/google/          Google-API-Client mit Token-Erneuerung
src/styles/tokens.css    Design-Tokens
drizzle/                 erzeugte Migrationen (nicht von Hand ändern)
docs/architektur.md      Architektur
tests/e2e/               Playwright-Tests
```

## Modul-Vertrag
Ein Modul exportiert aus `src/modules/<id>/index.ts` ein Objekt vom Typ `JarvisModule` (siehe `docs/architektur.md`, Abschnitt 4):
- `id`, `name`, `description`
- `googleScopes` – so wenige wie möglich
- `tools` – jedes Werkzeug mit Zod-Eingabe, `effect: "read" | "write"` und `execute`
- Werkzeuge mit `effect: "write"` brauchen zusätzlich `preview`

Neues Modul = neuer Ordner + Eintrag in `src/modules/registry.ts`. Am Kern ändert sich dafür nichts. Muss der Kern doch angepasst werden, erst mit Thies klären.
Kein Abstrahieren für hypothetische Module (ADR-002).

## Fallstricke
- Next.js 16: Routenschutz liegt in `proxy.ts`, nicht in `middleware.ts`.
- Google-Login braucht `accessType: "offline"` und `prompt: "select_account consent"`, sonst liefert Google keinen Refresh-Token.
- Der Google-OAuth-Zugang muss auf „In Produktion" stehen. Im Testmodus laufen Refresh-Tokens nach 7 Tagen ab.
- Zugangsschutz: Nur die E-Mail aus `ALLOWED_EMAIL` darf rein. Prüfung serverseitig, mit Test für ein fremdes Konto.
- Google-Scopes im Grundgerüst: nur `openid email profile` und `calendar.events.readonly`. Schreibrechte erst mit dem Modul Kalender. Gmail-Scopes nie ohne Freigabe (eingeschränkte Stufe, Prüfverfahren möglich).
- Kalenderdaten nicht in der Datenbank speichern, nur live von Google lesen.
- Werkzeuge mit `effect: "write"` nie direkt ausführen, immer über `src/core/guard`. Nichts wird automatisch gesendet, geändert oder gelöscht.
- Neon Free pausiert bei Nichtnutzung. Die erste Anfrage danach ist langsamer; Timeouts großzügig wählen und einen Ladezustand zeigen.
- Vercel Hobby begrenzt die Laufzeit von Funktionen. Chat-Antworten streamen; aktuelles Limit in der Vercel-Doku prüfen, bevor lange Abläufe gebaut werden.
- Zeitzone für alle Anzeigen und Kalenderabfragen: `Europe/Berlin`.
- Mobile first: Hauptgerät ist das iPhone. Touch-Ziele mindestens 44 × 44 px, Safe Areas beachten.
- Sprache und Diktat: Das Grundgerüst nutzt das Diktat der iPhone-Tastatur, keine eigene Spracherkennung.

## Umgebungsvariablen
Nur in `.env.local` (in `.gitignore`) und in den Vercel-Umgebungsvariablen. `.env.example` ohne Werte aktuell halten.
In der Claude-Code-Umgebung `Jarvis` liegt nur `DATABASE_URL` des Neon-Zweigs `dev`; Werte dort sind für die Sitzung lesbar. Alle anderen Schlüssel trägt Thies selbst bei Vercel ein. Fehlt ein Schlüssel, nicht danach fragen, sondern den Code so bauen, dass er ohne ihn startet und eine klare deutsche Meldung zeigt.
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (Namen in Ticket 1 gegen die Better-Auth-Doku prüfen)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `ANTHROPIC_API_KEY`
- `ALLOWED_EMAIL`

Secrets nie ausgeben, loggen oder committen.

## Git und CI
- Ein Feature-Branch pro Ticket: `feat/<ticket-nr>-<kurzname>`
- Commits nach Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`)
- Pull Request auf `main`. GitHub Actions führt `npm run check` aus und muss grün sein.
- Merge nach `main` (= Produktion auf Vercel) erst nach Thies' Freigabe.

## Definition of Done
Ein Ticket ist fertig, wenn:
- TypeScript strict ohne Fehler, Lint und Formatierung sauber
- Tests vorhanden: Unit für Logik, Integration für Datenflüsse, E2E für kritische Abläufe (Login, Chat, Freigabe)
- Fehler abgefangen und verständlich auf Deutsch angezeigt; Lade-, Leer- und Fehlerzustände gestaltet
- keine Secrets im Code; Eingaben serverseitig mit Zod geprüft; Rechte minimal
- Login über Better Auth, nichts selbst gebaut
- `npm audit` ohne hohe oder kritische Lücken
- WCAG 2.2 AA: Kontraste, Fokusreihenfolge, Screenreader-Labels, skalierbare Schrift
- nur Daten gespeichert, die wirklich gebraucht werden
- `README.md` und `docs/architektur.md` aktuell; Kommentare erklären das Warum
- alles in Git, CI grün

## Entscheidungen
Die ADRs stehen im App-Board (claude.ai-Projekt „Bauer"):
- ADR-001 eigene App statt No-Code
- ADR-002 Grundgerüst zuerst, Module einzeln
- ADR-003 Technik-Stack
- ADR-004 Planung im Projekt, Bau in Claude Code
- ADR-005 Platzhalter-Gestaltung jetzt, UX und Design später durch Thies (alle Gestaltungswerte nur über Tokens)
