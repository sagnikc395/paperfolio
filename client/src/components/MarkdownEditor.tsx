import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { useEditorPrefs, FONT_STACKS } from "../editorPrefs";
import type { FontKey } from "../editorPrefs";

/**
 * Markdown syntax highlighting tuned to the app's palette: structure is carried
 * by weight and size, and colour is spent only where it means something — the
 * gold on the marks that make text into structure, muted grey on the syntax
 * characters themselves so they recede while you write.
 */
const highlightStyle = HighlightStyle.define([
  { tag: t.heading1, fontSize: "1.5em", fontWeight: "700", color: "var(--text)" },
  { tag: t.heading2, fontSize: "1.28em", fontWeight: "700", color: "var(--text)" },
  { tag: t.heading3, fontSize: "1.12em", fontWeight: "650", color: "var(--text)" },
  { tag: [t.heading4, t.heading5, t.heading6], fontWeight: "650", color: "var(--text)" },
  { tag: t.strong, fontWeight: "700", color: "var(--text)" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through", color: "var(--text-muted)" },
  { tag: t.link, color: "var(--primary)", textDecoration: "underline" },
  { tag: t.url, color: "var(--primary)" },
  { tag: t.quote, color: "var(--text-muted)", fontStyle: "italic" },
  { tag: t.list, color: "var(--primary)" },
  { tag: t.monospace, color: "#7a4f10", background: "var(--gold-wash)" },
  // The literal #, *, ` and - characters.
  { tag: [t.processingInstruction, t.meta], color: "var(--text-muted)", opacity: "0.65" },
]);

const baseTheme = EditorView.theme({
  "&": { backgroundColor: "transparent" },
  "&.cm-focused": { outline: "none" },
  ".cm-content": { padding: "12px 14px", caretColor: "var(--text)" },
  ".cm-line": { padding: "0" },
  ".cm-gutters": { display: "none" },
  ".cm-activeLine": { backgroundColor: "transparent" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "#f3e6c8 !important",
  },
  ".cm-cursor": { borderLeftColor: "var(--text)" },
  ".cm-placeholder": { color: "var(--text-muted)" },
});

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  /** Shows the font controls. Off for compact inline editors. */
  showControls?: boolean;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Write in markdown… **bold**, _italic_, # heading, - list",
  minHeight = 160,
  showControls = true,
}: MarkdownEditorProps) {
  const { prefs, setFont, setSize } = useEditorPrefs();

  const extensions = useMemo(
    () => [
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      syntaxHighlighting(highlightStyle),
      baseTheme,
      EditorView.lineWrapping,
      EditorView.theme({
        ".cm-content, .cm-scroller": {
          fontFamily: FONT_STACKS[prefs.font],
          fontSize: `${prefs.size}px`,
          lineHeight: "1.65",
        },
      }),
    ],
    [prefs.font, prefs.size]
  );

  return (
    <div className="md-editor">
      {showControls && (
        <div className="md-editor__bar">
          <span className="md-editor__hint">Markdown</span>
          <div className="md-editor__controls">
            <label className="md-editor__control">
              <span className="sr-only">Font</span>
              <select
                value={prefs.font}
                onChange={(e) => setFont(e.target.value as FontKey)}
                aria-label="Editor font"
              >
                <option value="sans">Sans</option>
                <option value="serif">Serif</option>
                <option value="mono">Mono</option>
              </select>
            </label>
            <div className="md-editor__stepper" role="group" aria-label="Font size">
              <button
                type="button"
                onClick={() => setSize(prefs.size - 1)}
                disabled={prefs.size <= 12}
                aria-label="Smaller text"
              >
                −
              </button>
              <span className="md-editor__size">{prefs.size}</span>
              <button
                type="button"
                onClick={() => setSize(prefs.size + 1)}
                disabled={prefs.size >= 22}
                aria-label="Larger text"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}
      <CodeMirror
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        extensions={extensions}
        minHeight={`${minHeight}px`}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLine: false,
          highlightActiveLineGutter: false,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: false,
          searchKeymap: false,
        }}
      />
    </div>
  );
}
