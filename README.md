# Jarvis

Persönlicher Assistent nach dem Vorbild von Jarvis – für genau einen Nutzer (Thies).
Geplant sind ein Chat mit Gedächtnis und Fähigkeiten, die als einzelne Module andocken (Kalender, Briefing, To-dos, Posteingang …).

**Stand:** Ticket F – Kalender aufräumen im Demo-Modus. Jarvis hat einen Chat mit Werkzeugen, Modul-Steckplätzen und Schutzschicht (Freigabe-Karte), antwortet aber noch mit einem Demo-Gehirn statt mit Claude. Es kennt vier Demo-Module mit erfundenen Daten: einen Kalender mit Dauerterminen, eine Aufgabenliste mit Fristen, einen Posteingang und Notizen. Nichts wird gespeichert. Login, Datenbank, Claude und der echte Kalender kommen im Anschluss-Block. Die Gestaltung ist ein Platzhalter.

## Demo-Modus ausprobieren

Im Bereich „Jarvis“ zum Beispiel:

- „Wie sieht mein Tag aus?“ (oder „Guten Morgen“, „Briefing“) → Termine von heute und alles, was bis heute fällig ist, in einer Antwort. „Wie sieht Freitag aus?“ für einen anderen Tag.
- „Was steht heute an?“ → Jarvis listet die Demo-Termine von heute.
- „Trag Zahnarzt Freitag 10 Uhr ein“ → eine Freigabe-Karte erscheint. Erst „Freigeben“ trägt den Termin ein; „Ablehnen“ ändert nichts. Danach zeigt „Was steht Freitag an?“ den Termin.
- „Neue Aufgabe: Steuererklärung abgeben bis Freitag“ → Freigabe-Karte, nach „Freigeben“ steht die Aufgabe auf der Demo-Liste. Ohne Frist geht es auch („Neue Aufgabe: Fahrrad aufpumpen“).
- „Was ist diese Woche fällig?“ → offene Aufgaben bis Sonntag, Überfälliges zuerst. „Meine Aufgaben“ → alle offenen.
- „Steuererklärung ist erledigt“ → Freigabe-Karte „Aufgabe abhaken“; erst „Freigeben“ hakt sie ab. Gibt es keine passende Aufgabe, sagt Jarvis das freundlich.
- „Verschieb Laufen im Park auf 19 Uhr“ → Freigabe-Karte mit „Bisher“ und „Neu“. Nach „Freigeben“ zeigt „Was steht heute an?“ die neue Zeit.
- „Training ist ab jetzt immer um 19 Uhr“ → Karte mit „Gilt für: Ab … jede Woche“. Danach ist Training ab heute jede Woche um 19 Uhr, frühere Wochen bleiben.
- „Training fällt nächste Woche aus“ oder „Sag Training am Samstag ab“ (Training liegt in jeder neuen Sitzung auf dem heutigen Wochentag, 20 Uhr) → Karte „Termin absagen“ mit „Fällt weg: Nur am …“. Danach fehlt nur dieses eine Mal.
- „Trag jeden Mittwoch 20 Uhr Chorprobe ein“ → Karte „Dauertermin anlegen“ mit „Jede Woche am Mittwoch“.
- „Training dauert ab jetzt 2 Stunden“, „Benenne Laufen im Park um in Joggen“ → Karte „Termin ändern“ mit Bisher und Neu.
- Datumsangaben gehen überall: „Was steht am 21. Oktober an?“, „Trag Zahnarzt am 3.11. um 9 Uhr ein“, „Neue Aufgabe: Steuer bis 31.10.“.
- „Lass uns meine festen Termine durchgehen“ → Jarvis fragt bei jedem Dauertermin „Stimmt das noch?“. Antworten: „passt“, „ab jetzt 19 Uhr“, „dauert 2 Stunden“, „gibt es nicht mehr“ oder „Stopp“.
- „Wann ist Training?“ → alle Termine mit diesem Titel in den nächsten 30 Tagen. So sieht man, was ausfällt und was wieder da ist.
- „Ablehnen“ ändert in allen Fällen nichts. Gibt es keinen passenden Termin („Verschieb Fliegen lernen auf 10 Uhr“), sagt Jarvis das freundlich.
- Aufgaben pflegen: „Paket zur Post hat Zeit bis Montag“, „Steuer hat keine Frist mehr“, „Lösch die Aufgabe Urlaubsfotos“, „Was habe ich erledigt?“, „Paket ist doch nicht erledigt“ → jeweils mit Freigabe-Karte (außer der Liste).
- „Was ist neu im Posteingang?“, „Zeig die Mail von der Hausverwaltung“, „Was schreibt Lena?“ → erfundene Mails lesen.
- „Antworte der Hausverwaltung: Donnerstag passt, danke!“ → Karte „Antwort-Entwurf speichern“. Erst „Freigeben“ legt den Entwurf ab; gesendet wird nie etwas. „Meine Entwürfe“ zeigt sie.
- „Notiz: Geschenkidee für Mama – Kochbuch“ → Karte „Notiz anlegen“. „Meine Notizen“, „Notizen zu Kochbuch“, „Lösch die Notiz Kochbuch“.
- Alles andere → Jarvis sagt freundlich, dass es das im Demo-Modus noch nicht kann.

