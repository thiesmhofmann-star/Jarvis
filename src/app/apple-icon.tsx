import { appIcon } from "@/components/app-icon";

// Apple-Touch-Icon: das Symbol auf dem iPhone-Home-Bildschirm.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return appIcon(size.width);
}
