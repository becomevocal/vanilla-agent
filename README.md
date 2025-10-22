## chatty-assistant -> a configurable widget in plain JS for AI assistants
Essentially a chat widget plus local demos and tooling. Flexible foundation to ship a custom assistant UI on a website.

Travrse is the first AI platform adapter available out of the box, but the UI and proxy are written so that you can point them at any SSE-capable platform.

- `packages/widget` – the installable chat widget (`@chaty-assistant/vanilla`, Travrse adapter included) and optional proxy utilities.
- `examples/embedded-app` – a Vite vanilla app showcasing runtime configuration (see `json.html` for the directive demo).
- `examples/proxy` – a lightweight Hono server that proxies to your AI backend (Travrse by default) for local development.

### Quick start

```bash
corepack enable
pnpm install
pnpm dev
```

The script starts the proxy on `http://localhost:43111` (auto-selects another free port if needed) and the embedded demo at `http://localhost:5173`. Both projects depend on the local widget package via workspace linking so changes hot-reload without publishing.

> **Note:** Make sure you are on Node `v20.19.0` (`nvm use`) before running `pnpm install`. Corepack is bundled with modern Node releases and manages pnpm for you.

See `packages/widget/README.md` for publishing details, configuration reference, and Travrse integration notes.

Install the widget library with `npm install @chaty-assistant/vanilla`.
