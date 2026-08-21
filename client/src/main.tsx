import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";

// Note: StrictMode is intentionally omitted. react-pdf-highlighter creates and
// tears down a PDFViewer instance asynchronously, and StrictMode's double-mount
// in development can race that lifecycle (detached viewer / duplicated pages).
ReactDOM.createRoot(document.getElementById("root")!).render(
  <HashRouter>
    <App />
  </HashRouter>
);
