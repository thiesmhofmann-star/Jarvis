# Jarvis

Persönlicher Assistent nach dem Vorbild von Jarvis – für genau einen Nutzer (Thies).
Geplant sind ein Chat mit Gedächtnis und Fähigkeiten, die als einzelne Module andocken (Kalender, Briefing, To-dos, Posteingang …).

**Stand:** Ticket 1 – Projektbasis. Die Startseite ist ein Platzhalter („Im Aufbau“).

## Wo steht was?

- [`docs/architektur.md`](docs/architektur.md) – Architektur und technische Entscheidungen
- [`CLAUDE.md`](CLAUDE.md) – Arbeitsregeln für Claude Code (Stack, Befehle, Definition of Done)
- Planung, Tickets und Entscheidungen (ADRs) – App-Board im claude.ai-Projekt „Bauer“

## Lokal starten

Voraussetzung: Node.js 24. Die Version steht in `.nvmrc`; mit [nvm](https://github.com/nvm-sh/nvm) genügt `nvm use`.

```bash
npm ci        # Abhängigkeiten genau in den Versionen aus package-lock.json installieren
npm run dev   # Entwicklungsserver starten
```

Danach ist die App unter <http://localhost:3000> erreichbar.

Umgebungsvariablen braucht die App ab Ticket 2. Dann `.env.example` nach `.env.local` kopieren und die Werte eintragen. `.env.local` landet nie im Repository.

## Befehle

| Befehl                 | Was er tut                                                     |
| ---------------------- | -------------------------------------------------------------- |
| `npm run dev`          | lokaler Entwicklungsserver                                     |
| `npm run lint`         | ESLint – findet Fehler und riskante Muster im Code             |
| `npm run format`       | Prettier – formatiert alle Dateien einheitlich (schreibt)      |
| `npm run format:check` | Prettier – prüft nur, ob alles formatiert ist                  |
| `npm run typecheck`    | TypeScript – prüft die Typen, ohne etwas zu erzeugen           |
| `npm test`             | Vitest – Unit-Tests                                            |
| `npm run test:e2e`     | Playwright – End-to-End-Tests im Browser, in iPhone-Ansicht    |
| `npm run build`        | Produktions-Build                                              |
| `npm run check`        | alles nacheinander: format:check, lint, typecheck, test, build |

Vor jedem Commit muss `npm run check` grün sein.

### End-to-End-Tests lokal

Die E2E-Tests (End-to-End: die App wird wie von einem Menschen im Browser bedient) laufen gegen den Produktions-Build:

```bash
npx playwright install chromium   # einmalig: Testbrowser herunterladen
npm run build
npm run test:e2e
```

## Automatische Prüfungen

Bei jedem Pull Request und bei jedem Push auf `main` führt GitHub Actions (`.github/workflows/ci.yml`) aus:
`npm ci` → `npm run check` → Playwright-Browser installieren → `npm run test:e2e` → `npm audit`.

`npm audit` sucht nach bekannten Sicherheitslücken in den Paketen. Es prüft in zwei Stufen, siehe `docs/architektur.md`, Abschnitt 12.

## Veröffentlichen

Die App läuft auf Vercel (Projekt `jarvis`). Jeder Pull Request bekommt automatisch eine Vorschau-Adresse.
`main` ist die Produktion. Zusammengeführt wird nur nach Thies' Freigabe.
