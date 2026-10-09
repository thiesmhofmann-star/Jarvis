import type { Metadata } from "next";
import Link from "next/link";
import { knopfKlassen } from "@/components/knopf";
import { Seite } from "@/components/seite";

export const metadata: Metadata = { title: "Seite nicht gefunden" };

export default function NichtGefunden() {
  return (
    <Seite titel="Seite nicht gefunden">
      <div className="flex flex-col items-start gap-mittel">
        <p className="text-text-gedaempft">
          Diese Adresse gibt es in Jarvis nicht.
        </p>
        <Link href="/" className={knopfKlassen}>
          Zurück zu Jarvis
        </Link>
      </div>
    </Seite>
  );
}
