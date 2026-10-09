import { appIcon } from "@/components/app-icon";

const groessen = [192, 512];

// Die Größen, die das Web-App-Manifest verlangt (siehe manifest.ts).
export function generateImageMetadata() {
  return groessen.map((groesse) => ({
    id: String(groesse),
    size: { width: groesse, height: groesse },
    contentType: "image/png",
  }));
}

export default async function Icon({ id }: { id: Promise<string> }) {
  return appIcon(Number(await id));
}
