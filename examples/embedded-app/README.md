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

## Examples

### Basic Demo
- **Main page**: `http://localhost:5173` or `http://localhost:5173/index.html`
  - Shows inline widget and launcher widget examples
  - Basic chat functionality

### Directive Demo
- **Directive page**: `http://localhost:5173/json.html`
  - Demonstrates the JSON/directive postprocessor that renders interactive forms
  - The widget detects directives like `<Form type="init"/>` (or the JSON equivalent) and swaps them for custom UI, submitting to the proxy's `/form` endpoint

### Action Middleware / E-commerce Demo
- **E-commerce page**: `http://localhost:5173/action-middleware.html`
  - Demonstrates chat middleware that interacts with the page DOM
  - Collects DOM elements (classnames + innerText) and sends them to the LLM as context
  - Parses JSON action responses and executes actions (message, navigation, clicking elements)
  - Includes chat history persistence via localStorage
  - **Product detail page**: `http://localhost:5173/products.html` (for navigation demo)

The action middleware example demonstrates:
- DOM context collection for LLM decision-making
- JSON action parsing (`message`, `nav_then_click`, `message_and_click`)
- Automatic element clicking based on LLM responses
- Page navigation with persistent chat state
- localStorage-based chat history persistence
