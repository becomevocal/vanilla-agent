## Streaming Agent Widget

Installable vanilla JavaScript widget for embedding a streaming AI assistant on any website.

### Installation

```bash
npm install vanilla-agent
```

### Building locally

```bash
pnpm build
```

- `dist/index.js` (ESM), `dist/index.cjs` (CJS), and `dist/index.global.js` (IIFE) provide different module formats.
- `dist/widget.css` is the prefixed Tailwind bundle.
- `dist/install.global.js` is the automatic installer script for easy script tag installation.

### Using with modules

```ts
import 'vanilla-agent/widget.css';
import {
  initAgentWidget,
  createAgentExperience,
  markdownPostprocessor,
  directivePostprocessor,
  DEFAULT_WIDGET_CONFIG
} from 'vanilla-agent';

const proxyUrl = '/api/chat/dispatch';

// Inline embed
const inlineHost = document.querySelector('#inline-widget')!;
createAgentExperience(inlineHost, {
  ...DEFAULT_WIDGET_CONFIG,
  apiUrl: proxyUrl,
  launcher: { enabled: false },
  theme: {
    ...DEFAULT_WIDGET_CONFIG.theme,
    accent: '#2563eb'
  },
  suggestionChips: ['What can you do?', 'Show API docs'],
  postprocessMessage: ({ text }) => markdownPostprocessor(text)
});

// Floating launcher with runtime updates
const controller = initAgentWidget({
  target: '#launcher-root',
  windowKey: 'chatController', // Optional: stores controller on window.chatController
  config: {
    ...DEFAULT_WIDGET_CONFIG,
    apiUrl: proxyUrl,
    launcher: {
      ...DEFAULT_WIDGET_CONFIG.launcher,
      title: 'AI Assistant',
      subtitle: 'Here to help you get answers fast'
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

### Initialization options

`initAgentWidget` accepts the following options:

| Option | Type | Description |
| --- | --- | --- |
| `target` | `string \| HTMLElement` | CSS selector or element where widget mounts. |
| `config` | `AgentWidgetConfig` | Widget configuration object (see [Configuration reference](#configuration-reference) below). |
| `useShadowDom` | `boolean` | Use Shadow DOM for style isolation (default: `true`). |
| `onReady` | `() => void` | Callback fired when widget is initialized. |
| `windowKey` | `string` | If provided, stores the controller on `window[windowKey]` for global access. Automatically cleaned up on `destroy()`. |

> **Security note:** When you return HTML from `postprocessMessage`, make sure you sanitise it before injecting into the page. The provided postprocessors (`markdownPostprocessor`, `directivePostprocessor`) do not perform sanitisation.


### Programmatic control

`initAgentWidget` (and `createAgentExperience`) return a controller with methods to programmatically control the widget.

#### Basic controls

```ts
const chat = initAgentWidget({
  target: '#launcher-root',
  config: { /* ... */ }
})

document.getElementById('open-chat')?.addEventListener('click', () => chat.open())
document.getElementById('toggle-chat')?.addEventListener('click', () => chat.toggle())
document.getElementById('close-chat')?.addEventListener('click', () => chat.close())
```

#### Message hooks

You can programmatically set messages, submit messages, and control voice recognition:

```ts
const chat = initAgentWidget({
  target: '#launcher-root',
  config: { /* ... */ }
})

// Set a message in the input field (doesn't submit)
chat.setMessage("Hello, I need help")

// Submit a message (uses textarea value if no argument provided)
chat.submitMessage()
// Or submit a specific message
chat.submitMessage("What are your hours?")

// Start voice recognition
chat.startVoiceRecognition()

// Stop voice recognition
chat.stopVoiceRecognition()
```

All hook methods return `boolean` indicating success (`true`) or failure (`false`). They will automatically open the widget if it's currently closed (when launcher is enabled).

#### Accessing from window

To access the controller globally (e.g., from browser console or external scripts), use the `windowKey` option:

```ts
const chat = initAgentWidget({
  target: '#launcher-root',
  windowKey: 'chatController', // Stores controller on window.chatController
  config: { /* ... */ }
})

