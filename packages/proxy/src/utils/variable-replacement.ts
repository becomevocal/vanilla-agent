/**
 * Variable replacement utility for processing messages and prompt templates
 * Replaces placeholders like {{_record.metadata.key}} with actual values
 */

export interface Message {
  role: string;
  content: string;
}

export interface TravrseRecord {
  name?: string;
  type?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Replace variables in text with actual values from record and messages
 * Supports:
 * - {{_record.metadata.key}} - Access record metadata
 * - {{_record.key}} - Access record fields
 * - {{messages}} - All previous messages formatted as "role: content"
 * - {{user_message}} - Last user message content
 */
export function replaceVariables(
  text: string,
  record: TravrseRecord | undefined,
  messages: Message[]
): string {
  if (!text) return text;
  
  let result = text;
  
  // Replace record metadata variables: {{_record.metadata.key}}
  const metadataPattern = /\{\{_record\.metadata\.(\w+)\}\}/g;
  result = result.replace(metadataPattern, (match, key) => {
    const value = record?.metadata?.[key];
    if (value === undefined) return match;
    return typeof value === 'string' ? value : JSON.stringify(value);
  });
  
  // Replace record field variables: {{_record.key}}
  // Skip metadata as it's handled separately above
  const recordPattern = /\{\{_record\.(\w+)\}\}/g;
  result = result.replace(recordPattern, (match, key) => {
    if (key === 'metadata') return match; // Already handled above
    const value = record?.[key];
    if (value === undefined) return match;
    return typeof value === 'string' ? value : JSON.stringify(value);
  });
  
  // Replace messages variable: {{messages}}
  if (result.includes('{{messages}}')) {
    const messagesStr = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n\n');
    result = result.replace(/\{\{messages\}\}/g, messagesStr);
  }
  
  // Replace user_message variable: {{user_message}}
  if (result.includes('{{user_message}}')) {
    const lastUserMessage = messages
      .filter(m => m.role === 'user')
      .slice(-1)[0]?.content || '';
    result = result.replace(/\{\{user_message\}\}/g, lastUserMessage);
  }
  
  return result;
}

/**
 * Process messages array to replace all variable placeholders
 */
export function processMessages(
  messages: Message[],
  record: TravrseRecord | undefined
): Message[] {
  // We need to process each message, but for the messages variable itself,
  // we should use the unprocessed messages to avoid recursive replacement
  return messages.map((message, index) => ({
    ...message,
    content: replaceVariables(
      message.content,
      record,
      // Use messages up to but not including the current one for context
      messages.slice(0, index)
    )
  }));
}

/**
 * Process flow config to replace variables in prompt steps
 */
export function processFlowConfig(
  flowConfig: any,
  record: TravrseRecord | undefined,
  messages: Message[]
): any {
  if (!flowConfig?.steps) return flowConfig;
  
  return {
    ...flowConfig,
    steps: flowConfig.steps.map((step: any) => {
      if (step.type !== 'prompt' || !step.config) return step;
      
      const processedConfig = { ...step.config };
      
      // Process system prompt
      if (typeof processedConfig.systemPrompt === 'string') {
        processedConfig.systemPrompt = replaceVariables(
          processedConfig.systemPrompt,
          record,
          messages
        );
      } else if (typeof processedConfig.system_prompt === 'string') {
        processedConfig.system_prompt = replaceVariables(
          processedConfig.system_prompt,
          record,
          messages
        );
      }
      
      // Process user prompt
      if (typeof processedConfig.userPrompt === 'string') {
        processedConfig.userPrompt = replaceVariables(
          processedConfig.userPrompt,
          record,
          messages
        );
      } else if (typeof processedConfig.user_prompt === 'string') {
        processedConfig.user_prompt = replaceVariables(
          processedConfig.user_prompt,
          record,
          messages
        );
      }
      
      // Note: We don't process previousMessages/previous_messages as that's
      // a special template variable that the backend should handle
      
      return {
        ...step,
        config: processedConfig
      };
    })
  };
}
