# Custom Components Example

This example demonstrates how to use custom components with the Vanilla Agent SDK. Components can be rendered from JSON directives streamed from the AI, with props that update incrementally as they're generated.

## Features

- **Component Registry**: Register custom components by name
- **JSON Streaming**: Components are invoked via JSON responses with the format `{"component": "ComponentName", "props": {...}}`
- **Incremental Updates**: Component props update in real-time as they stream in from the AI
- **Type Safety**: Full TypeScript support for component renderers

## How It Works

1. **Register Components**: Components are registered either via the global registry or in the widget config
2. **AI Response**: When the AI responds with a JSON object containing a `component` field, the SDK automatically:
   - Looks up the component in the registry
   - Renders it with the provided props
   - Updates the component as props stream in incrementally
3. **Fallback**: If a component isn't found, the SDK falls back to default text rendering

## Example Components

This example includes four demo components:

- **ProductCard**: Displays product information with image, title, description, and price
- **SimpleChart**: Renders a basic bar chart from data arrays
- **StatusBadge**: Shows a colored status badge
- **InfoCard**: Displays information in a styled card

## Usage

### Registering Components

```typescript
import { componentRegistry } from "vanilla-agent";
import { ProductCard } from "./components";

// Register via global registry
componentRegistry.register("ProductCard", ProductCard);
```

Or register via config:

```typescript
initAgentWidget({
  target: "#app",
  config: {
    components: {
      ProductCard,
      SimpleChart,
      StatusBadge,
      InfoCard
    },
    parserType: "json", // Required for component directives
    enableComponentStreaming: true // Enable streaming updates
  }
});
```

### Component Renderer Signature

```typescript
type ComponentRenderer = (
  props: Record<string, unknown>,
  context: {
    message: AgentWidgetMessage;
    config: AgentWidgetConfig;
    updateProps: (newProps: Record<string, unknown>) => void;
  }
) => HTMLElement;
```

### JSON Format

The AI should respond with JSON in this format:

```json
{
  "component": "ProductCard",
  "props": {
    "title": "Amazing Product",
    "price": 29.99,
    "image": "https://example.com/image.jpg",
    "description": "This is a great product!"
  }
}
```

## Running the Example

1. Make sure the proxy server is running (see main README)
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start the dev server:
   ```bash
   pnpm dev
   ```
4. Open `http://localhost:5174` in your browser
5. Try asking: "Show me a product card" or "Display a chart"

## Try It Out

Ask the AI to:
- "Show me a product card for a laptop priced at $999"
- "Display a chart with sales data: [100, 150, 200, 180, 250]"
- "Create a success status badge"
- "Show an info card with a warning message"

The components will render with props that update in real-time as they stream in!
