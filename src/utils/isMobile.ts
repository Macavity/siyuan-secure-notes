import { getFrontend } from "siyuan";

export function isMobile() {
  const frontend = getFrontend();
  return frontend === "mobile" || frontend === "browser-mobile";
}
