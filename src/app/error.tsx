"use client";

import { useEffect } from "react";
import { FehlerAnzeige } from "@/components/fehler-anzeige";

// Fängt Fehler in den Seiten ab. Layout und Tab-Leiste bleiben dabei stehen.
export default function Fehler({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Landet in der Browser-Konsole bzw. in den Vercel-Logs zur Fehlersuche.
    console.error(error);
  }, [error]);

  return <FehlerAnzeige erneutVersuchen={retry} />;
}
