# Architektur – Jarvis-App

_Stand: 09.10.2026 · freigegeben von Thies · Entscheidungen siehe ADR-002 bis ADR-005 im App-Board_

Belegstufen: **belegt** (Quelle unten) · **plausibel** · **Vermutung**. Versionen: npm-Tag `latest` am 09.10.2026; exakt fixiert in `package.json`.

## 1. Zweck
Persönlicher Assistent nach dem Vorbild von Jarvis für einen einzigen Nutzer (Thies). Ein Grundgerüst trägt alle Funktionen; Fähigkeiten kommen als Module dazu, ohne dass der Kern umgebaut werden muss.

## 2. Bausteine im Überblick
```
App-Hülle (Web-App, iPhone-Home-Bildschirm + Laptop, Design-System)
  └─ Login & Zugangsschutz (Google, nur Thies' Konto)
       └─ Kern-Assistent (Chat: Text + iPhone-Diktat, Claude als Gehirn)
            ├─ Gedächtnis (Personen, Projekte, Vorlieben)
            └─ Schutzschicht (Vorschau + Freigabe für alles, was etwas verändert)
                 └─ Modul-Steckplätze → Module (Kalender, Briefing, To-dos, …)
Technische Basis: Fehlerbehandlung · Tests · CI · automatisches Veröffentlichen
```

## 3. Stack
| Baustein | Wahl | Version | Belegstufe |
|---|---|---|---|
| Laufzeit | Node.js (LTS) | 24.x | plausibel (Sekundärquelle) |
| App-Gerüst | Next.js (App Router), React | 16.4.x, React 19.3 | belegt |
| Sprache | TypeScript strict | 6.0.x – nicht 7, weil typescript-eslint nur `<6.1` unterstützt | belegt |
| Code-Qualität | ESLint + `eslint-config-next`, Prettier | 10.x, 16.4.x, 3.x | belegt |
| Gestaltung | Tailwind CSS, Design-Tokens per `@theme` | 4.3.x | belegt |
| Login | Better Auth mit Google | 1.7.x (1.8 ist Beta) | belegt |
| Datenbank | Neon Postgres, Region Frankfurt (`aws-eu-central-1`) | Free-Plan | belegt |
| DB-Zugriff | Drizzle ORM + drizzle-kit | 0.45.x, 0.31.x | belegt |
| KI-Anbindung | AI SDK + `@ai-sdk/anthropic` | **offen:** 6.x (Pflege-Linie) oder 7.x (stabil seit 25.06.2026) – Entscheidung in Ticket 4 | belegt |
| KI-Modell | Claude Haiku 5.5 (`claude-haiku-5-5`) als Standard | – | belegt |
| Hosting | Vercel Hobby (privat, nicht-kommerziell) | – | belegt |
| Schema-Prüfung | Zod | 4.x | belegt |
| Tests | Vitest (Unit/Integration), Playwright (E2E) | 5.x, 1.x | belegt |

Jedes Paket wird erst mit dem Ticket installiert, das es braucht (Ticket 1: Gerüst, Gestaltung, Code-Qualität, Tests).

Stärkeres Modell (z. B. Sonnet 5.5) nur, wenn Tests zeigen, dass Haiku für eine Aufgabe nicht reicht.

## 4. Modul-Steckplätze
Ein Modul ist ein Ordner unter `src/modules/<id>/` und wird in einer zentralen Liste registriert. Es liefert:
1. **Werkzeuge** (Tools), die Jarvis im Gespräch aufrufen kann
2. optional **eigene Ansichten** (z. B. Tagesübersicht)
3. optional **eigene Tabellen**
4. die **Google-Berechtigungen**, die es braucht (werden erst beim Aktivieren angefragt)

Skizze der Schnittstelle (plausibel, wird in Ticket 5 festgezurrt):
```ts
type JarvisModule = {
  id: string;                 // z. B. "calendar"
  name: string;               // "Kalender & Erinnerungen"
  description: string;        // für den Systemprompt
  googleScopes?: string[];    // minimal halten
  tools: Record<string, ModuleTool>;
};

type ModuleTool = {
  description: string;
  input: ZodSchema;
  effect: "read" | "write";   // "write" läuft immer über die Schutzschicht
  preview?: (input, ctx) => Promise<ActionPreview>;  // Pflicht bei "write"
  execute: (input, ctx) => Promise<unknown>;
};
```
Regel: Das Steckplatz-System bleibt so allgemein, wie die bekannten Module es brauchen (ADR-002). Keine Abstraktionen für hypothetische Module.

