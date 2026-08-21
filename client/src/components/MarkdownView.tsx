import { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { useEditorPrefs, FONT_STACKS } from "../editorPrefs";

/**
 * Renders a stored note. The content is the user's own markdown, but it is
 * still sanitized before it reaches the DOM — a note can arrive from a `.md`
 * file edited outside the app, so it is not trusted input.
 */
export function MarkdownView({ source }: { source: string }) {
  const { prefs } = useEditorPrefs();

  const html = useMemo(() => {
    const raw = marked.parse(source, { async: false, gfm: true, breaks: true });
    return DOMPurify.sanitize(raw as string, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ["style", "form", "input", "iframe"],
      FORBID_ATTR: ["style", "onerror", "onload"],
    });
  }, [source]);

  return (
    <div
      className="md-view"
      style={{ fontFamily: FONT_STACKS[prefs.font], fontSize: prefs.size }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
