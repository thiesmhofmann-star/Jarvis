import type { ReactNode } from "react";

/** Hinweis für Bereiche, in denen es noch nichts zu sehen gibt. */
export function LeerZustand({
  titel,
  children,
}: {
  titel: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-klein rounded-gross bg-flaeche p-gross text-center">
      <h2 className="text-gross font-fett">{titel}</h2>
      <p className="text-text-gedaempft">{children}</p>
    </div>
  );
}
