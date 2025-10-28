import { marked } from "marked";

marked.setOptions({ breaks: true });

/**
 * Basic markdown renderer. Remember to sanitize the returned HTML if you render
 * untrusted content in your host page.
 */
export const markdownPostprocessor = (text: string): string => {
  return marked.parse(text) as string;
};

/**
 * Escapes HTML entities. Used as the default safe renderer.
 */
export const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const escapeAttribute = (value: string) =>
  value.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const makeToken = (idx: number) => `%%FORM_PLACEHOLDER_${idx}%%`;

const directiveReplacer = (source: string, placeholders: Array<{ token: string; type: string }>) => {
  let working = source;

  // JSON directive pattern e.g. <Directive>{"component":"form","type":"init"}</Directive>
  working = working.replace(/<Directive>([\s\S]*?)<\/Directive>/gi, (match, jsonText) => {
    try {
      const parsed = JSON.parse(jsonText.trim());
      if (parsed && typeof parsed === "object" && parsed.component === "form" && parsed.type) {
        const token = makeToken(placeholders.length);
        placeholders.push({ token, type: String(parsed.type) });
        return token;
      }
    } catch (error) {
      return match;
    }
    return match;
  });

  // XML-style directive e.g. <Form type="init" />
  working = working.replace(/<Form\s+type="([^"]+)"\s*\/>/gi, (_, type) => {
    const token = makeToken(placeholders.length);
    placeholders.push({ token, type });
    return token;
  });

  return working;
};

/**
 * Converts special directives (either `<Form type="init" />` or
 * `<Directive>{"component":"form","type":"init"}</Directive>`) into placeholder
 * elements that the widget upgrades after render. Remaining text is rendered as
 * Markdown.
 */
export const directivePostprocessor = (text: string): string => {
  const placeholders: Array<{ token: string; type: string }> = [];
  const withTokens = directiveReplacer(text, placeholders);
  let html = markdownPostprocessor(withTokens);

  placeholders.forEach(({ token, type }) => {
    const tokenRegex = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    const safeType = escapeAttribute(type);
    const replacement = `<div class="tvw-form-directive" data-tv-form="${safeType}"></div>`;
    html = html.replace(tokenRegex, replacement);
  });

  return html;
};
