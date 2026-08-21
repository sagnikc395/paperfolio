# paperfolio.website

The landing page — what Paperfolio is, and where the DMG comes from.

React 18 + Vite + Tailwind v4, no backend. It is a static build: `dist/` is the
whole site.

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # → dist/
```

## Deploying to Vercel

The site is its own npm project, deliberately outside the root workspace, so
Vercel builds it without touching the Tauri app.

```bash
npm i -g vercel        # once
vercel                 # preview, from this directory
vercel --prod          # production
```

The CLI links the project on first run; when you do it from the dashboard
instead, import the repo and set **Root Directory** to `website`. Framework
(Vite), build command and output directory come from `vercel.json`.

## The download link

Both download buttons point at `<repo>/releases/latest`, so they follow whatever
release is newest and never need editing here. They 404 until a release exists:

```bash
npm run build --prefix ..      # from the repo root: builds the DMG
gh release create v0.1.0 \
  ../paperfolio/target/release/bundle/dmg/Paperfolio_0.1.0_aarch64.dmg \
  --title "Paperfolio 0.1.0" --notes "First release."
```

`VERSION` at the top of `src/App.tsx` is the only other place the version
appears — it's the line under the button.
