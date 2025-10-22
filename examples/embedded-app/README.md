## Embedded App Demo

This Vite (vanilla JS) app showcases the streaming chat widget running both inline and as a floating launcher. It consumes the library via the workspace link so live edits in `packages/widget` hot-reload here.

### Scripts

```bash
pnpm install
pnpm dev --filter proxy           # start backend proxy (prefers port 43111)
pnpm dev --filter embedded-app
```

Or from the repo root:

```bash
pnpm dev
```

- Proxy starts on `http://localhost:43111` (or the next free port) and forwards requests to your chat backend (Travrse adapter is bundled by default) once you set the appropriate secrets.
- If you override the proxy port, export `VITE_PROXY_PORT` (and optionally `VITE_PROXY_URL`) so the frontend points at the right target.
- Vite serves the demo UI on `http://localhost:5173`.

Tweak `src/main.ts` to experiment with different configuration presets, launcher styles, or metadata payloads. The demo now exposes buttons (`Open Launcher`, `Toggle Launcher`) wired up via the controller returned from `initChatWidget`.

## Directive demo

Open `http://localhost:5173/json.html` to see the JSON/directive example that renders interactive forms. The widget detects directives like `<Form type="init"/>` (or the JSON equivalent) and swaps them for custom UI, submitting to the proxy's `/form` endpoint.
