import { z } from "zod";
import { MAX_NACHRICHT_LAENGE } from "./eintraege";

/** Was der Browser an /api/chat schicken darf. Wird auf dem Server geprüft. */
export const chatAnfrage = z.discriminatedUnion("art", [
  z.object({
    art: z.literal("nachricht"),
    sitzung: z.uuid(),
    text: z.string().trim().min(1).max(MAX_NACHRICHT_LAENGE),
  }),
  z.object({
    art: z.literal("entscheidung"),
    sitzung: z.uuid(),
    aktionId: z.uuid(),
    entscheidung: z.enum(["freigeben", "ablehnen"]),
  }),
]);

export type ChatAnfrage = z.input<typeof chatAnfrage>;
