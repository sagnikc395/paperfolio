import { useCallback, useEffect, useState } from "react";

export type FontKey = "sans" | "serif" | "mono";

export const FONT_STACKS: Record<FontKey, string> = {
  sans: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
  serif: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
  mono: '"SF Mono", ui-monospace, Menlo, Monaco, "Courier New", monospace',
};

export interface EditorPrefs {
  font: FontKey;
  size: number;
}

const DEFAULTS: EditorPrefs = { font: "sans", size: 15 };
const KEY = "paperfolio.editorPrefs";
const MIN_SIZE = 12;
const MAX_SIZE = 22;

function read(): EditorPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<EditorPrefs>;
    return {
      font: parsed.font && parsed.font in FONT_STACKS ? parsed.font : DEFAULTS.font,
      size:
        typeof parsed.size === "number"
          ? Math.min(MAX_SIZE, Math.max(MIN_SIZE, parsed.size))
          : DEFAULTS.size,
    };
  } catch {
    return DEFAULTS;
  }
}

/**
 * Editor font choice, shared by every markdown editor in the app and
 * remembered between launches. A reading preference should be set once, not
 * per note, so all mounted editors listen for the same change.
 */
const listeners = new Set<(prefs: EditorPrefs) => void>();
let current = read();

function publish(next: EditorPrefs) {
  current = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // A full or disabled store just means the choice is not remembered.
  }
  listeners.forEach((listener) => listener(next));
}

export function useEditorPrefs() {
  const [prefs, setPrefs] = useState<EditorPrefs>(current);

  useEffect(() => {
    listeners.add(setPrefs);
    setPrefs(current);
    return () => {
      listeners.delete(setPrefs);
    };
  }, []);

  const setFont = useCallback((font: FontKey) => publish({ ...current, font }), []);
  const setSize = useCallback(
    (size: number) =>
      publish({ ...current, size: Math.min(MAX_SIZE, Math.max(MIN_SIZE, size)) }),
    []
  );

  return { prefs, setFont, setSize };
}
