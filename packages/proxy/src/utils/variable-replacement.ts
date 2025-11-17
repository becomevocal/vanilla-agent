/**
 * Variable replacement utilities for replacing template variables
 * in prompts and messages with actual values from record metadata.
 */

/**
 * Recursively replaces variables in a string or object structure.
 * Supports {{_record.metadata.key}} syntax.
 */
export function replaceVariables(
  value: unknown,
  metadata: Record<string, unknown>
): unknown {
  if (typeof value === "string") {
    return replaceVariablesInString(value, metadata);
  } else if (Array.isArray(value)) {
    return value.map((item) => replaceVariables(item, metadata));
  } else if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = replaceVariables(val, metadata);
    }
    return result;
  }
  return value;
}

/**
 * Replaces variables in a string using {{_record.metadata.key}} syntax.
 * Also supports {{_record.metadata.nested.key}} for nested metadata.
 */
function replaceVariablesInString(
  str: string,
  metadata: Record<string, unknown>
): string {
  // Match {{_record.metadata.key}} or {{_record.metadata.nested.key}} patterns
  const variablePattern = /\{\{_record\.metadata\.([^}]+)\}\}/g;

  return str.replace(variablePattern, (match, path) => {
    const value = getNestedValue(metadata, path);
    if (value === undefined || value === null) {
      // If variable not found, return the original match (don't replace)
      return match;
    }
    // Convert value to string, handling arrays and objects
    if (Array.isArray(value)) {
      return JSON.stringify(value);
    } else if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  });
}

/**
 * Gets a nested value from an object using dot notation (e.g., "shopping_elements" or "nested.key")
 */
function getNestedValue(
  obj: Record<string, unknown>,
  path: string
): unknown {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== "object"
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}
