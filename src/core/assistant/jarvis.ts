import { aktionenImArbeitsspeicher } from "@/core/guard/aktionen";
import { erstelleSchutzschicht } from "@/core/guard/schutzschicht";
import { findeWerkzeug, werkzeuge } from "@/modules/registry";
import { erstelleChat } from "./chat";
import { erstelleDemoGehirn } from "./demo-gehirn";
import { gespraecheImArbeitsspeicher } from "./gespraeche";

/**
 * Hier wird Jarvis zusammengesteckt. Im Anschluss-Block ändern sich nur diese
 * Zeilen: Claude statt Demo-Gehirn, Datenbank statt Arbeitsspeicher.
 */
export const jarvis = erstelleChat({
  gehirn: erstelleDemoGehirn(),
  schutzschicht: erstelleSchutzschicht({
    findeWerkzeug,
    speicher: aktionenImArbeitsspeicher(),
  }),
  werkzeuge,
  gespraeche: gespraecheImArbeitsspeicher(),
});
