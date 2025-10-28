## Streaming Chat Widget

Installable vanilla JavaScript widget for embedding a streaming AI assistant on any website.

### Installation

```bash
npm install @chaty-assistant/vanilla
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
import '@chaty-assistant/vanilla/widget.css';
import {
  initChatWidget,
  createChatExperience,
  markdownPostprocessor,
  directivePostprocessor
} from '@chaty-assistant/vanilla';

const proxyUrl = '/api/chat/dispatch';

// Inline embed
const inlineHost = document.querySelector('#inline-widget')!;
createChatExperience(inlineHost, {
  apiUrl: proxyUrl,
  launcher: { enabled: false },
  theme: { accent: '#2563eb', primary: '#111827' },
  features: {
    showReasoning: true,   // Show thinking bubbles (default: true)
    showToolCalls: true    // Show tool usage bubbles (default: true)
  },
  suggestionChips: ['What can you do?', 'Show API docs'],
  postprocessMessage: ({ text }) => markdownPostprocessor(text)
});

// Floating launcher with runtime updates
const controller = initChatWidget({
  target: '#launcher-root',
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

`initChatWidget` (and `createChatExperience`) return a controller with `open()`, `close()`, and `toggle()` helpers so you can launch the widget from your own UI elements.

```ts
const chat = initChatWidget({
  target: '#launcher-root',
  config: { /* ... */ }
})

document.getElementById('open-chat')?.addEventListener('click', () => chat.open())
document.getElementById('toggle-chat')?.addEventListener('click', () => chat.toggle())
```

### Travrse adapter

This package ships with a Travrse adapter by default. The proxy handles all flow configuration, keeping the client lightweight and flexible.

**Flow configuration happens server-side** - you have three options:

1. **Use default flow** - The proxy includes a basic streaming chat flow out of the box
2. **Reference a Travrse flow ID** - Configure flows in your Travrse dashboard and reference them by ID
3. **Define custom flows** - Build flow configurations directly in the proxy

The client simply sends messages to the proxy, which constructs the full Travrse payload. This architecture allows you to:
- Change models/prompts without redeploying the widget
- A/B test different flows server-side
- Enforce security and cost controls centrally
- Support multiple flows for different use cases

### Directive postprocessor

`directivePostprocessor` looks for either `<Form type="init" />` tokens or
`<Directive>{"component":"form","type":"init"}</Directive>` blocks and swaps them for placeholders that the widget upgrades into interactive UI (forms, cards, etc.). See `examples/embedded-app/json.html` for a full working example that submits to the proxy’s `/form` endpoint and posts a follow-up message back into the chat.

### Script drop-in

1. Serve `dist/index.global.js` and `dist/widget.css` from your CDN (or use a service like unpkg once published).
2. Add the assets and initializer to your page:

```html
<link rel="stylesheet" href="https://cdn.example.com/chaty-assistant/widget.css" />
<script src="https://cdn.example.com/chaty-assistant/index.global.js"></script>
<script>
  window.ChatWidget.initChatWidget({
    target: '#chaty-assistant-anchor',
    config: {
      apiUrl: '/api/chat/dispatch',
      launcher: { title: 'AI Assistant', subtitle: 'Here to help' },
      theme: { accent: '#111827', surface: '#f5f5f5' }
    }
  });
</script>
```

The script build exposes a `window.ChatWidget` global.

### Configuration reference

| Option | Type | Description |
| --- | --- | --- |
| `apiUrl` | `string` | Proxy endpoint for your chat backend (defaults to Travrse's cloud API). |
| `flowId` | `string` | Optional Travrse flow ID. If provided, the client sends it to the proxy which can use it to select a specific flow. |
| `headers` | `Record<string, string>` | Extra headers forwarded to your proxy. |
| `copy` | `{ welcomeTitle?, welcomeSubtitle?, inputPlaceholder?, sendButtonLabel? }` | Customize user-facing text. |
| `theme` | `{ primary?, secondary?, surface?, muted?, accent? }` | Override CSS variables for the widget. |
| `features` | `ChatWidgetFeatureFlags` | Toggle UI features: `showReasoning?` (show thinking bubbles, default: `true`), `showToolCalls?` (show tool usage bubbles, default: `true`). |
| `launcher` | `{ enabled?, autoExpand?, title?, subtitle?, iconUrl?, position? }` | Controls the floating launcher button. |
| `initialMessages` | `ChatWidgetMessage[]` | Seed the conversation transcript. |
| `suggestionChips` | `string[]` | Render quick reply buttons above the composer. |
| `postprocessMessage` | `(ctx) => string` | Transform message text before it renders (return HTML). Combine with `markdownPostprocessor` for rich output. |
| `formEndpoint` | `string` | Endpoint used by built-in directives (defaults to `/form`). |
| `launcherWidth` | `string` | CSS width applied to the floating launcher panel (e.g. `320px`, `90vw`). Defaults to `min(360px, calc(100vw - 24px))`. |
| `debug` | `boolean` | Emits verbose logs to `console`. |

All options are safe to mutate via `initChatWidget(...).update(newConfig)`.

### Optional proxy server

The proxy server handles flow configuration and forwards requests to Travrse. You can configure it in three ways:

**Option 1: Use default flow (recommended for getting started)**

```ts
// api/chat.ts
import { createChatProxyApp } from '@chaty-assistant/vanilla/server';

export default createChatProxyApp({
  path: '/api/chat/dispatch',
  allowedOrigins: ['https://www.example.com']
});
```

**Option 2: Reference a Travrse flow ID**

```ts
import { createChatProxyApp } from '@chaty-assistant/vanilla/server';

export default createChatProxyApp({
  path: '/api/chat/dispatch',
  allowedOrigins: ['https://www.example.com'],
  flowId: 'flow_abc123' // Flow created in Travrse dashboard
});
```

**Option 3: Define a custom flow**

```ts
import { createChatProxyApp } from '@chaty-assistant/vanilla/server';

export default createChatProxyApp({
  path: '/api/chat/dispatch',
  allowedOrigins: ['https://www.example.com'],
  flowConfig: {
    name: "Custom Chat Flow",
    description: "Specialized assistant flow",
    steps: [
      {
        id: "custom_prompt",
        name: "Custom Prompt",
        type: "prompt",
        enabled: true,
        config: {
          text: "{{_record.metadata.message}}",
          model: "anthropic/claude-3.5-sonnet",
          responseFormat: "markdown",
          outputVariable: "prompt_result",
          userPrompt: "{{_record.metadata.message}}",
          systemPrompt: "You are a specialized assistant. Previous messages:\n{{_record.metadata.previous_messages}}"
        }
      }
    ]
  }
});
```

**Hosting on Vercel:**

```ts
import { createVercelHandler } from '@chaty-assistant/vanilla/server';

export default createVercelHandler({
  allowedOrigins: ['https://www.example.com'],
  flowId: 'flow_abc123' // Optional
});
```

**Environment setup:**

Add `TRAVRSE_API_KEY` to your environment. The proxy constructs the Travrse payload (including flow configuration) and streams the response back to the client.

### Development notes

- The widget streams results using SSE and mirrors the backend `flow_complete`/`step_chunk` events.
- Tailwind classes are prefixed with `tvw-` and scoped to `#chaty-assistant-root`, so they won’t collide with the host page.
- Run `pnpm dev` from the repository root to boot the example proxy (`examples/proxy`) and the vanilla demo (`examples/embedded-app`).
- The proxy prefers port `43111` but automatically selects the next free port if needed.
