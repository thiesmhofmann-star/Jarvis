import type { Metadata } from "next";
import { LeerZustand } from "@/components/leer-zustand";
import { Seite } from "@/components/seite";

export const metadata: Metadata = { title: "Einstellungen" };

export default function Einstellungen() {
  return (
    <Seite titel="Einstellungen">
      <LeerZustand titel="Noch nichts einzustellen">
        Hier kommen später Gedächtnis und Module hin.
      </LeerZustand>
    </Seite>
  );
}
