# Plan: Streamlined Custom Component Import System

## Overview
Create a streamlined way to import and use custom components in the SDK, leveraging existing middleware functionality and JSON streaming parser to stream component props as they're generated.

## Architecture

### 1. Component Registry System
**Location**: `packages/widget/src/components/registry.ts` (new file)

- Create a `ComponentRegistry` class similar to `PluginRegistry`
- Allow registration of custom components with:
  - Component name/identifier
  - Render function that takes props and returns HTMLElement
  - Optional prop schema/validator
  - Optional priority for rendering order

**API**:
```typescript
interface CustomComponent {
  name: string;
  render: (props: Record<string, unknown>, context: ComponentContext) => HTMLElement;
  priority?: number;
  validateProps?: (props: unknown) => boolean;
}

interface ComponentContext {
  message: AgentWidgetMessage;
  config: AgentWidgetConfig;
  streaming: boolean;
}
```

### 2. Enhanced JSON Stream Parser
**Location**: `packages/widget/src/utils/formatting.ts` (modify)

- Extend `createFlexibleJsonStreamParser` or create new `createComponentAwareJsonStreamParser`
- Detect component references in JSON stream format:
  ```json
  {
    "text": "Here's a custom component:",
    "component": {
      "name": "ProductCard",
      "props": {
        "title": "Product Name",
        "price": 29.99,
        "image": "https://..."
      }
    }
  }
  ```
- Stream component props incrementally as JSON is parsed
- Return both text and component data in parser result

**Parser Result Extension**:
```typescript
interface ComponentStreamParserResult extends AgentWidgetStreamParserResult {
  component?: {
    name: string;
    props: Record<string, unknown>;
    streaming?: boolean; // true if props are still streaming
  };
}
```

### 3. Component Middleware Integration
**Location**: `packages/widget/src/utils/components.ts` (new file)

- Create middleware function that:
  - Intercepts parsed component data from stream parser
  - Looks up component in registry
  - Renders component with streaming props
  - Handles prop updates as they stream in
  - Falls back to text display if component not found

- Integrate with existing `postprocessMessage` hook
- Support both inline components (within message text) and standalone components

### 4. Message Bubble Enhancement
**Location**: `packages/widget/src/components/message-bubble.ts` (modify)

- Extend `createStandardBubble` to detect and render components
- Support component placeholders in markdown/text (e.g., `<Component name="ProductCard" />`)
- Render components inline with message content
- Handle streaming component props updates

### 5. Type Definitions
**Location**: `packages/widget/src/types.ts` (modify)

- Add component-related types:
  - `AgentWidgetComponent`
  - `AgentWidgetComponentContext`
  - `AgentWidgetComponentRegistry`
- Extend `AgentWidgetStreamParserResult` to include component data
- Add component config to `AgentWidgetConfig`

### 6. Public API Exports
**Location**: `packages/widget/src/index.ts` (modify)

- Export component registry functions:
  - `registerComponent`
  - `unregisterComponent`
  - `getComponent`
  - `componentRegistry`
- Export component-aware parser:
  - `createComponentAwareJsonStreamParser`
- Export component utilities:
  - `createComponentRenderer`

### 7. Example Implementation
**Location**: `examples/custom-components/` (new example directory)

Create a complete example showing:
- **Setup**: How to register custom components
- **Streaming**: How component props stream in as JSON is generated
- **Integration**: How to use with existing middleware
- **Multiple Components**: Show different component types
- **Error Handling**: What happens when component not found or props invalid

**Example Structure**:
```
examples/custom-components/
├── index.html
├── package.json
├── README.md
├── src/
│   ├── main.ts          # Main setup and component registration
│   ├── components.ts    # Custom component definitions
│   ├── middleware.ts    # Example middleware integration
│   └── styles.css       # Component styles
```

**Example Components to Demonstrate**:
1. **ProductCard**: Shows product with image, title, price, button
2. **DataTable**: Displays tabular data that streams in row by row
3. **Chart**: Visual component that updates as data streams
4. **Form**: Interactive form component with streaming field definitions

**Example JSON Response Format**:
```json
{
  "text": "Here are some products:",
  "components": [
    {
      "name": "ProductCard",
      "props": {
        "title": "Example Product",
        "price": 29.99,
        "image": "https://example.com/image.jpg"
      }
    }
  ]
}
```

Or streaming format where props update incrementally:
```json
{
  "text": "Loading product...",
  "component": {
    "name": "ProductCard",
    "props": {
      "title": "Example",
      "price": null,
      "image": null
    }
  }
}
// ... later in stream ...
{
  "component": {
    "name": "ProductCard",
    "props": {
      "title": "Example Product",
      "price": 29.99,
      "image": null
    }
  }
}
```

## Implementation Steps

1. **Phase 1: Core Infrastructure**
   - Create component registry system
   - Add component types to types.ts
   - Export registry API from index.ts

2. **Phase 2: Parser Enhancement**
   - Extend/create component-aware JSON stream parser
   - Handle incremental prop updates
   - Return component data in parser results

3. **Phase 3: Rendering Integration**
   - Create component renderer middleware
   - Integrate with message bubble rendering
   - Handle streaming prop updates

4. **Phase 4: Example Creation**
   - Create example directory structure
   - Implement example components
   - Write comprehensive README with usage instructions
   - Show integration with existing middleware patterns

5. **Phase 5: Documentation & Testing**
   - Update main README with component system docs
   - Add JSDoc comments to all public APIs
   - Ensure backward compatibility

## Key Design Decisions

1. **Streaming Props**: Component props can update incrementally as JSON streams in, allowing for progressive rendering
2. **Registry Pattern**: Centralized component registry allows easy registration and lookup
3. **Middleware Integration**: Leverages existing middleware hooks for seamless integration
4. **Fallback Behavior**: If component not found or invalid, falls back to displaying text/JSON
5. **Type Safety**: Full TypeScript support with prop validation
6. **Backward Compatible**: Existing code continues to work without changes

## Benefits

1. **Streamlined**: Simple API for registering and using components
2. **Streaming Support**: Props can stream in as they're generated
3. **Type Safe**: Full TypeScript support
4. **Flexible**: Works with existing middleware patterns
5. **Extensible**: Easy to add new components
6. **Performant**: Incremental rendering as props arrive

## Questions to Consider

1. Should components support async prop loading (e.g., loading images)?
2. Should we support component nesting (components within components)?
3. Should components be able to emit events back to the widget?
4. Should we support component lifecycle hooks (mount, update, unmount)?
5. Should components have access to the full message history?

## Files to Create/Modify

### New Files:
- `packages/widget/src/components/registry.ts`
- `packages/widget/src/utils/components.ts`
- `examples/custom-components/index.html`
- `examples/custom-components/package.json`
- `examples/custom-components/README.md`
- `examples/custom-components/src/main.ts`
- `examples/custom-components/src/components.ts`
- `examples/custom-components/src/middleware.ts`
- `examples/custom-components/src/styles.css`
- `examples/custom-components/tsconfig.json`
- `examples/custom-components/vite.config.ts`

### Modified Files:
- `packages/widget/src/types.ts` - Add component types
- `packages/widget/src/utils/formatting.ts` - Add component-aware parser
- `packages/widget/src/components/message-bubble.ts` - Add component rendering
- `packages/widget/src/index.ts` - Export component APIs
- `packages/widget/README.md` - Document component system
