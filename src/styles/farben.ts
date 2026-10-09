/**
 * Farben für Stellen, die keine CSS-Variablen lesen können: Web-App-Manifest,
 * App-Icons und die Farbe der Browser-Leiste (theme-color).
 *
 * Die Werte sind eine Kopie aus `tokens.css`. Wer dort eine dieser Farben
 * ändert, ändert sie hier mit; `farben.test.ts` schlägt sonst fehl.
 */
export const farben = {
  hell: {
    hintergrund: "#ffffff",
    akzent: "#0050c8",
    aufAkzent: "#ffffff",
  },
  dunkel: {
    hintergrund: "#111113",
  },
} as const;
