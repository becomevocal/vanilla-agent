import type { TravrseFlowConfig } from "../index.js";

/**
 * Scheduling flow configuration
 * This flow returns a form to test rendering using post processing:
 */
export const FORM_DIRECTIVE_FLOW: TravrseFlowConfig = {
  name: "Form Flow",
  description: "Returns Form for rendering in chat",
  steps: [
    {
      id: "form_prompt",
      name: "Form Prompt",
      type: "prompt",
      enabled: true,
      config: {
        model: "qwen/qwen3-8b",
        reasoning: false,
        responseFormat: "JSON",
        outputVariable: "prompt_result",
        userPrompt: "{{user_message}}",
        systemPrompt: `You are a helpful scheduling assistant.
When the user provides scheduling details, respond with the directive <Form type=\"init\"/> so the widget can render an interactive form.`,
        previousMessages: "{{messages}}"
      }
    }
  ]
};
