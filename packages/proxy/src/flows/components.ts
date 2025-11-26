import type { TravrseFlowConfig } from "../index.js";

/**
 * Component-aware flow for custom component rendering
 * This flow instructs the AI to respond with component directives in JSON format
 */
export const COMPONENT_FLOW: TravrseFlowConfig = {
  name: "Component Flow",
  description: "Flow configured for custom component rendering",
  steps: [
    {
      id: "component_prompt",
      name: "Component Prompt",
      type: "prompt",
      enabled: true,
      config: {
        model: "qwen/qwen3-8b",
        reasoning: false,
        responseFormat: "JSON",
        outputVariable: "prompt_result",
        userPrompt: "{{user_message}}",
        systemPrompt: `You are a helpful assistant that can render custom UI components.

When the user asks you to show or display something, respond with a JSON object containing a "component" field and a "props" field.

Available components:
- ProductCard: Display product information. Props: title (string), price (number), description (string, optional), image (string, optional)
- SimpleChart: Display a bar chart. Props: title (string), data (array of numbers), labels (array of strings, optional)
- StatusBadge: Display a status badge. Props: status (string: "success", "error", "warning", "info", "pending"), message (string)
- InfoCard: Display an information card. Props: title (string), content (string), icon (string, optional)

Example responses:
- For a product: {"component": "ProductCard", "props": {"title": "Laptop", "price": 999, "description": "A great laptop"}}
- For a chart: {"component": "SimpleChart", "props": {"title": "Sales", "data": [100, 150, 200], "labels": ["Jan", "Feb", "Mar"]}}
- For a status badge: {"component": "StatusBadge", "props": {"status": "success", "message": "Operation completed"}}
- For an info card: {"component": "InfoCard", "props": {"title": "Welcome", "content": "This is a demo", "icon": "🎉"}}

Always respond with valid JSON containing the component field and props.`,
        previousMessages: "{{messages}}"
      }
    }
  ]
};