## 5. Schutzschicht
- Werkzeuge mit `effect: "write"` werden nie direkt ausgeführt. Der Kern legt einen Eintrag in `pending_actions` an und zeigt eine **Freigabe-Karte** (was passiert, wo, mit welchen Daten).
- Ausführung erst nach Tippen auf „Freigeben"; „Ablehnen" verwirft. Ergebnis und Fehler werden im selben Eintrag protokolliert.
- Nie automatisch senden, löschen oder ändern – auch nicht, wenn das Modell es vorschlägt.
- Ob das AI SDK (Version 6 oder 7, siehe Abschnitt 3) eine eingebaute Freigabe-Funktion für Tools bietet, wird in Ticket 4 und 6 geprüft; sonst eigene Umsetzung.

## 6. Gedächtnis
- Jarvis speichert Fakten über Personen, Projekte und Vorlieben in `memories`, wenn Thies sie nennt oder ausdrücklich darum bittet.
- Relevante Einträge werden pro Anfrage in den Systemprompt geladen.
- Jeder neue Eintrag ist im Chat sichtbar („Gemerkt: …") und in den Einstellungen anzeig- und löschbar. Gedächtnis-Einträge brauchen keine Freigabe-Karte, weil sie nur App-intern sind (Designentscheidung, plausibel).

## 7. Datenmodell (Grundgerüst)
| Tabelle | Inhalt |
|---|---|
| Better-Auth-Tabellen (`user`, `session`, `account`, `verification`) | Login, Sitzungen, Google-Tokens (von Better Auth erzeugt) |
| `conversations` | id, user_id, title, created_at |
| `messages` | id, conversation_id, role, content (JSON), created_at |
| `memories` | id, user_id, kind (person / project / preference / fact), content, created_at, updated_at |
| `pending_actions` | id, user_id, module_id, tool, input (JSON), preview (JSON), status (open / approved / rejected / done / failed), result (JSON), created_at, decided_at |

Module bringen eigene Tabellen nur mit, wenn sie Daten haben, die nirgends sonst liegen. Kalenderdaten bleiben bei Google und werden **nicht** kopiert.

## 8. Login, Rechte, Google
- Google-Login über Better Auth; `accessType: "offline"` und `prompt: "select_account consent"`, damit Google einen Refresh-Token liefert (belegt).
- **Zugangsschutz:** Nur die E-Mail aus `ALLOWED_EMAIL` darf sich anmelden; alle anderen werden abgewiesen.
- Google-OAuth-Zugang im Status **„In Produktion"** (unverifiziert, bis 100 Nutzer erlaubt). Im Testmodus laufen Refresh-Tokens nach 7 Tagen ab (belegt).
- Berechtigungen minimal und schrittweise: Grundgerüst nur `openid email profile` + `calendar.events.readonly` für den Test-Stecker. Schreibrechte erst mit dem Modul Kalender, Gmail erst mit dem Modul Posteingang (Annahme 2 vorher prüfen).
- Next.js 16: Routenschutz in `proxy.ts` (früher `middleware.ts`) (belegt).

## 9. Datenschutz
- Personenbezogene Daten: Chatverlauf, Gedächtnis, Freigabe-Protokoll → Neon Frankfurt.
- Kalenderdaten: nur bei Bedarf live von Google gelesen, nicht gespeichert.
- Chat-Inhalte werden von Anthropic über die Claude API verarbeitet; die API routet standardmäßig global (belegt). Von Thies am 08.10.2026 akzeptiert.
- Vercel-Funktionsregion Frankfurt (`fra1`), festgelegt in `vercel.json` und von Vercel im Hobby-Tarif angenommen (siehe Abschnitt 12).
- Keine Analytics, kein Tracking im Grundgerüst.

## 10. Umgebungen
| Umgebung | Wo | Datenbank |
|---|---|---|
| Entwicklung | Claude Code in der Cloud, Umgebung `Jarvis` | Neon-Branch `dev` |
| Vorschau | Vercel Preview pro Pull Request | Neon-Branch `dev` |
| Produktion | Vercel, Git-Branch `main` | Neon-Branch `production` (Neon-Standardname bei Anlage in der Console, belegt) |

Deploy in Produktion und Datenbank-Migrationen auf Neon `production` nur nach Freigabe durch Thies.

Geheimnisse: Die Claude-Code-Umgebung enthält nur `DATABASE_URL` des `dev`-Zweigs, weil Umgebungsvariablen dort für die Sitzung lesbar sind (belegt). Alle Produktions-Schlüssel trägt Thies selbst bei Vercel ein.

## 11. Kosten (Schätzung)
- Vercel Hobby: 0 € · Neon Free: 0 € · Google: 0 €
- Claude Haiku 5.5: 0,10 $ / 0,50 $ pro Million Ein-/Ausgabe-Tokens (belegt). Bei ~20 Anfragen/Tag geschätzt < 1 $/Monat (Vermutung) → Annahme 3 nach dem Start mit echten Zahlen prüfen.

## 12. Beim Setup zu prüfen
- Ticket 1: exakte Versionen in `package.json` fixieren (siehe Abschnitt 3) – **erledigt 09.10.2026:** Next.js 16.4.0, React 19.3.0, TypeScript 6.0.3, Tailwind CSS 4.3.3, ESLint 10.12.0, Prettier 3.9.9, Vitest 5.0.3, Playwright 1.64.0
- Ticket 1: Vercel-Funktionsregion Frankfurt (`fra1`) im Hobby-Tarif möglich? – **Ergebnis 09.10.2026:** Vercel nimmt `"regions": ["fra1"]` in `vercel.json` an. Das Vorschau-Deployment mit dieser Einstellung wurde gebaut und ist „Ready". Die Startseite ist bisher rein statisch, es läuft also noch keine Server-Funktion. Ab Ticket 2 im Vercel-Dashboard bestätigen (Deployment → Functions → Region), dass die Funktionen wirklich in `fra1` laufen.
- Ticket 1: Das Vercel-Projekt war nicht als Next.js-Projekt eingestellt und suchte nach dem Build den Ordner `dist`. Darum stehen `"framework": "nextjs"` und `"outputDirectory": ".next"` in `vercel.json`. Sie gelten damit unabhängig von den Einstellungen im Dashboard.
- Ticket 1: **Sicherheitsprüfung `npm audit` zweistufig** (Entscheidung Thies, 09.10.2026). Das Paket `braces` hat eine hohe Lücke (GHSA-vfj7-8cjw-p6xm, Lahmlegen durch verschachtelte Suchmuster), für die es noch keine reparierte Version gibt. Es kommt über `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch`, läuft nur beim Linten und wird nicht mit der App ausgeliefert. Darum prüft die CI:
  - ausgelieferte Pakete: `npm audit --omit=dev --audit-level=high` (rot ab „hoch“)
  - alle Pakete inkl. Entwicklungswerkzeuge: `npm audit --audit-level=critical` (rot ab „kritisch“)
  - Sobald `braces` oder `eslint-config-next` repariert ist: zurück zu `npm audit --audit-level=high` für alle Pakete.
- Ticket 2: Neon – automatisches Aufwachen nach Pause im Free-Plan bestätigen
- Ticket 4: AI SDK 6 oder 7? Dabei prüfen, ob es eine eingebaute Tool-Freigabe gibt
- Umgebungsvariablen-Namen von Better Auth laut aktueller Doku
- Login auf Vercel-Vorschau-Adressen: Google verlangt exakt passende Weiterleitungs-URLs, Vorschau-Adressen wechseln aber. Lösung in Ticket 2 klären (z. B. ein Better-Auth-Plugin für Vorschau-Deployments, Vermutung)

## Quellen
- Next.js-Versionen: https://abhs.in/blog/nextjs-current-version-march-2026-stable-release-whats-new · https://versionlog.com/nextjs/
- Tailwind CSS: https://endoflife.date/tailwind-css
- Auth.js / proxy.ts: https://authjs.dev/getting-started/installation
- Better Auth Google: https://www.better-auth.com/docs/authentication/google
- Neon Regionen: https://neon.com/docs/introduction/regions
- Neon Free-Plan: https://neon.com/faqs/postgres-services-free-to-production
- Supabase (verworfen): https://supabase.com/docs/guides/platform/regions · https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/
- Drizzle-Version: https://makerkit.dev/blog/md/tutorials/drizzle-vs-prisma
- AI SDK: https://vercel.com/docs/ai-gateway/sdks-and-apis/ai-sdk · https://releases.sh/vercel/vercel-ai-sdk/highlights
- Claude-Preise: https://platform.claude.com/docs/en/about-claude/pricing
- Vercel Hobby: https://vercel.com/docs/plans/hobby
- Google OAuth Testmodus: https://developers.google.com/health/setup
- Google Calendar Scopes: https://developers.google.com/calendar/api/auth
- Neon Zweig `production`, Pooling: https://neon.com/faqs/where-find-database-connection-string
- Claude-Code-Umgebungen: https://code.claude.com/docs/en/cloud-environments
- Versionen und Freigabe-Tags (09.10.2026): npm-Registry – https://www.npmjs.com/package/next · https://www.npmjs.com/package/typescript · https://www.npmjs.com/package/typescript-eslint · https://www.npmjs.com/package/ai · https://www.npmjs.com/package/better-auth
- Node.js LTS: https://dev.to/royce_fabbd83cb268312e928/node-22-vs-node-24-in-2026-current-lts-upgrade-guide-1oa5 · Vercel Node-Versionen: https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
