import { useEffect, useState } from "react";
import { basename } from "../dialogs";

export interface PaperFormValues {
  title: string;
  authors: string;
  abstract: string;
  year: string;
  venue: string;
  url: string;
}

const EMPTY: PaperFormValues = {
  title: "",
  authors: "",
  abstract: "",
  year: "",
  venue: "",
  url: "",
};

interface PaperFormModalProps {
  heading: string;
  submitLabel: string;
  initial?: Partial<PaperFormValues>;
  saving: boolean;
  /** Only shown when adding a paper; an existing one uses Replace PDF instead. */
  pdf?: {
    path: string | null;
    onPick: () => void;
    onClear: () => void;
  };
  onSubmit: (values: PaperFormValues) => void;
  onClose: () => void;
}

/**
 * The metadata form for a paper, shared by "Add paper" and "Edit details" so
 * the two can never drift apart.
 */
export function PaperFormModal({
  heading,
  submitLabel,
  initial,
  saving,
  pdf,
  onSubmit,
  onClose,
}: PaperFormModalProps) {
  const [values, setValues] = useState<PaperFormValues>({ ...EMPTY, ...initial });

  const set =
    (key: keyof PaperFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((prev) => ({ ...prev, [key]: e.target.value }));

  // Escape closes the sheet, as it would in any native dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.title.trim()) return;
    onSubmit(values);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={heading}
      >
        <div className="modal__header">
          <h2>{heading}</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form onSubmit={submit} className="paper-form">
          <label>
            {/* Kept in one span: the label is a column flex container, so a bare
                asterisk would become its own flex item and drop to a new line. */}
            <span>
              Title <span className="required">*</span>
            </span>
            <input value={values.title} onChange={set("title")} required autoFocus />
          </label>
          <label>
            Authors
            <input
              value={values.authors}
              onChange={set("authors")}
              placeholder="e.g. Hinton, G., et al."
            />
          </label>
          <div className="paper-form__row">
            <label>
              Year
              <input
                value={values.year}
                onChange={set("year")}
                type="number"
                min="1900"
                max="2100"
              />
            </label>
            <label>
              Venue
              <input
                value={values.venue}
                onChange={set("venue")}
                placeholder="e.g. NeurIPS 2024"
              />
            </label>
          </div>
          <label>
            URL
            <input
              value={values.url}
              onChange={set("url")}
              type="url"
              placeholder="https://arxiv.org/abs/…"
            />
          </label>
          <label>
            Abstract
            <textarea value={values.abstract} onChange={set("abstract")} rows={4} />
          </label>

          {pdf && (
            <div className="field">
              <span className="field__label">PDF file</span>
              <div className="file-picker">
                <button type="button" className="btn" onClick={pdf.onPick}>
                  {pdf.path ? "Change PDF…" : "Choose PDF…"}
                </button>
                <span className="file-picker__name">
                  {pdf.path ? basename(pdf.path) : "No file chosen"}
                </span>
                {pdf.path && (
                  <button
                    type="button"
                    className="file-picker__clear"
                    onClick={pdf.onClear}
                    aria-label="Remove chosen PDF"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="paper-form__actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Saving…" : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Form values -> API patch. Blank boxes become nulls, which clear the field. */
export function toPatch(values: PaperFormValues) {
  const orNull = (v: string) => (v.trim() === "" ? null : v.trim());
  return {
    title: values.title.trim(),
    authors: orNull(values.authors),
    abstract: orNull(values.abstract),
    year: values.year.trim() === "" ? null : Number(values.year),
    venue: orNull(values.venue),
    url: orNull(values.url),
  };
}
