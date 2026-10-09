import { ImageResponse } from "next/og";
import { farben } from "@/styles/farben";

/**
 * Platzhalter-App-Icon: ein „J“ auf der Akzentfarbe. Wird für das
 * Home-Bildschirm-Icon (Apple) und die Manifest-Icons in mehreren Größen erzeugt.
 * Ohne Transparenz und ohne runde Ecken, die setzt das iPhone selbst.
 */
export function appIcon(groesse: number) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: farben.hell.akzent,
        color: farben.hell.aufAkzent,
        fontSize: Math.round(groesse * 0.6),
      }}
    >
      J
    </div>,
    { width: groesse, height: groesse },
  );
}
