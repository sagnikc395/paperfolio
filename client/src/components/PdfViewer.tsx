import {
  PdfLoader,
  PdfHighlighter,
  Tip,
  Highlight,
  Popup,
  AreaHighlight,
} from "react-pdf-highlighter";
import type { MutableRefObject } from "react";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { PageSkeleton } from "./Skeleton";
import type { Highlight as AppHighlight, Comment, ScaledPosition } from "../types";

interface PdfViewerProps {
  url: string;
  highlights: AppHighlight[];
  onAddHighlight: (data: {
    content: string;
    comment: Comment;
    position: ScaledPosition;
  }) => void;
  onDeleteHighlight: (id: string) => void;
  scrollToRef: MutableRefObject<((highlight: AppHighlight) => void) | null>;
}

export function PdfViewer({
  url,
  highlights,
  onAddHighlight,
  onDeleteHighlight,
  scrollToRef,
}: PdfViewerProps) {
  return (
    <div className="pdf-container">
      <PdfLoader
        url={url}
        workerSrc={workerSrc}
        beforeLoad={<PageSkeleton />}
        errorMessage={
          <div className="pdf-message">
            <p className="pdf-message__title">This PDF can't be opened</p>
            <p className="pdf-message__hint">
              The file may have moved or been damaged. Use Replace PDF to point
              at it again.
            </p>
          </div>
        }
      >
        {(pdfDocument) => (
          <PdfHighlighter
            pdfDocument={pdfDocument}
            pdfScaleValue="auto"
            enableAreaSelection={() => false}
            onScrollChange={() => {}}
            scrollRef={(scrollTo) => {
              scrollToRef.current = scrollTo;
            }}
            onSelectionFinished={(
              position,
              content,
              hideTipAndSelection,
              transformSelection
            ) => {
              if (!content.text) return null;
              return (
                <Tip
                  onOpen={transformSelection}
                  onConfirm={(comment) => {
                    onAddHighlight({
                      content: content.text as string,
                      comment,
                      position,
                    });
                    hideTipAndSelection();
                  }}
                />
              );
            }}
            highlightTransform={(
              highlight,
              index,
              setTip,
              hideTip,
              _viewportToScaled,
              _screenshot,
              isScrolledTo
            ) => {
              const isTextHighlight = !highlight.content?.image;
              const component = isTextHighlight ? (
                <Highlight
                  isScrolledTo={isScrolledTo}
                  position={highlight.position}
                  comment={highlight.comment}
                />
              ) : (
                <AreaHighlight
                  highlight={highlight}
                  onChange={() => {}}
                  isScrolledTo={isScrolledTo}
                />
              );
              return (
                <Popup
                  popupContent={
                    <div className="highlight-popup">
                      {highlight.comment?.text ? (
                        <p className="highlight-popup__text">
                          {highlight.comment.text}
                        </p>
                      ) : null}
                      <button
                        className="highlight-popup__delete"
                        onClick={() => onDeleteHighlight(highlight.id)}
                      >
                        Delete highlight
                      </button>
                    </div>
                  }
                  onMouseOver={(popupContent) =>
                    setTip(highlight, () => popupContent)
                  }
                  onMouseOut={hideTip}
                  key={index}
                >
                  {component}
                </Popup>
              );
            }}
            highlights={highlights}
          />
        )}
      </PdfLoader>
    </div>
  );
}
