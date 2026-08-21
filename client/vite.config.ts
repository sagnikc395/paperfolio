import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The frontend is served to the Tauri webview; there is no API server to proxy
// to any more, since data access goes over IPC to the Rust core.
export default defineConfig({
  plugins: [react()],
  // Prevent Vite from obscuring Rust compiler errors.
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    target: "safari15",
    minify: "esbuild",
    sourcemap: false,
  },
});
