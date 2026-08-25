# CodeForMe Python Sandbox

A single static site: a browser-based Python sandbox (via [Pyodide](https://pyodide.org)) with a
canvas drawing/game API and a mock AI helper ("Byte"), branded for codeforme.org. Light theme,
built for kids.

## Run it locally

Needs to be served over HTTP (not opened as a `file://` path) since it fetches `sandbox.py`
and the Pyodide runtime.

```bash
cd codeforme-sandbox
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploying

It's fully static — `index.html`, `styles.css`, `app.js`, `sandbox.py`. Drop the folder on any
static host (Netlify, Vercel, GitHub Pages, S3, etc.) with no build step.

## Files

- `index.html` — page structure and content
- `styles.css` — CodeForMe theme (colors/fonts live at the top as CSS variables)
- `app.js` — editor wiring, Pyodide boot/run loop, and the Byte chat logic
- `sandbox.py` — the `sandbox` module exposed to user code (`clear`, `rect`, `circle`, `line`,
  `text`, `key_down`, `on_tick`) for drawing and simple games

## Wiring up a real AI for Byte

Byte currently answers from a small keyword-matched rule list in `app.js`
(`AI_RULES` / `respondTo`) — no backend, no API key, works out of the box.

To make it call a real model instead:

1. Stand up a tiny backend endpoint (Node/Flask/etc.) that holds your API key server-side and
   proxies to your model provider — **never** put an API key in this front-end code, it's public.
2. In `app.js`, replace the `respondTo(text)` call inside the `ai-form` submit handler with a
   `fetch()` to your endpoint, sending the user's message (and optionally the current editor
   contents for context) and awaiting the reply text.
3. Everything else (chat bubbles, typing indicator, open/close panel) can stay as-is.

## Customizing branding

- Colors/fonts: CSS variables at the top of `styles.css` (`--accent`, `--accent-2`, `--font-ui`, `--font-display`, `--font-mono`)
- Logo mark / wordmark, nav links, footer links: `index.html` (`.logo`, `.site-nav`, `.site-footer`)
- Newsletter link: search `forms.gle` in `index.html`
- Default drawing colors (used when example code doesn't pass `color=`): top of `sandbox.py`
