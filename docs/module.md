# Modul-Katalog – Jarvis-App

_Stand: 14.10.2026 · Quellen: Recherche „Jarvis vs. Personal Assistant" (08.10.2026), Kickoff und Phase 1 mit Thies, App-Board im claude.ai-Projekt „Bauer"_

**Wozu dieses Dokument:** Es zeigt das Gesamtbild: alle Module, die wir am Anfang geplant haben, mit ihren Funktionen und woher jede Funktion kommt (Jarvis aus den Filmen, Berufsbild Personal Assistant, Thies' Alltag). So passt jedes Ticket ins Ganze.

**Was gebaut werden darf:** Thies hat am 14.10.2026 alles freigegeben, was im Demo-Modus sinnvoll baubar ist. Das ist der **Bauplan in Abschnitt 6**; dafür braucht es kein eigenes „go" mehr. Alles andere in diesem Katalog (Stand „später", „Idee" oder „Anschluss-Block") nicht von selbst bauen. Neue Ideen kommen als Vorschlag auf den Ideen-Parkplatz im App-Board (siehe `CLAUDE.md`).

**Pflege:** Wer ein Modul-Ticket abschließt, aktualisiert hier die Spalte „Stand".

## Legende

**Herkunft**

- **J** – Jarvis in den Iron-Man- und Avengers-Filmen (belegt über Wikipedia und Fan-Wikis, also Sekundärquellen)
- **PA** – Berufsbild Personal Assistant (belegt über Berufsprofile; „privat" = nur ein Einzelbeleg aus einer Stellenanzeige)
- **T** – Thies' Alltag und Wünsche (Selbstauskunft, 08.10.2026)
- **V** – Vorschlag von Claude (Belegstufe: plausibel, nicht beschlossen)

**Stand**

- **Demo ✓** – im Demo-Modus gebaut und in `main`
- **Demo, PR #n** – im Demo-Modus gebaut, Pull Request noch offen
- **Bauplan X** – freigegeben am 14.10.2026; Claude Code baut es als Ticket X (Abschnitt 6)
- **Anschluss-Block** – kommt mit Login, Datenbank, Claude und Google (siehe App-Board)
- **später** – geplant, noch kein Ticket
- **Idee** – noch nicht beschlossen, erst mit Thies klären

## 1. Leitgedanke: Jarvis und Pepper in einer App

- Jarvis betreibt in den Filmen Haus, Anzüge und Teile des Geschäfts. Termine, Reisen und Besorgungen übernimmt er laut Recherche **nicht**; das macht Pepper Potts, Tonys Personal Assistant. Eine App, die einen PA ersetzt, muss beides sein.
- Thies' größter Schmerz (T): Termine und Fristen organisiert er im Kopf. Die meisten entstehen mündlich, der Google-Kalender ist voll, aber veraltet, vor allem geänderte Dauertermine. Morgens fehlt der Überblick.
- **Job to be done** (T, 08.10.2026): „Wenn ich mündlich einen Termin ausmache oder sich ein fester Termin ändert, will ich das in Sekunden festhalten, damit mein Kalender stimmt und ich morgens sehe, was wirklich ansteht."
- **Wann Jarvis helfen soll** (T): morgens (Überblick), laufend (sobald Wichtiges reinkommt), abends (Rückblick und Planung für morgen) und jederzeit auf Anfrage im Chat.
- **Für alle Module gilt:** Nichts wird ohne Freigabe-Karte gesendet, geändert, gelöscht oder gebucht. Es werden nur die Daten gespeichert, die wirklich gebraucht werden.

## 2. Kern (kein Modul, trägt alle Module)

| Funktion | Herkunft | Stand |
|---|---|---|
| Chat mit Jarvis per Text und Diktat der iPhone-Tastatur | J (begann als Sprachschnittstelle), PA (zentrale Anlaufstelle) | Demo ✓ |
| Persönlichkeit: immer einsatzbereit, logisch, vertrauter Ton, geht auf Sprüche ein | J | Anschluss-Block (Systemprompt) |
| Gedächtnis für Personen, Projekte und Vorlieben; Jarvis zeigt „Gemerkt: …"; alles in den Einstellungen einsehbar und löschbar | V | Anschluss-Block |
| Schutzschicht: Vorschau und „Freigeben"/„Ablehnen" für alles Ändernde | V, PA (Umgang mit Vertraulichem) | Demo ✓ (Arbeitsspeicher), dauerhaft im Anschluss-Block |
| Modul-Steckplätze: neues Modul = neuer Ordner + Eintrag in der Registry | V | Demo ✓ |
| Werkzeuge mehrerer Module in einer Antwort verbinden | V | Demo ✓ |
| Login mit Google, nur Thies' Konto | V | Anschluss-Block |

## 3. Module

Reihenfolge wie in der Roadmap des App-Boards. Werkzeugnamen in Klammern, wo es sie schon gibt.

### 3.1 Kalender & Erinnerungen

**Zweck:** Termine per Zuruf erfassen und den Kalender aktuell halten. **Herkunft:** PA (Termine vereinbaren, Kalender führen, an Termine erinnern; im Film Pepper), T (Hauptschmerz).

| Funktion | Beispielsatz | Art | Stand |
|---|---|---|---|
| Termine eines Tages zeigen (`termine_am_tag`) | „Was steht Freitag an?" | lesen | Demo ✓ |
| Termin per Zuruf eintragen (`termin_anlegen`) | „Trag Zahnarzt Freitag 10 Uhr ein" | schreiben | Demo ✓ |
| Termine suchen (`termine_suchen`) | „Wann ist Training?" | lesen | Demo ✓ |
| Verschieben, Dauer und Titel ändern (`termin_aendern`) | „Verschieb Laufen im Park auf 19 Uhr" | schreiben | Demo ✓ |
| Absagen (`termin_absagen`) | „Sag Training am Dienstag ab" | schreiben | Demo ✓ |
| Wöchentliche Dauertermine, Umfang „nur dieses Mal" oder „ab jetzt immer" | „Training ist ab jetzt immer um 19 Uhr" | schreiben | Demo ✓ |
| Datumsangaben wie „21.10." oder „3. November" | „Trag Zahnarzt am 3.11. um 9 Uhr ein" | – | Demo ✓ |
| Erinnerung vor einem Termin als Push-Nachricht aufs iPhone | „Erinnere mich eine Stunde vorher" | schreiben | später |
| Kalender aufräumen: veraltete Dauertermine gemeinsam durchgehen (`dauertermine_anzeigen`) | „Lass uns meine festen Termine durchgehen" | lesen, dann schreiben | Demo, PR #13 |

**Echte Anbindung:** Google Calendar API. Kalenderdaten nur live lesen, nicht in der Datenbank speichern. Lesen mit `calendar.events.readonly`; Schreiben braucht `calendar.events`, nur mit Freigabe von Thies. „Ab jetzt immer" teilt eine Serie, wie es vermutlich auch Google macht (plausibel, beim echten Modul in der Google-Doku prüfen). Push-Nachrichten und Zeitsteuerung sind technisch noch nicht geprüft.

### 3.2 Briefing (Morgen und Abend)

**Zweck:** Ein Blick genügt, um zu wissen, was heute zählt. **Herkunft:** T (kein Tagesüberblick; morgens und abends), PA (Vorbereitung sicherstellen). In der ersten Skizze bildete es mit der Recherche ein gemeinsames Modul. **Erkenntnis aus Phase 1:** Das Briefing hilft nur, wenn Kalender und Aufgaben stimmen. Es baut deshalb auf 3.1 und 3.3 auf.

| Funktion | Beispielsatz | Art | Stand |
|---|---|---|---|
| Tagesüberblick auf Anfrage: Termine plus fällige und überfällige Aufgaben | „Wie sieht mein Tag aus?", „Guten Morgen" | lesen | Demo ✓ |
| Morgen-Briefing, das von selbst kommt | – | lesen | später |
| Abendrückblick: was war, was steht morgen an, was ist offen | „Abendrückblick", „Wie war mein Tag?" | lesen | Demo, PR #14 |
| Wichtige Mails im Briefing | – | lesen | Zahl neuer Mails: Demo, PR #14; „heute wichtig": Bauplan H |
| Eigener Heute-Bildschirm statt nur Chat | – | lesen | Idee (V; Gestaltung durch Thies) |

**Echte Anbindung:** keine eigenen Daten, fasst andere Module zusammen. Für das automatische Briefing müssen Zeitsteuerung und Push auf Vercel Hobby geprüft werden.

### 3.3 To-dos & Fristen

**Zweck:** Fristen, die keine festen Termine sind, landen nicht mehr im Kopf. **Herkunft:** PA (an Aufgaben und Deadlines erinnern), T (Fristen rutschen durch).

| Funktion | Beispielsatz | Art | Stand |
|---|---|---|---|
| Aufgabe mit oder ohne Frist anlegen (`aufgabe_anlegen`) | „Neue Aufgabe: Steuererklärung abgeben bis Freitag" | schreiben | Demo ✓ |
| Offene und fällige Aufgaben zeigen, Überfälliges zuerst (`aufgaben_anzeigen`) | „Was ist diese Woche fällig?" | lesen | Demo ✓ |
| Abhaken (`aufgabe_erledigen`) | „Steuererklärung ist erledigt" | schreiben | Demo ✓ |
| Frist oder Titel ändern, löschen, wieder öffnen, Erledigtes zeigen | „Paket zur Post hat Zeit bis Montag" | schreiben | Demo ✓ |
| Erinnerung vor Ablauf einer Frist | – | – | später |
| Fristen aus Mails übernehmen | „Mach aus der Mail eine Aufgabe" | schreiben | Bauplan I |

**Echte Anbindung:** Wo die Aufgaben später liegen, ist offen: eigene Tabelle in Neon oder Google Tasks. Vor dem echten Modul mit Thies klären.

### 3.4 Posteingang & Filter

**Zweck:** Jarvis als Pförtner, der entscheidet, was Thies heute braucht und was warten kann. **Herkunft:** J (soll Agent Coulson abwimmeln), PA (Anrufe filtern, Mails und Post beantworten), T (30–100 Mails am Tag). **Gewichtung:** Termine entstehen laut Thies meist mündlich, nicht per Mail. Der Posteingang liefert deshalb vor allem zu, er ist nicht das Hauptmodul.

**Geplanter Ablauf** (V, plausibel): einsammeln → einordnen → Kurzfassung ins Briefing → Antwortentwurf → Freigabe → senden.

| Funktion | Beispielsatz | Art | Stand |
|---|---|---|---|
| Mails anzeigen und eine Mail lesen (`mails_anzeigen`, `mail_lesen`) | „Was ist neu im Posteingang?" | lesen | Demo ✓ |
| Antwort als Entwurf ablegen (`antwort_entwurf_anlegen`) | „Antworte der Hausverwaltung: Donnerstag passt, danke!" | schreiben | Demo ✓ |
| Einordnen in „braucht dich heute", „kann warten" oder „Spam, egal", **mit sichtbarem Grund**, sonst entsteht kein Vertrauen (Design-Aufgabe) | „Was ist heute wichtig in meinen Mails?" | lesen | Bauplan H (im Demo vorbereitet; echt mit Claude) |
| Kurzfassung statt vieler ungelesener Mails | „Fass mir meine Mails zusammen" | lesen | Bauplan H (im Demo vorbereitet; echt mit Claude) |
| Senden, nur nach Freigabe | – | schreiben | später; bewusst noch kein Werkzeug |
| Termine und Fristen in Mails erkennen und als Termin oder Aufgabe vorschlagen | „Trag den Termin aus der Mail der Hausverwaltung ein" | schreiben | Bauplan I |

**Echte Anbindung:** Gmail API. Schon das Lesen fällt bei Google in die strengste Stufe, deshalb Gmail-Berechtigungen nie ohne Freigabe von Thies. Vorher in der offiziellen Google-Doku prüfen, ob die Ausnahme für Apps mit weniger als 100 Konten gilt (Annahme 2 im App-Board). Vorschlag: Mails wie den Kalender nur live lesen, nicht speichern.

### 3.5 Recherche

**Zweck:** Jarvis liefert Hintergrundwissen auf Zuruf. **Herkunft:** J (Hintergrundbericht über Anton Vanko auf Anfrage), PA (Recherche und Berichte für Projekte).

| Funktion | Beispielsatz | Art | Stand |
|---|---|---|---|
| Recherche auf Anfrage, mit Quellen | „Was muss ich über X wissen?" | lesen | später |
| Hintergrund vor einem Termin (Person, Firma, Ort) | „Bereite mich auf das Treffen am Freitag vor" | lesen | Idee (PA: Vorbereitung) |
| Ergebnis als Notiz ablegen | „Speicher das als Notiz" | schreiben | Idee (mit 3.9) |

**Echte Anbindung:** braucht Claude und eine Websuche. Kosten im Budget von 10 € pro Monat vorher prüfen.

### 3.6 Koordination

**Zweck:** Leute zusammenbringen, ohne endloses Hin und Her. **Herkunft:** J (spürt alle Avengers auf, um das Team zusammenzurufen; meldet Coulsons Terminwunsch), PA (Meetings organisieren, Protokoll führen, Vorbereitung; privat: Abstimmung mit Handwerkern und Dienstleistern).

| Funktion | Beispielsatz | Art | Stand |
|---|---|---|---|
| Freie Zeiten im Kalender finden und vorschlagen | „Wann habe ich nächste Woche zwei Stunden frei?" | lesen | Bauplan K |
| Nachricht oder Einladung an andere entwerfen, senden nur nach Freigabe | „Schlag Lisa Dienstag oder Donnerstag vor" | schreiben | Bauplan K (nur Entwurf; Senden wartet) |
| Protokoll zu einem Termin als Notiz festhalten | „Protokoll zur Team-Besprechung: …" | schreiben | Bauplan K |
| Treffen vorbereiten | „Bereite mich auf das Treffen mit Lisa vor" | lesen | später (braucht Claude) |

**Echte Anbindung:** hängt am Kalender (frei/belegt) und am Posteingang (Versand). Kanal offen; Messenger wie WhatsApp sind nicht geprüft.

### 3.7 Reisen & Besorgungen

**Zweck:** Erledigungen und Reisen planen, ohne an alles selbst zu denken. **Herkunft:** PA (Reisen und Unterkünfte buchen; privat: Besorgungen, Geschenke).

| Funktion | Beispielsatz | Art | Stand |
|---|---|---|---|
| Einkaufs- und Besorgungsliste | „Setz Milch auf die Einkaufsliste" | schreiben | Bauplan J (als Liste in 3.3) |
| Reiseplan zusammenstellen (Zeiten, Orte, Verbindungen) | „Plan mir die Fahrt nach Hamburg" | lesen | Idee |
| Buchen: nur Vorschlag oder Link, denn Buchen kostet Geld und läuft nie ohne Freigabe | – | schreiben | Idee, technisch ungeprüft |
| Geburtstage anzeigen und Geschenkideen sammeln | „Wer hat diesen Monat Geburtstag?" | lesen, schreiben | Bauplan L |
| An Geburtstage erinnern (Push) | – | – | später |

### 3.8 Zuhause

**Zweck:** Haushalt und Wohnung im Griff. **Herkunft:** J (betreibt Heizung, Kühlung und Sicherheit der Villa), PA privat (Haushalt, Handwerker).

| Funktion | Beispielsatz | Art | Stand |
|---|---|---|---|
| Smart Home steuern | „Mach die Heizung an" | schreiben | Idee, ungeprüft: welche Geräte Thies hat und ob es dafür eine Schnittstelle gibt |
| Wiederkehrende Haushaltsaufgaben | „Neue Aufgabe: Wasserfilter wechseln, jeden Monat" | schreiben | Bauplan J (über 3.3) |
| Termine mit Handwerkern abstimmen | – | schreiben | über 3.6 |

Bevor hier etwas geplant wird, mit Thies klären, was er konkret braucht.

### 3.9 Notizen (dazugekommen, nicht in der Skizze vom 08.10.2026)

| Funktion | Beispielsatz | Art | Stand |
|---|---|---|---|
| Notiz anlegen, anzeigen, löschen | „Notiz: Fahrradschloss kaufen" | schreiben | Demo ✓ |

Abgrenzung zum Gedächtnis: siehe `docs/architektur.md` (Abschnitt 21).

## 4. Bewusst nicht übernommen

| Was | Herkunft | Grund |
|---|---|---|
| Anrufe filtern oder annehmen | J (Coulson abwimmeln), PA | Das iPhone erlaubt Fremd-Apps nur Anruferkennung und das Blockieren von Spam. |
| Vitalwerte und Blutwerte überwachen | J | Gesundheitsdaten sind rechtlich ein eigenes, heikles Thema. |
| Rüstung, Kampf, Hacking, Anzüge und Iron Legion steuern, Labor-Hologramme, Tatort-Rekonstruktion | J | reine Film-Funktionen |
| Ablage und Bürosysteme pflegen | PA | noch keinem Modul zugeordnet; Kandidat für den Ideen-Parkplatz |
| Vertretung in Abwesenheit | PA | noch keinem Modul zugeordnet; Kandidat für den Ideen-Parkplatz |

## 5. Regeln für jedes Modul (Kurzfassung)

Verbindlich sind `CLAUDE.md` und `docs/architektur.md`; hier nur das Wichtigste.

- Neues Modul = neuer Ordner `src/modules/<id>/` + Eintrag in `src/modules/registry.ts`. Muss der Kern geändert werden, vorher mit Thies klären.
- Werkzeugnamen auf Deutsch in `snake_case`, z. B. `termin_anlegen`.
- Alles, was etwas verändert, ist `effect: "write"` mit `preview` und läuft über die Freigabe-Karte. Kein Werkzeug sendet, bucht oder löscht ohne Freigabe.
- Bis zum Anschluss-Block gilt der Demo-Modus: erfundene Daten, nur im Arbeitsspeicher, mit Obergrenzen; erfundene Mail-Adressen enden auf `.example`.
- Echte Anbindung: Google-Berechtigungen so wenige wie möglich. Gmail und Kalender-Schreibrechte nur mit Freigabe von Thies. Kalenderdaten nie in die Datenbank kopieren.
- Zeitzone `Europe/Berlin`, mobile first (iPhone), Touch-Ziele mindestens 44 × 44 px, WCAG 2.2 AA.

## 6. Bauplan – freigegeben am 14.10.2026

Thies hat am 14.10.2026 alles zum Bau freigegeben, was im Demo-Modus sinnvoll baubar ist. Claude Code arbeitet die Tickets **der Reihe nach** ab, ohne vorher auf ein „go" zu warten. Die Buchstaben setzen die Tickets A–E fort.

| Ticket | Inhalt | Beispielsätze |
|---|---|---|
| **F – Kalender aufräumen** | Jarvis geht die Dauertermine einzeln durch (nächstes Vorkommen, Uhrzeit, Dauer) und fragt jeweils „Stimmt das noch?". „Passt" → nächster. Eine Änderung oder „gibt es nicht mehr" → vorhandene Werkzeuge `termin_aendern` bzw. `termin_absagen` mit Umfang „ab diesem Termin", wie immer mit Freigabe-Karte. „Stopp" beendet den Durchgang. Am Ende eine kurze Zusammenfassung. | „Lass uns meine festen Termine durchgehen" |
| **G – Abendrückblick** | Heute erledigte Aufgaben, die heutigen Termine, was morgen ansteht, was offen oder überfällig ist. Der Tagesüberblick nennt zusätzlich die Zahl neuer Mails; nach Ticket H die „heute wichtigen". | „Abendrückblick", „Wie war mein Tag?" |
| **H – Posteingang einordnen** | Jede Demo-Mail bekommt eine Einordnung („braucht dich heute", „kann warten", „egal"), einen **sichtbaren Grund** in einem Satz und eine Kurzfassung in einer Zeile. Im Demo-Modus stehen sie vorbereitet in den Daten; im Anschluss-Block übernimmt Claude das Einordnen. Das in `docs/architektur.md` so festhalten. Dafür mehr erfundene Mails (etwa 8, alle mit `.example`). | „Was ist heute wichtig in meinen Mails?", „Fass mir meine Mails zusammen" |
| **I – Aus Mails übernehmen** | Jarvis liest eine Mail und schlägt daraus eine Aufgabe mit Frist oder einen Termin vor, über die vorhandenen Werkzeuge mit Freigabe-Karte. Die Karte nennt die Mail als Quelle. Findet Jarvis kein Datum, fragt er nach. | „Mach aus der Mail von der Bibliothek eine Aufgabe", „Trag den Termin aus der Mail der Hausverwaltung ein" |
| **J – Wiederkehrende Aufgaben und Einkaufsliste** | Aufgaben können sich wöchentlich oder monatlich wiederholen: Nach dem Abhaken erscheint die nächste mit neuer Frist. Dazu Listen im Modul `aufgaben-demo`, zuerst „Einkauf"; Einträge dort ohne Frist und nicht im Tagesüberblick. Die Form der Werkzeuge so halten, dass später eigene Tabelle oder Google Tasks möglich bleibt (Entscheidung offen). | „Neue Aufgabe: Wasserfilter wechseln, jeden Monat", „Setz Milch auf die Einkaufsliste", „Was steht auf der Einkaufsliste?", „Milch hab ich" |
| **K – Koordination** | Lese-Werkzeug für freie Zeiten einer bestimmten Länge in einem Zeitraum, zwischen 8 und 20 Uhr, mit Dauerterminen, `Europe/Berlin`. 3–4 erfundene Demo-Kontakte mit `.example`. Terminvorschlag an einen Kontakt **nur als Entwurf** mit Freigabe-Karte; gesendet wird nichts, es gibt weiter kein Werkzeug zum Senden. Dazu ein Protokoll zu einem Termin als Notiz. | „Wann habe ich nächste Woche zwei Stunden frei?", „Schlag Lisa Dienstag oder Donnerstag ein Treffen vor", „Protokoll zur Team-Besprechung: …" |
| **L – Geburtstage und Geschenkideen** | Erfundene Geburtstage (gern die Demo-Kontakte aus K). Anzeigen nach Person und Zeitraum; der Tagesüberblick nennt Geburtstage heute und in den nächsten 7 Tagen. Geschenkideen je Person festhalten, mit Freigabe-Karte; prüfen, ob dafür das Modul Notizen reicht. Die echte Quelle (Google-Kontakte oder Kalender) bleibt offen, Berechtigungen nur mit Freigabe. | „Wer hat diesen Monat Geburtstag?", „Wann hat Lisa Geburtstag?", „Geschenkidee für Lisa: Kochbuch" |

**So läuft jedes Ticket**

- Ein Ticket = ein Branch `feat/<buchstabe>-<kurzname>` = ein Pull Request. Ist der vorige noch nicht in `main`, auf ihm aufbauen und die Reihenfolge in der PR-Beschreibung nennen.
- Der Plan steht in der PR-Beschreibung (was, warum, Abweichungen, wie testen). Kein Warten auf ein „go".
- Fertig erst, wenn `npm run check` und `npm run test:e2e` grün sind und `docs/architektur.md`, `README.md` und hier die Spalte „Stand" aktuell sind.
- **Nie selbst nach `main` zusammenführen.** Das macht Thies, weil `main` die Produktion ist.
- Am Ende jedes Tickets Thies in einfachen Worten erklären, was neu ist und wie er es ausprobiert.

**Anhalten und Thies fragen, wenn**

- der Kern (`src/core/guard`, `src/core/assistant/chat.ts`, `src/app/api`, `src/modules/vertrag.ts`) mehr als eine kleine Ergänzung bräuchte; neue Regeln im Demo-Gehirn sind erlaubt
- ein neues Paket nötig wäre
- ein Ticket nur mit echten Daten oder echten Zugängen Sinn ergibt
- etwas den Regeln in `CLAUDE.md` widerspricht oder unklar ist

**Nicht im Bauplan, wartet weiter**

| Was | Warum |
|---|---|
| Login, Datenbank, Claude (mit Persönlichkeit und Gedächtnis), echter Kalender, echte Gmail | Anschluss-Block; braucht die Zugänge |
| Push-Erinnerungen (Termine, Fristen, Geburtstage), Morgen-Briefing, das von selbst kommt | braucht Push-Nachrichten, Zeitsteuerung und Speicher |
| Recherche, Treffen vorbereiten, Reiseplan | braucht Claude und eine Websuche |
| Mails und Nachrichten senden | erst mit echter Gmail und ausdrücklicher Freigabe |
| Buchen | kostet Geld |
| Smart Home | erst klären, welche Geräte Thies hat |
| Eigener Heute-Bildschirm | Gestaltung macht Thies (ADR-005) |
