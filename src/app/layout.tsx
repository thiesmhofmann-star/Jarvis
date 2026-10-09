import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Sprunglink } from "@/components/sprunglink";
import { TabLeiste } from "@/components/tab-leiste";
import { farben } from "@/styles/farben";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Jarvis", template: "%s – Jarvis" },
  description: "Persönlicher Assistent",
  appleWebApp: {
    capable: true,
    title: "Jarvis",
    // „default“ hält die Statusleiste lesbar, hell wie dunkel.
    // „black-translucent“ hätte weiße Schrift, die auf hellem Grund verschwindet.
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  // Die Seite darf bis in die Ecken reichen; Abstände regeln die Safe Areas.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: farben.hell.hintergrund },
    { media: "(prefers-color-scheme: dark)", color: farben.dunkel.hintergrund },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="de">
      <body className="flex min-h-dvh flex-col">
        <Sprunglink />
        {children}
        <TabLeiste />
      </body>
    </html>
  );
}
