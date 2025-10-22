## Streaming Chat Widget

Installable vanilla JavaScript widget for embedding a streaming AI assistant on any website.

> The exported initializer is still named `initTravrseChat` for backwards compatibility with earlier Travrse integrations. Styles are precompiled with a `tvw-` prefix so they stay isolated from the host page, and the package ships with utilities for proxying your chat backend. Travrse support is built in, but the UI is backend-agnostic.

### Installation

```bash
npm install @chaty-widget/vanilla
```

### Building locally

```bash
pnpm build
```

- `dist/index.js` (ESM), `dist/index.cjs` (CJS), and `dist/index.global.js` (IIFE) provide different module formats.
- `dist/widget.css` is the prefixed Tailwind bundle.
- `dist/server/*` exposes the optional proxy implementation.

### Using with modules

```ts
import '@chaty-widget/vanilla/widget.css';
import {
  initTravrseChat,
  createChatExperience,
  markdownPostprocessor,
  directivePostprocessor
} from '@chaty-widget/vanilla';

const proxyUrl = '/api/chat/dispatch';

// Inline embed
const inlineHost = document.querySelector('#chat-widget-inline')!;
createChatExperience(inlineHost, {
  apiUrl: proxyUrl,
  launcher: { enabled: false },
  theme: { accent: '#2563eb', primary: '#111827' },
  suggestionChips: ['What can you do?', 'Show API docs'],
  postprocessMessage: ({ text }) => markdownPostprocessor(text)
});

// Floating launcher with runtime updates
const controller = initTravrseChat({
  target: '#chat-widget-launcher',
  config: {
    apiUrl: proxyUrl,
    launcher: {
      enabled: true,
      autoExpand: false,
      title: 'AI Assistant',
      subtitle: 'Here to help you get answers fast',
      width: 'min(420px, 95vw)'
    }
  }
});

document.querySelector('#dark-mode')?.addEventListener('click', () => {
  controller.update({ theme: { surface: '#0f172a', primary: '#f8fafc' } });
});
controller.update({
  postprocessMessage: ({ text, streaming }) =>
    streaming ? markdownPostprocessor(text) : directivePostprocessor(text)
});
```

> **Security note:** When you return HTML from `postprocessMessage`, make sure you sanitise it before injecting into the page. The provided postprocessors (`markdownPostprocessor`, `directivePostprocessor`) do not perform sanitisation.


### Programmatic control

`initTravrseChat` (and `createChatExperience`) return a controller with `open()`, `close()`, and `toggle()` helpers so you can launch the widget from your own UI elements.

```ts
const chat = initTravrseChat({
  target: '#chat-widget-launcher',
  config: { /* ... */ }
})

document.getElementById('open-chat')?.addEventListener('click', () => chat.open())
document.getElementById('toggle-chat')?.addEventListener('click', () => chat.toggle())
```

### Travrse adapter

This package ships with a Travrse adapter by default. To use it, simply point `apiUrl` at a proxy that forwards to the Travrse Dispatch API and provide `TRAVRSE_API_KEY` on the proxy. The rest of the widget remains backend-neutral, so you can swap in alternative providers by adjusting the proxy and payload mapping.

### Directive postprocessor

`directivePostprocessor` looks for either `<Form type="init" />` tokens or
`<Directive>{"component":"form","type":"init"}</Directive>` blocks and swaps them for placeholders that the widget upgrades into interactive UI (forms, cards, etc.). See `examples/embedded-app/json.html` for a full working example that submits to the proxy’s `/form` endpoint and posts a follow-up message back into the chat.

### Script drop-in

1. Serve `dist/index.global.js` and `dist/widget.css` from your CDN (or use a service like unpkg once published).
2. Add the assets and initializer to your page:

```html
<link rel="stylesheet" href="https://cdn.example.com/chaty-widget/widget.css" />
<script src="https://cdn.example.com/chaty-widget/index.global.js"></script>
<script>
  window.StreamChatWidget.initTravrseChat({
    target: '#chat-widget-anchor',
    config: {
      apiUrl: '/api/chat/dispatch',
      launcher: { title: 'AI Assistant', subtitle: 'Here to help' },
      theme: { accent: '#111827', surface: '#f5f5f5' }
    }
  });
</script>
```

The script build exposes a `window.StreamChatWidget` global.

### Configuration reference

| Option | Type | Description |
| --- | --- | --- |
| `apiUrl` | `string` | Proxy endpoint for your chat backend (defaults to Travrse's cloud API). |
| `metadata` | `Record<string, unknown>` | Additional context forwarded with each dispatch. |
| `flowId` | `string` | Optional identifier for routing inside Travrse. |
| `headers` | `Record<string, string>` | Extra headers forwarded to your proxy. |
| `copy` | `{ welcomeTitle?, welcomeSubtitle?, inputPlaceholder?, sendButtonLabel? }` | Customize user-facing text. |
| `theme` | `{ primary?, secondary?, surface?, muted?, accent? }` | Override CSS variables for the widget. |
| `features` | `TravrseFeatureFlags` | Toggle UI pieces (reserved for future expansion). |
| `launcher` | `{ enabled?, autoExpand?, title?, subtitle?, iconUrl?, position? }` | Controls the floating launcher button. |
| `initialMessages` | `TravrseMessage[]` | Seed the conversation transcript. |
| `suggestionChips` | `string[]` | Render quick reply buttons above the composer. |
| `postprocessMessage` | `(ctx) => string` | Transform message text before it renders (return HTML). Combine with `markdownPostprocessor` for rich output. |
| `formEndpoint` | `string` | Endpoint used by built-in directives (defaults to `/form`). |
| `launcherWidth` | `string` | CSS width applied to the floating launcher panel (e.g. `320px`, `90vw`). Defaults to `min(360px, calc(100vw - 24px))`. |
| `debug` | `boolean` | Emits verbose logs to `console`. |

All options are safe to mutate via `initTravrseChat(...).update(newConfig)`.

### Optional proxy server

```ts
// api/chat.ts
import { createTravrseProxyApp } from '@chaty-widget/vanilla/server';

export default createTravrseProxyApp({
  path: '/api/chat/dispatch',
  allowedOrigins: ['https://www.example.com']
});
```

Host on Vercel by exporting a handler:

```ts
import { createVercelHandler } from '@chaty-widget/vanilla/server';

export default createVercelHandler({
  allowedOrigins: ['https://www.example.com']
});
```

When using Travrse, add `TRAVRSE_API_KEY` to your environment. The server forwards POST bodies straight to `https://api.travrse.ai/v1/dispatch` and streams the response back to the client.

### Development notes

- The widget streams results using SSE and mirrors Travrse’s `flow_complete`/`step_chunk` events.
- Tailwind classes are prefixed with `tvw-` and scoped to `#chat-widget-root`, so they won’t collide with the host page.
- Run `pnpm dev` from the repository root to boot the example proxy (`examples/proxy`) and the vanilla demo (`examples/embedded-app`).
- The proxy prefers port `43111` but automatically selects the next free port if needed.
