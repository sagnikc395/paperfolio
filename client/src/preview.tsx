// Temporary harness for visual review of the notes editor. Not shipped.
import ReactDOM from "react-dom/client";
import { NotesPanel } from "./components/NotesPanel";
import "./styles.css";

const notes = [
  {
    id: "n1",
    paper_id: "p1",
    title: "PCA derivation",
    content:
      "## Two routes to the same projection\n\nBoth **maximum variance** and _minimum reconstruction error_ land on the\nsame subspace.\n\n- eigendecomposition of the covariance matrix\n- top `k` eigenvectors form the basis\n\n> Worth re-deriving by hand before the reading group.\n\nSee [the chapter](https://mml-book.github.io) for the full argument.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

ReactDOM.createRoot(document.getElementById("root")!).render(
  <div style={{ maxWidth: 900, margin: "0 auto" }}>
    <NotesPanel
      notes={notes}
      onCreate={() => {}}
      onUpdate={() => {}}
      onDelete={() => {}}
    />
  </div>
);
