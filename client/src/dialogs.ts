import { open, confirm } from "@tauri-apps/plugin-dialog";

/**
 * Native macOS open panel, replacing `<input type="file">`. Returns the
 * absolute path of the chosen PDF, or null if the user cancelled.
 */
export async function pickPdf(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    directory: false,
    title: "Choose a PDF",
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  return typeof selected === "string" ? selected : null;
}

/** Native confirmation sheet, replacing `window.confirm`. */
export async function confirmDestructive(
  message: string,
  title: string
): Promise<boolean> {
  return confirm(message, { title, kind: "warning", okLabel: "Delete" });
}

/** The trailing path component, for showing the user what they picked. */
export function basename(path: string): string {
  return path.split("/").pop() ?? path;
}
