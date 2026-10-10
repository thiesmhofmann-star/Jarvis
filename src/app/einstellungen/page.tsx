import type { Metadata } from "next";
import { Seite } from "@/components/seite";
import { registrierteModule } from "@/modules/registry";

export const metadata: Metadata = { title: "Einstellungen" };

export default function Einstellungen() {
  return (
    <Seite titel="Einstellungen">
      <div className="flex flex-col gap-gross">
        <section
          aria-labelledby="module-titel"
          className="flex flex-col gap-mittel"
        >
          <h2 id="module-titel" className="text-gross font-fett">
            Aktive Module
          </h2>
          {/* Kommt direkt aus der Registry: Ein neues Modul erscheint hier von selbst. */}
          <ul className="flex flex-col gap-klein">
            {registrierteModule.map((modul) => (
              <li
                key={modul.id}
                className="flex flex-col gap-sehr-klein rounded-gross bg-flaeche p-mittel"
              >
                <h3 className="font-fett">{modul.name}</h3>
                <p className="text-text-gedaempft">{modul.description}</p>
              </li>
            ))}
          </ul>
        </section>
        <p className="text-text-gedaempft">
          Gedächtnis und Konto kommen mit dem Anschluss-Block dazu.
        </p>
      </div>
    </Seite>
  );
}
