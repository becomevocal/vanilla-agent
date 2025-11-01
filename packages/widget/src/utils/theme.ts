import { ChatWidgetConfig } from "../types";

export const applyThemeVariables = (
  element: HTMLElement,
  config?: ChatWidgetConfig
) => {
  const theme = config?.theme ?? {};
  Object.entries(theme).forEach(([key, value]) => {
    // Skip undefined or empty values
    if (value === undefined || value === null || value === "") {
      return;
    }
    // Convert camelCase to kebab-case (e.g., radiusSm → radius-sm)
    const kebabKey = key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
    element.style.setProperty(`--cw-${kebabKey}`, String(value));
  });
};

