import { AgentWidgetMessage, AgentWidgetConfig } from "../types";
import { componentRegistry, ComponentContext } from "../components/registry";
import { ComponentDirective, createComponentStreamParser } from "./component-parser";
import { createStandardBubble, MessageTransform } from "../components/message-bubble";

/**
 * Options for component middleware
 */
export interface ComponentMiddlewareOptions {
  config: AgentWidgetConfig;
  message: AgentWidgetMessage;
  transform: MessageTransform;
  onPropsUpdate?: (props: Record<string, unknown>) => void;
}

/**
 * Renders a component directive into an HTMLElement
 */
export function renderComponentDirective(
  directive: ComponentDirective,
  options: ComponentMiddlewareOptions
): HTMLElement | null {
  const { config, message, onPropsUpdate } = options;

  console.log(`[ComponentMiddleware] renderComponentDirective: Attempting to render`, {
    component: directive.component,
    props: directive.props,
    messageId: message.id
  });

  // Get component renderer from registry
  const renderer = componentRegistry.get(directive.component);
  if (!renderer) {
    // Component not found, fall back to default rendering
    const availableComponents = componentRegistry.getAllNames();
    console.warn(
      `[ComponentMiddleware] Component "${directive.component}" not found in registry.`,
      `Available components:`, availableComponents,
      `Falling back to default rendering.`
    );
    return null;
  }

  console.log(`[ComponentMiddleware] renderComponentDirective: Found renderer for "${directive.component}"`);

  // Create component context
  const context: ComponentContext = {
    message,
    config,
    updateProps: (newProps: Record<string, unknown>) => {
      if (onPropsUpdate) {
        onPropsUpdate(newProps);
      }
    }
  };

  try {
    // Render the component
    console.log(`[ComponentMiddleware] renderComponentDirective: Calling renderer with props`, directive.props);
    const element = renderer(directive.props, context);
    console.log(`[ComponentMiddleware] renderComponentDirective: Renderer returned element`, element);
    return element;
  } catch (error) {
    console.error(
      `[ComponentMiddleware] Error rendering component "${directive.component}":`,
      error
    );
    return null;
  }
}

/**
 * Creates middleware that processes component directives from streamed JSON
 */
export function createComponentMiddleware() {
  const parser = createComponentStreamParser();

  return {
    /**
     * Process accumulated content and extract component directive
     */
    processChunk: (accumulatedContent: string): ComponentDirective | null => {
      return parser.processChunk(accumulatedContent);
    },

    /**
     * Get the currently extracted directive
     */
    getDirective: (): ComponentDirective | null => {
      return parser.getExtractedDirective();
    },

    /**
     * Reset the parser state
     */
    reset: () => {
      parser.reset();
    }
  };
}

/**
 * Checks if a message contains a component directive in its raw content
 */
export function hasComponentDirective(message: AgentWidgetMessage): boolean {
  if (!message.rawContent) {
    console.log(`[ComponentMiddleware] hasComponentDirective: No rawContent for message ${message.id}`);
    return false;
  }
  
  try {
    const parsed = JSON.parse(message.rawContent);
    const hasComponent = (
      typeof parsed === "object" &&
      parsed !== null &&
      "component" in parsed &&
      typeof parsed.component === "string"
    );
    console.log(`[ComponentMiddleware] hasComponentDirective: ${hasComponent}`, {
      messageId: message.id,
      rawContent: message.rawContent.substring(0, 200),
      parsed: parsed,
      hasComponentField: "component" in parsed
    });
    return hasComponent;
  } catch (error) {
    console.log(`[ComponentMiddleware] hasComponentDirective: JSON parse error`, {
      messageId: message.id,
      error: error,
      rawContent: message.rawContent.substring(0, 200)
    });
    return false;
  }
}

/**
 * Extracts component directive from a complete message
 */
export function extractComponentDirectiveFromMessage(
  message: AgentWidgetMessage
): ComponentDirective | null {
  if (!message.rawContent) {
    console.log(`[ComponentMiddleware] extractComponentDirectiveFromMessage: No rawContent for message ${message.id}`);
    return null;
  }

  try {
    const parsed = JSON.parse(message.rawContent);
    console.log(`[ComponentMiddleware] extractComponentDirectiveFromMessage: Parsed JSON`, {
      messageId: message.id,
      parsed: parsed,
      hasComponent: "component" in parsed,
      componentName: parsed.component
    });
    
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "component" in parsed &&
      typeof parsed.component === "string"
    ) {
      const directive = {
        component: parsed.component,
        props: (parsed.props && typeof parsed.props === "object" && parsed.props !== null
          ? parsed.props
          : {}) as Record<string, unknown>,
        raw: message.rawContent
      };
      console.log(`[ComponentMiddleware] extractComponentDirectiveFromMessage: Extracted directive`, directive);
      return directive;
    } else {
      console.log(`[ComponentMiddleware] extractComponentDirectiveFromMessage: Not a component directive`, {
        isObject: typeof parsed === "object",
        isNotNull: parsed !== null,
        hasComponent: "component" in parsed,
        componentType: typeof parsed.component
      });
    }
  } catch (error) {
    console.log(`[ComponentMiddleware] extractComponentDirectiveFromMessage: JSON parse error`, {
      messageId: message.id,
      error: error,
      rawContent: message.rawContent.substring(0, 200)
    });
  }

  return null;
}
