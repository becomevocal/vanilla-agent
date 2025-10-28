## Chat Proxy Example

Small Hono server that proxies calls to your chat backend so the browser never sees your secrets. Travrse support is included out of the box—just provide `TRAVRSE_API_KEY`.

### Usage

```bash
pnpm install
pnpm dev --filter proxy
```

Create a `.env` file alongside this package (or export env vars another way) and set any required secrets (e.g. `TRAVRSE_API_KEY=tv_test_xxx` and `TRAVRSE_FLOW_ID=flow_xxx`). The dev server automatically loads `.env` via `dotenv`. The server prefers port `43111` but automatically falls back to the next available port; the Vite demo app proxies `/api/chat/dispatch` to whatever port the proxy logs.

### Extra endpoints

- `POST /form` – used by the directive demo to handle interactive form submissions. Accepts JSON and returns `{ success, message, nextPrompt }`.

When you are ready to deploy, you can reuse this entrypoint with the widget’s `createVercelHandler` helper or bundle it with `pnpm build --filter proxy`.
