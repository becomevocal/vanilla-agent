# Action Middleware Example

This example demonstrates how to create a chat middleware that interacts with the page DOM by parsing JSON actions returned from Travrse Flow responses.

## Features

- **DOM Context Collection**: Automatically collects all page elements (classnames + innerText) and sends them to the LLM as context
- **Action Parsing**: Parses JSON responses from the LLM and executes actions
- **Action Types**:
  - `message`: Display a simple text message
  - `nav_then_click`: Navigate to another page and show a message after navigation
  - `message_and_click`: Display a message and click an element on the page
- **Chat History Persistence**: Saves chat history to localStorage and restores it on page load
- **Navigation Handling**: Automatically opens widget and shows message after navigation

## Setup

1. Install dependencies:
```bash
cd examples/action-middleware
npm install
```

2. Start the proxy server (in a separate terminal):
```bash
cd examples/proxy
npm install
npm run dev
```

3. Start the example:
```bash
cd examples/action-middleware
npm run dev
```

4. Open `http://localhost:5173` in your browser

## How It Works

### Middleware Flow

1. **Before sending a message**: The middleware collects all DOM elements with their classnames and innerText
2. **Request enhancement**: The page context is appended to the user message as additional context
3. **Response parsing**: The LLM response (in JSON format) is parsed to extract actions
4. **Action execution**: Actions are executed based on the parsed JSON:
   - `message`: Displays the text in the chat
   - `nav_then_click`: Saves a flag in localStorage, navigates to the page, and shows a message after navigation
   - `message_and_click`: Displays a message and clicks an element on the page
5. **History persistence**: All messages are saved to localStorage and restored on page load

### Example Conversation Flow

1. **User**: "I am looking for a black shirt in medium"
   - **Assistant**: `{"action": "message", "text": "Here are the products I found: \n- [Product 1](http://site.com/product-1) \n Would you like me to navigate to the first result and add it to your cart?"}`

2. **User**: "No, I would like to add another shirt to the cart"
   - **Assistant**: `{"action": "message_and_click", "element": ".AddToCartButton-button", "text": "I've added another item to your cart. Ready to checkout?"}`

3. **User**: "yes"
   - **Assistant**: `{"action": "nav_then_click", "page": "/products.html", "on_load_text": "The product has been added to your cart! Would you like to checkout?"}`

## Files

- `src/middleware.ts`: Core middleware functions for DOM collection, action parsing, and execution
- `src/main.ts`: Widget initialization and integration with middleware
- `index.html`: Main demo page with product listings
- `products.html`: Secondary page for navigation demo
- `vite.config.ts`: Vite configuration with proxy setup

## Server Configuration

The example uses a custom endpoint `/api/chat/dispatch-action` configured in `examples/proxy/src/server.ts` that:
- Uses JSON response format
- Includes a system prompt instructing the LLM to return actions in the specified format
- Provides examples and guidelines for action selection

## localStorage Structure

```typescript
{
  chatHistory: AgentWidgetMessage[],
  navFlag?: {
    onLoadText: string,
    timestamp: number
  }
}
```

Chat history is automatically saved and restored, maintaining conversation state across page navigations.

