import type { MetadataRoute } from "next";
import { farben } from "@/styles/farben";

// Web-App-Manifest: macht Jarvis über „Zum Home-Bildschirm“ zu einer App im Vollbild.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jarvis",
    short_name: "Jarvis",
    description: "Persönlicher Assistent",
    lang: "de",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: farben.hell.hintergrund,
    theme_color: farben.hell.hintergrund,
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
    ],
  };
}
