import { Routes, Route } from "react-router-dom";
import { WelcomePage } from "./pages/WelcomePage";
import { LibraryPage } from "./pages/LibraryPage";
import { PaperPage } from "./pages/PaperPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/library" element={<LibraryPage />} />
      <Route path="/paper/:id" element={<PaperPage />} />
    </Routes>
  );
}
