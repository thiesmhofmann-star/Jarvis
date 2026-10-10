"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ChatEintrag, FreigabeAnsicht } from "@/core/assistant/eintraege";
import { Seite } from "../seite";
import {
  ChatFehler,
  MELDUNG_ALLGEMEIN,
  sendeEntscheidung,
  sendeNachricht,
} from "./api";
import { Eingabe } from "./eingabe";
import { FreigabeKarte } from "./freigabe-karte";

export const DEMO_HINWEIS =
  "Jarvis antwortet mit vorbereiteten Texten. Nichts wird gespeichert.";

const BEISPIELE = [
  "Was steht heute an?",
  "Trag Zahnarzt Freitag 10 Uhr ein",
  "Was ist diese Woche fällig?",
];

type Eintrag =
  | { id: number; art: "du" | "jarvis" | "fehler"; text: string }
  | { id: number; art: "freigabe"; aktion: FreigabeAnsicht };

type NeuerEintrag =
  | { art: "du" | "jarvis" | "fehler"; text: string }
  | { art: "freigabe"; aktion: FreigabeAnsicht };

/**
 * Erst nach der Hydration (React übernimmt die fertige Seite im Browser) sind
 * Knöpfe und Eingabe bedienbar. Vorher wäre ein Tippen wirkungslos.
 */
function useBereit() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/** Nur geprüfte deutsche Meldungen zeigen, nie technische Fehlertexte. */
function meldung(fehler: unknown) {
  return fehler instanceof ChatFehler ? fehler.message : MELDUNG_ALLGEMEIN;
}

/** Was ein Screenreader zu neuen Antworten von Jarvis vorliest. */
function ansageFuer(eintraege: ChatEintrag[]) {
  return eintraege
    .map((e) =>
      e.art === "jarvis"
        ? `Jarvis: ${e.text}`
        : `Jarvis bittet um Freigabe: ${e.aktion.vorschau.titel}`,
    )
    .join(" ");
}

/**
 * Der Chat im Bereich „Jarvis“. Der Verlauf lebt nur in dieser Seite und ist
 * nach dem Neuladen weg; die Sitzungs-ID ebenso.
 */
