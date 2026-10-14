# Modul-Katalog – Jarvis-App

_Stand: 14.10.2026 · Quellen: Recherche „Jarvis vs. Personal Assistant" (08.10.2026), Kickoff und Phase 1 mit Thies, App-Board im claude.ai-Projekt „Bauer"_

**Wozu dieses Dokument:** Es zeigt das Gesamtbild: alle Module, die wir am Anfang geplant haben, mit ihren Funktionen und woher jede Funktion kommt (Jarvis aus den Filmen, Berufsbild Personal Assistant, Thies' Alltag). So passt jedes Ticket ins Ganze.

**Kein Bauauftrag.** Gebaut wird nur, was ein Ticket verlangt, das Thies freigegeben hat. Funktionen mit Stand „Idee" oder „später" nicht von selbst bauen. Neue Ideen kommen als Vorschlag auf den Ideen-Parkplatz im App-Board (siehe `CLAUDE.md`).

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
| Werkzeuge mehrerer Module in einer Antwort verbinden | V | Demo, PR #6 |
| Login mit Google, nur Thies' Konto | V | Anschluss-Block |

## 3. Module

Reihenfolge wie in der Roadmap des App-Boards. Werkzeugnamen in Klammern, wo es sie schon gibt.

### 3.1 Kalender & Erinnerungen

**Zweck:** Termine per Zuruf erfassen und den Kalender aktuell halten. **Herkunft:** PA (Termine vereinbaren, Kalender führen, an Termine erinnern; im Film Pepper), T (Hauptschmerz).

| Funktion | Beispielsatz | Art | Stand |
|---|---|---|---|
| Termine eines Tages zeigen (`termine_am_tag`) | „Was steht Freitag an?" | lesen | Demo ✓ |
| Termin per Zuruf eintragen (`termin_anlegen`) | „Trag Zahnarzt Freitag 10 Uhr ein" | schreiben | Demo ✓ |
| Termine suchen (`termine_suchen`) | „Wann ist Training?" | lesen | Demo, PR #5 |
| Verschieben, Dauer und Titel ändern (`termin_aendern`) | „Verschieb Laufen im Park auf 19 Uhr" | schreiben | Demo, PR #5 und #7 |
| Absagen (`termin_absagen`) | „Sag Training am Dienstag ab" | schreiben | Demo, PR #5 |
| Wöchentliche Dauertermine, Umfang „nur dieses Mal" oder „ab jetzt immer" | „Training ist ab jetzt immer um 19 Uhr" | schreiben | Demo, PR #5 |
| Datumsangaben wie „21.10." oder „3. November" | „Trag Zahnarzt am 3.11. um 9 Uhr ein" | – | Demo, PR #7 |
| Erinnerung vor einem Termin als Push-Nachricht aufs iPhone | „Erinnere mich eine Stunde vorher" | schreiben | später |
| Kalender aufräumen: veraltete Dauertermine gemeinsam durchgehen | „Lass uns meine festen Termine durchgehen" | lesen, dann schreiben | Idee (V, Phase 1) |

**Echte Anbindung:** Google Calendar API. Kalenderdaten nur live lesen, nicht in der Datenbank speichern. Lesen mit `calendar.events.readonly`; Schreiben braucht `calendar.events`, nur mit Freigabe von Thies. „Ab jetzt immer" teilt eine Serie, wie es vermutlich auch Google macht (plausibel, beim echten Modul in der Google-Doku prüfen). Push-Nachrichten und Zeitsteuerung sind technisch noch nicht geprüft.

### 3.2 Briefing (Morgen und Abend)

**Zweck:** Ein Blick genügt, um zu wissen, was heute zählt. **Herkunft:** T (kein Tagesüberblick; morgens und abends), PA (Vorbereitung sicherstellen). In der ersten Skizze bildete es mit der Recherche ein gemeinsames Modul. **Erkenntnis aus Phase 1:** Das Briefing hilft nur, wenn Kalender und Aufgaben stimmen. Es baut deshalb auf 3.1 und 3.3 auf.

| Funktion | Beispielsatz | Art | Stand |
|---|---|---|---|
| Tagesüberblick auf Anfrage: Termine plus fällige und überfällige Aufgaben | „Wie sieht mein Tag aus?", „Guten Morgen" | lesen | Demo, PR #6 |
| Morgen-Briefing, das von selbst kommt | – | lesen | später |
| Abendrückblick: was war, was steht morgen an, was ist offen | „Was steht morgen an?" | lesen | später |
| Wichtige Mails im Briefing | – | lesen | später (mit 3.4) |
| Eigener Heute-Bildschirm statt nur Chat | – | lesen | Idee (V; Gestaltung durch Thies) |

**Echte Anbindung:** keine eigenen Daten, fasst andere Module zusammen. Für das automatische Briefing müssen Zeitsteuerung und Push auf Vercel Hobby geprüft werden.

### 3.3 To-dos & Fristen

**Zweck:** Fristen, die keine festen Termine sind, landen nicht mehr im Kopf. **Herkunft:** PA (an Aufgaben und Deadlines erinnern), T (Fristen rutschen durch).

| Funktion | Beispielsatz | Art | Stand |
|---|---|---|---|
| Aufgabe mit oder ohne Frist anlegen (`aufgabe_anlegen`) | „Neue Aufgabe: Steuererklärung abgeben bis Freitag" | schreiben | Demo ✓ |
| Offene und fällige Aufgaben zeigen, Überfälliges zuerst (`aufgaben_anzeigen`) | „Was ist diese Woche fällig?" | lesen | Demo ✓ |
| Abhaken (`aufgabe_erledigen`) | „Steuererklärung ist erledigt" | schreiben | Demo ✓ |
| Frist oder Titel ändern, löschen, wieder öffnen, Erledigtes zeigen | „Paket zur Post hat Zeit bis Montag" | schreiben | Demo, PR #8 |
| Erinnerung vor Ablauf einer Frist | – | – | später |
| Fristen aus Mails übernehmen | „Mach aus der Mail eine Aufgabe" | schreiben | Idee (mit 3.4) |

**Echte Anbindung:** Wo die Aufgaben später liegen, ist offen: eigene Tabelle in Neon oder Google Tasks. Vor dem echten Modul mit Thies klären.

### 3.4 Posteingang & Filter

**Zweck:** Jarvis als Pförtner, der entscheidet, was Thies heute braucht und was warten kann. **Herkunft:** J (soll Agent Coulson abwimmeln), PA (Anrufe filtern, Mails und Post beantworten), T (30–100 Mails am Tag). **Gewichtung:** Termine entstehen laut Thies meist mündlich, nicht per Mail. Der Posteingang liefert deshalb vor allem zu, er ist nicht das Hauptmodul.

**Geplanter Ablauf** (V, plausibel): einsammeln → einordnen → Kurzfassung ins Briefing → Antwortentwurf → Freigabe → senden.

| Funktion | Beispielsatz | Art | Stand |
|---|---|---|---|
| Mails anzeigen und eine Mail lesen (`mails_anzeigen`, `mail_lesen`) | „Was ist neu im Posteingang?" | lesen | Demo, PR #9 |
| Antwort als Entwurf ablegen (`antwort_entwurf_anlegen`) | „Antworte der Hausverwaltung: Donnerstag passt, danke!" | schreiben | Demo, PR #9 |
| Einordnen in „braucht dich heute", „kann warten" oder „Spam, egal", **mit sichtbarem Grund**, sonst entsteht kein Vertrauen (Design-Aufgabe) | „Was ist heute wichtig in meinen Mails?" | lesen | später (braucht Claude) |
| Kurzfassung statt vieler ungelesener Mails | „Fass mir meine Mails zusammen" | lesen | später (braucht Claude) |
| Senden, nur nach Freigabe | – | schreiben | später; bewusst noch kein Werkzeug |
| Termine und Fristen in Mails erkennen und als Termin oder Aufgabe vorschlagen | – | schreiben | Idee |

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
| Freie Zeiten im Kalender finden und vorschlagen | „Wann habe ich nächste Woche zwei Stunden frei?" | lesen | später |
| Nachricht oder Einladung an andere entwerfen, senden nur nach Freigabe | „Schlag Lisa Dienstag oder Donnerstag vor" | schreiben | später |
| Treffen vorbereiten und Protokoll festhalten | – | schreiben | Idee |

**Echte Anbindung:** hängt am Kalender (frei/belegt) und am Posteingang (Versand). Kanal offen; Messenger wie WhatsApp sind nicht geprüft.

### 3.7 Reisen & Besorgungen

**Zweck:** Erledigungen und Reisen planen, ohne an alles selbst zu denken. **Herkunft:** PA (Reisen und Unterkünfte buchen; privat: Besorgungen, Geschenke).

| Funktion | Beispielsatz | Art | Stand |
|---|---|---|---|
| Einkaufs- und Besorgungsliste | „Setz Milch auf die Einkaufsliste" | schreiben | Idee (evtl. als Liste in 3.3) |
| Reiseplan zusammenstellen (Zeiten, Orte, Verbindungen) | „Plan mir die Fahrt nach Hamburg" | lesen | Idee |
| Buchen: nur Vorschlag oder Link, denn Buchen kostet Geld und läuft nie ohne Freigabe | – | schreiben | Idee, technisch ungeprüft |
| An Geburtstage erinnern, Geschenkideen sammeln | – | – | Idee |

### 3.8 Zuhause

**Zweck:** Haushalt und Wohnung im Griff. **Herkunft:** J (betreibt Heizung, Kühlung und Sicherheit der Villa), PA privat (Haushalt, Handwerker).

| Funktion | Beispielsatz | Art | Stand |
|---|---|---|---|
| Smart Home steuern | „Mach die Heizung an" | schreiben | Idee, ungeprüft: welche Geräte Thies hat und ob es dafür eine Schnittstelle gibt |
| Wiederkehrende Haushaltsaufgaben | „Erinner mich jeden Monat an den Wasserfilter" | schreiben | Idee (über 3.3) |
| Termine mit Handwerkern abstimmen | – | schreiben | über 3.6 |

Bevor hier etwas geplant wird, mit Thies klären, was er konkret braucht.

### 3.9 Notizen (dazugekommen, nicht in der Skizze vom 08.10.2026)

| Funktion | Beispielsatz | Art | Stand |
|---|---|---|---|
| Notiz anlegen, anzeigen, löschen | „Notiz: Fahrradschloss kaufen" | schreiben | Demo, PR #10 |

Abgrenzung zum Gedächtnis: siehe `docs/architektur.md` (Abschnitt „Modul Notizen", kommt mit PR #10).

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
