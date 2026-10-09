import { LeerZustand } from "@/components/leer-zustand";
import { Seite } from "@/components/seite";

export default function Startseite() {
  return (
    <Seite titel="Jarvis">
      <LeerZustand titel="Noch kein Chat">
        Hier kommt bald der Chat mit Jarvis hin.
      </LeerZustand>
    </Seite>
  );
}
