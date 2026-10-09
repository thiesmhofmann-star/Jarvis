"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { bereiche, istAktiv } from "./bereiche";
import { Symbol } from "./symbol";

/**
 * Tab-Leiste am unteren Rand, wie bei iPhone-Apps. Bleibt beim Scrollen
 * sichtbar und hält über `pb-sicher` Abstand zum Home-Indikator.
 */
export function TabLeiste() {
  const pfad = usePathname();

  return (
    <nav
      aria-label="Hauptnavigation"
      className="sticky bottom-0 border-t border-rand bg-flaeche px-sicher pb-sicher"
    >
      <ul className="mx-auto flex max-w-inhalt justify-around">
        {bereiche.map((bereich) => {
          const aktiv = istAktiv(bereich.href, pfad);
          return (
            <li key={bereich.href}>
              <Link
                href={bereich.href}
                aria-current={aktiv ? "page" : undefined}
                // Aktiv: Akzentfarbe und fett, damit es nicht nur an der Farbe hängt.
                className={`flex min-h-tippflaeche min-w-tippflaeche flex-col items-center justify-center gap-sehr-klein px-mittel pt-klein text-klein ${
                  aktiv ? "font-fett text-akzent" : "text-text-gedaempft"
                }`}
              >
                <Symbol name={bereich.symbol} />
                <span>{bereich.titel}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