Unter „Einstellungen“ stehen die aktiven Module.

Nach dem Neuladen ist alles wieder auf Anfang.

## Wo steht was?

- [`docs/architektur.md`](docs/architektur.md) – Architektur und technische Entscheidungen
- [`CLAUDE.md`](CLAUDE.md) – Arbeitsregeln für Claude Code (Stack, Befehle, Definition of Done)
- Planung, Tickets und Entscheidungen (ADRs) – App-Board im claude.ai-Projekt „Bauer“

## Die App-Hülle

- **Navigation:** Unten liegt eine Tab-Leiste wie bei iPhone-Apps, mit den Bereichen „Jarvis“ (`/`, der Chat) und „Einstellungen“ (`/einstellungen`). Die Bereiche stehen als Liste in `src/components/bereiche.ts`. Ein Modul mit eigener Ansicht ergänzt dort einen Eintrag.
- **Gestaltung:** Alle Farben, Schriftgrößen, Abstände und Radien stehen als Design-Tokens in `src/styles/tokens.css`, für hell und dunkel. Wer das Aussehen ändern will, ändert diese Datei. Die Kontrastwerte stehen dort als Kommentar.
- **Zustände:** Laden, Fehler mit „Erneut versuchen“, „Seite nicht gefunden“ und ein Leer-Zustand für Bereiche ohne Inhalt.
- **Home-Bildschirm:** In Safari auf dem iPhone über Teilen → „Zum Home-Bildschirm“. Dann startet Jarvis im Vollbild mit eigenem Icon. Dafür sorgen `src/app/manifest.ts`, `src/app/icon.tsx` und `src/app/apple-icon.tsx`.

Details stehen in `docs/architektur.md`, Abschnitt 13 (App-Hülle), 14 (Kern im Demo-Modus), 15 (Aufgaben), 16 (Termine pflegen und Dauertermine), 17 (Tagesüberblick), 18 (Dauer, Titel, Datum), 19 (Aufgaben pflegen), 20 (Posteingang), 21 (Notizen) und 22 (Kalender aufräumen).

## Lokal starten

Voraussetzung: Node.js 24. Die Version steht in `.nvmrc`; mit [nvm](https://github.com/nvm-sh/nvm) genügt `nvm use`.

```bash
npm ci        # Abhängigkeiten genau in den Versionen aus package-lock.json installieren
npm run dev   # Entwicklungsserver starten
```

Danach ist die App unter <http://localhost:3000> erreichbar.

Umgebungsvariablen braucht die App ab dem Anschluss-Block. Dann `.env.example` nach `.env.local` kopieren und die Werte eintragen. `.env.local` landet nie im Repository.

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

Die E2E-Tests (End-to-End: die App wird wie von einem Menschen im Browser bedient) laufen gegen den Produktions-Build. Lokal nutzen sie Chromium in iPhone-Ansicht:

```bash
npx playwright install chromium   # einmalig: Testbrowser herunterladen
npm run build
npm run test:e2e
```

## Automatische Prüfungen

Bei jedem Pull Request und bei jedem Push auf `main` führt GitHub Actions (`.github/workflows/ci.yml`) aus:
`npm ci` → `npm run check` → Playwright-Browser installieren → `npm run test:e2e` → `npm audit`.

In der CI laufen die E2E-Tests zweimal in iPhone-Ansicht: mit Chromium und mit WebKit, der Technik von Safari. Dazu gehört ein Barrierefreiheits-Check mit axe auf allen Seiten, hell und dunkel, gegen die Regeln von WCAG 2.2 AA.

`npm audit` sucht nach bekannten Sicherheitslücken in den Paketen. Es prüft in zwei Stufen, siehe `docs/architektur.md`, Abschnitt 12.

## Veröffentlichen

Die App läuft auf Vercel (Projekt `jarvis`). Jeder Pull Request bekommt automatisch eine Vorschau-Adresse.
`main` ist die Produktion. Zusammengeführt wird nur nach Thies' Freigabe.