// Now accessible globally
window.chatController.setMessage("Hello from console!")
window.chatController.submitMessage("Test message")
window.chatController.startVoiceRecognition()
```

#### Message Types

The widget uses `AgentWidgetMessage` objects to represent messages in the conversation. You can access these through `postprocessMessage` callbacks or by inspecting the session's message array.

```typescript
type AgentWidgetMessage = {
  id: string;                    // Unique message identifier
  role: "user" | "assistant" | "system";
  content: string;               // Message text content
  createdAt: string;             // ISO timestamp
  streaming?: boolean;           // Whether message is still streaming
  variant?: "assistant" | "reasoning" | "tool";
  sequence?: number;             // Message ordering
  reasoning?: AgentWidgetReasoning;
  toolCall?: AgentWidgetToolCall;
  tools?: AgentWidgetToolCall[];
  viaVoice?: boolean;            // Indicates if user message was sent via voice input
};
```

**`viaVoice` field**: Set to `true` when a user message is sent through voice recognition. This allows you to implement voice-specific behaviors, such as automatically reactivating voice recognition after assistant responses. You can check this field in your `postprocessMessage` callback:

```ts
postprocessMessage: ({ message, text, streaming }) => {
  if (message.role === 'user' && message.viaVoice) {
    console.log('User sent message via voice');
  }
  return text;
}
```

Alternatively, manually assign the controller:

```ts
const chat = initAgentWidget({ /* ... */ })
window.chatController = chat
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

### Script tag installation

The widget can be installed via a simple script tag, perfect for platforms where you can't compile custom code. There are two methods:

#### Method 1: Automatic installer (recommended)

The easiest way is to use the automatic installer script. It handles loading CSS and JavaScript, then initializes the widget automatically:

```html
<!-- Add this before the closing </body> tag -->
<script>
  window.siteAgentConfig = {
    target: 'body', // or '#my-container' for specific placement
    config: {
      apiUrl: 'https://your-proxy.com/api/chat/dispatch',
      launcher: {
        enabled: true,
        title: 'AI Assistant',
        subtitle: 'How can I help you?'
      },
      theme: {
        accent: '#2563eb',
        surface: '#ffffff'
      }
    }
  };
</script>
<script src="https://cdn.jsdelivr.net/npm/vanilla-agent@latest/dist/install.global.js"></script>
```

**Installer options:**

- `version` - Package version to load (default: `"latest"`)
- `cdn` - CDN provider: `"jsdelivr"` or `"unpkg"` (default: `"jsdelivr"`)
- `cssUrl` - Custom CSS URL (overrides CDN)
- `jsUrl` - Custom JS URL (overrides CDN)
- `target` - CSS selector or element where widget mounts (default: `"body"`)
- `config` - Widget configuration object (see Configuration reference)
- `autoInit` - Automatically initialize after loading (default: `true`)

**Example with version pinning:**

```html
<script>
  window.siteAgentConfig = {
    version: '0.1.0', // Pin to specific version
    config: {
      apiUrl: '/api/chat/dispatch',
      launcher: { enabled: true, title: 'Support Chat' }
    }
  };
</script>
<script src="https://cdn.jsdelivr.net/npm/vanilla-agent@0.1.0/dist/install.global.js"></script>
```

#### Method 2: Manual installation

For more control, manually load CSS and JavaScript:

```html
<!-- Load CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/vanilla-agent@latest/dist/widget.css" />

<!-- Load JavaScript -->
<script src="https://cdn.jsdelivr.net/npm/vanilla-agent@latest/dist/index.global.js"></script>

<!-- Initialize widget -->
<script>
  const chatController = window.AgentWidget.initAgentWidget({
    target: '#vanilla-agent-anchor', // or 'body' for floating launcher
    windowKey: 'chatWidget', // Optional: stores controller on window.chatWidget
    config: {
      apiUrl: '/api/chat/dispatch',
      launcher: {
        enabled: true,
        title: 'AI Assistant',
        subtitle: 'Here to help'
      },
      theme: {
        accent: '#111827',
        surface: '#f5f5f5'
      }
    }
  });
  
  // Controller is now available as window.chatWidget (if windowKey was used)
  // or use the returned chatController variable
</script>
```

**CDN options:**

- **jsDelivr** (recommended): `https://cdn.jsdelivr.net/npm/vanilla-agent@VERSION/dist/`
- **unpkg**: `https://unpkg.com/vanilla-agent@VERSION/dist/`

Replace `VERSION` with `latest` for auto-updates, or a specific version like `0.1.0` for stability.

**Available files:**

- `widget.css` - Stylesheet (required)
- `index.global.js` - Widget JavaScript (IIFE format)
- `install.global.js` - Automatic installer script

The script build exposes a `window.AgentWidget` global with `initAgentWidget()` and other exports.

### Using default configuration

The package exports a complete default configuration that you can use as a base:

```ts
import { DEFAULT_WIDGET_CONFIG, mergeWithDefaults } from 'vanilla-agent';

// Option 1: Use defaults with selective overrides
const controller = initAgentWidget({
  target: '#app',
  config: {
    ...DEFAULT_WIDGET_CONFIG,
    apiUrl: '/api/chat/dispatch',
    theme: {
      ...DEFAULT_WIDGET_CONFIG.theme,
      accent: '#custom-color'  // Override only what you need
    }
  }
});

// Option 2: Use the merge helper
const controller = initAgentWidget({
  target: '#app',
  config: mergeWithDefaults({
    apiUrl: '/api/chat/dispatch',
    theme: { accent: '#custom-color' }
  })
});
```

This ensures all configuration values are set to sensible defaults while allowing you to customize only what you need.

### Configuration reference

| Option | Type | Description |
| --- | --- | --- |
| `apiUrl` | `string` | Proxy endpoint for your chat backend (defaults to Travrse's cloud API). |
| `flowId` | `string` | Optional Travrse flow ID. If provided, the client sends it to the proxy which can use it to select a specific flow. |
| `headers` | `Record<string, string>` | Extra headers forwarded to your proxy. |
| `copy` | `{ welcomeTitle?, welcomeSubtitle?, inputPlaceholder?, sendButtonLabel? }` | Customize user-facing text. |
| `theme` | `{ primary?, secondary?, surface?, muted?, accent?, radiusSm?, radiusMd?, radiusLg?, radiusFull? }` | Override CSS variables for the widget. Colors: `primary` (text/UI), `secondary` (unused), `surface` (backgrounds), `muted` (secondary text), `accent` (buttons/links). Border radius: `radiusSm` (0.75rem, inputs), `radiusMd` (1rem, cards), `radiusLg` (1.5rem, panels/bubbles), `radiusFull` (9999px, pills/buttons). |
| `features` | `AgentWidgetFeatureFlags` | Toggle UI features: `showReasoning?` (show thinking bubbles, default: `true`), `showToolCalls?` (show tool usage bubbles, default: `true`). |
| `launcher` | `{ enabled?, autoExpand?, title?, subtitle?, iconUrl?, position? }` | Controls the floating launcher button. |
| `initialMessages` | `AgentWidgetMessage[]` | Seed the conversation transcript. |
| `suggestionChips` | `string[]` | Render quick reply buttons above the composer. |
| `postprocessMessage` | `(ctx) => string` | Transform message text before it renders (return HTML). Combine with `markdownPostprocessor` for rich output. |
| `formEndpoint` | `string` | Endpoint used by built-in directives (defaults to `/form`). |
| `launcherWidth` | `string` | CSS width applied to the floating launcher panel (e.g. `320px`, `90vw`). Defaults to `min(400px, calc(100vw - 24px))`. |
| `debug` | `boolean` | Emits verbose logs to `console`. |

All options are safe to mutate via `initAgentWidget(...).update(newConfig)`.

### Optional proxy server

The proxy server handles flow configuration and forwards requests to Travrse. You can configure it in three ways:

**Option 1: Use default flow (recommended for getting started)**

```ts
// api/chat.ts
import { createChatProxyApp } from 'vanilla-agent-proxy';

export default createChatProxyApp({
  path: '/api/chat/dispatch',
  allowedOrigins: ['https://www.example.com']
});
```

**Option 2: Reference a Travrse flow ID**

```ts
import { createChatProxyApp } from 'vanilla-agent-proxy';

export default createChatProxyApp({
  path: '/api/chat/dispatch',
  allowedOrigins: ['https://www.example.com'],
  flowId: 'flow_abc123' // Flow created in Travrse dashboard or API
});
```

**Option 3: Define a custom flow**

```ts
import { createChatProxyApp } from 'vanilla-agent-proxy';

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
          model: "meta/llama3.1-8b-instruct-free",
          responseFormat: "markdown",
          outputVariable: "prompt_result",
          userPrompt: "{{user_message}}",
          systemPrompt: "you are a helpful assistant, chatting with a user",
          previousMessages: "{{messages}}"
        }
      }
    ]
  }
});
```

**Hosting on Vercel:**

```ts
import { createVercelHandler } from 'vanilla-agent-proxy';

export default createVercelHandler({
  allowedOrigins: ['https://www.example.com'],
  flowId: 'flow_abc123' // Optional
});
```

**Environment setup:**

Add `TRAVRSE_API_KEY` to your environment. The proxy constructs the Travrse payload (including flow configuration) and streams the response back to the client.

### Development notes

- The widget streams results using SSE and mirrors the backend `flow_complete`/`step_chunk` events.
- Tailwind-esc classes are prefixed with `tvw-` and scoped to `#vanilla-agent-root`, so they won't collide with the host page.
- Run `pnpm dev` from the repository root to boot the example proxy (`examples/proxy`) and the vanilla demo (`examples/embedded-app`).
- The proxy prefers port `43111` but automatically selects the next free port if needed.