export function Chat() {
  const [eintraege, setEintraege] = useState<Eintrag[]>([]);
  const [entwurf, setEntwurf] = useState("");
  const [denkt, setDenkt] = useState(false);
  const [ansage, setAnsage] = useState("");
  const bereit = useBereit();
  const naechsteId = useRef(0);
  const sitzung = useRef<string | null>(null);

  const holeSitzung = () => (sitzung.current ??= crypto.randomUUID());

  function hinzufuegen(neue: NeuerEintrag[]) {
    const mitId = neue.map(
      (e) => ({ ...e, id: naechsteId.current++ }) as Eintrag,
    );
    setEintraege((alt) => [...alt, ...mitId]);
  }

  // Neue Einträge sichtbar machen: ans Seitenende scrollen, wo das
  // Eingabefeld direkt unter dem Verlauf liegt.
  useEffect(() => {
    if (eintraege.length > 0) {
      document.scrollingElement?.scrollTo?.({
        top: document.scrollingElement.scrollHeight,
      });
    }
  }, [eintraege.length, denkt]);

  async function senden(text: string) {
    const sauber = text.trim();
    if (!sauber || denkt) return;
    hinzufuegen([{ art: "du", text: sauber }]);
    setEntwurf("");
    setDenkt(true);
    try {
      const antwort = await sendeNachricht(holeSitzung(), sauber);
      hinzufuegen(antwort.eintraege);
      setAnsage(ansageFuer(antwort.eintraege));
    } catch (fehler) {
      hinzufuegen([{ art: "fehler", text: meldung(fehler) }]);
    } finally {
      setDenkt(false);
    }
  }

  async function entscheiden(
    aktionId: string,
    entscheidung: "freigeben" | "ablehnen",
  ) {
    setDenkt(true);
    try {
      const antwort = await sendeEntscheidung(
        holeSitzung(),
        aktionId,
        entscheidung,
      );
      setEintraege((alt) =>
        alt.map((e) =>
          e.art === "freigabe" && e.aktion.id === aktionId
            ? { ...e, aktion: antwort.aktion }
            : e,
        ),
      );
      hinzufuegen(antwort.eintraege);
      setAnsage(ansageFuer(antwort.eintraege));
    } catch (fehler) {
      hinzufuegen([{ art: "fehler", text: meldung(fehler) }]);
    } finally {
      setDenkt(false);
    }
  }

  return (
    <Seite
      titel="Jarvis"
      unten={
        <Eingabe
          wert={entwurf}
          aendern={setEntwurf}
          senden={() => senden(entwurf)}
          bereit={bereit}
          denkt={denkt}
        />
      }
    >
      <div className="flex flex-col gap-gross">
        <p
          role="note"
          className="rounded-klein border border-rand px-mittel py-klein text-klein text-text-gedaempft"
        >
          <strong className="font-fett text-text">Demo-Modus</strong> –{" "}
          {DEMO_HINWEIS}
        </p>

        {eintraege.length === 0 ? (
          <Beispiele waehlen={senden} gesperrt={!bereit} />
        ) : (
          <ol
            aria-label="Unterhaltung mit Jarvis"
            className="flex flex-col gap-mittel"
          >
            {eintraege.map((eintrag) => (
              <li
                key={eintrag.id}
                className={`flex flex-col gap-sehr-klein ${
                  eintrag.art === "du" ? "items-end" : "items-start"
                }`}
              >
                <span className="text-klein text-text-gedaempft">
                  {eintrag.art === "du" ? "Du" : "Jarvis"}
                  <span className="sr-only">:</span>
                </span>
                {eintrag.art === "freigabe" ? (
                  <FreigabeKarte
                    aktion={eintrag.aktion}
                    entscheiden={entscheiden}
                    gesperrt={denkt}
                  />
                ) : (
                  <p
                    role={eintrag.art === "fehler" ? "alert" : undefined}
                    className={`max-w-sprechblase rounded-gross px-mittel py-klein whitespace-pre-line ${
                      eintrag.art === "du"
                        ? "bg-akzent text-auf-akzent"
                        : eintrag.art === "jarvis"
                          ? "bg-flaeche text-text"
                          : "border border-fehler bg-hintergrund text-fehler"
                    }`}
                  >
                    {eintrag.text}
                  </p>
                )}
              </li>
            ))}
            {denkt && (
              <li className="flex flex-col items-start gap-sehr-klein">
                <span className="text-klein text-text-gedaempft">Jarvis</span>
                <p
                  role="status"
                  className="flex items-center gap-klein rounded-gross bg-flaeche px-mittel py-klein text-text-gedaempft"
                >
                  <span
                    aria-hidden="true"
                    className="size-klein rounded-rund bg-akzent motion-safe:animate-pulsieren"
                  />
                  Jarvis denkt …
                </p>
              </li>
            )}
          </ol>
        )}

        {/* Liest neue Antworten von Jarvis vor, ohne die eigenen Nachrichten zu wiederholen. */}
        <p aria-live="polite" className="sr-only">
          {ansage}
        </p>
      </div>
    </Seite>
  );
}

function Beispiele({
  waehlen,
  gesperrt,
}: {
  waehlen: (text: string) => void;
  gesperrt: boolean;
}) {
  return (
    <section
      aria-labelledby="beispiele-titel"
      className="flex flex-col gap-mittel rounded-gross bg-flaeche p-gross"
    >
      <div className="flex flex-col gap-sehr-klein">
        <h2 id="beispiele-titel" className="text-gross font-fett">
          Was kann ich für dich tun?
        </h2>
        <p className="text-text-gedaempft">
          Tipp einen Beispielsatz an oder schreib unten selbst.
        </p>
      </div>
      <ul className="flex flex-col gap-klein">
        {BEISPIELE.map((satz) => (
          <li key={satz}>
            <button
              type="button"
              onClick={() => waehlen(satz)}
              disabled={gesperrt}
              className="flex min-h-tippflaeche w-full items-center rounded-klein border border-rand bg-hintergrund px-mittel text-left text-akzent"
            >
              „{satz}“
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
