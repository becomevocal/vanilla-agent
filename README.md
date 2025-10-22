## Streaming Chat Workspace

This pnpm workspace hosts a generic, streaming chat widget plus local demos and tooling. Travrse is the first backend adapter available out of the box, but the UI and proxy are written so that you can point them at any SSE-capable platform.

- `packages/widget` – the installable chat widget (`@chaty-widget/vanilla`, Travrse adapter included) and optional proxy utilities.
- `examples/embedded-app` – a Vite vanilla app showcasing runtime configuration (see `json.html` for the directive demo).
- `examples/proxy` – a lightweight Hono server that proxies your chat backend (Travrse by default) for local development.

### Quick start

```bash
corepack enable
pnpm install
pnpm dev
```

The script starts the proxy on `http://localhost:43111` (auto-selects another free port if needed) and the embedded demo at `http://localhost:5173`. Both projects depend on the local widget package via workspace linking so changes hot-reload without publishing.

> **Note:** Make sure you are on Node `v20.19.0` (`nvm use`) before running `pnpm install`. Corepack is bundled with modern Node releases and manages pnpm for you.

See `packages/widget/README.md` for publishing details, configuration reference, and Travrse integration notes.
