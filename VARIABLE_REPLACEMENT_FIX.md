# Variable Replacement Issue in Messages

## Problem Description

When sending messages to the `/v1/dispatch` endpoint with variable placeholders like `{{_record.metadata.shopping_elements}}`, these variables are **not being replaced** with actual values from the record metadata before being sent to the LLM (OpenAI executor).

### Current Behavior (Bug)

```
System message content:
"...
## Array of page elements with className, innerText, and tagName
{{_record.metadata.shopping_elements}}"
```

The placeholder `{{_record.metadata.shopping_elements}}` remains as-is in the message sent to OpenAI, instead of being replaced with the actual array data.

### Expected Behavior

The variable should be replaced with the actual metadata value:

```
System message content:
"...
## Array of page elements with className, innerText, and tagName
[
  {\"className\": \"AddToCartButton-black-shirt\", \"innerText\": \"Add to Cart\", \"tagName\": \"BUTTON\"},
  {\"className\": \"ProductTitle\", \"innerText\": \"Black Shirt - Medium\", \"tagName\": \"H1\"}
]"
```

## Root Cause

The Travrse API backend has variable replacement logic that works for **prompt configuration fields** (like `systemPrompt`, `userPrompt`, `previousMessages` in the flow config), but it's **not applied to the messages array** that's sent directly in the request payload.

When using `flow_mode: "virtual"` and `record_mode: "virtual"`, the messages are sent like this:

```json
{
  "record": {
    "name": "Streaming Chat Widget",
    "type": "standalone",
    "metadata": {
      "shopping_elements": "[{...}]"
    }
  },
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant...\\n\\n{{_record.metadata.shopping_elements}}"
    },
    {
      "role": "user",
      "content": "I need a black shirt"
    }
  ],
  "options": {
    "stream_response": true,
    "record_mode": "virtual",
    "flow_mode": "virtual"
  }
}
```

## Solution

The backend API needs to process the `messages` array and replace variable placeholders **before** sending messages to the LLM executor.

### Required Changes in Backend API

#### Location
The fix should be in the backend API code that handles the `/v1/dispatch` endpoint, specifically in the executor preparation logic (before calling OpenAI).

#### Implementation

1. **Add a variable replacement function** (if not already present):

```typescript
function replaceVariables(
  text: string,
  record: Record<string, any>,
  messages: Array<{role: string, content: string}>
): string {
  let result = text;
  
  // Replace record metadata variables: {{_record.metadata.key}}
  const metadataPattern = /\{\{_record\.metadata\.(\w+)\}\}/g;
  result = result.replace(metadataPattern, (match, key) => {
    const value = record?.metadata?.[key];
    if (value === undefined) return match;
    return typeof value === 'string' ? value : JSON.stringify(value);
  });
  
  // Replace record field variables: {{_record.key}}
  const recordPattern = /\{\{_record\.(\w+)\}\}/g;
  result = result.replace(recordPattern, (match, key) => {
    const value = record?.[key];
    if (value === undefined || key === 'metadata') return match;
    return typeof value === 'string' ? value : JSON.stringify(value);
  });
  
  // Replace messages variable: {{messages}}
  if (result.includes('{{messages}}')) {
    const messagesStr = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\\n\\n');
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
```

2. **Apply variable replacement to messages array**:

```typescript
// In the dispatch endpoint handler, after receiving the payload
// and before sending to the OpenAI executor:

function processMessages(
  messages: Array<{role: string, content: string}>,
  record: Record<string, any>
): Array<{role: string, content: string}> {
  return messages.map(message => ({
    ...message,
    content: replaceVariables(message.content, record, messages)
  }));
}

// Usage in the dispatch handler:
const processedMessages = processMessages(requestPayload.messages, requestPayload.record);

// Then send processedMessages to the LLM executor
```

3. **Ensure this runs for both virtual and existing flows**:

```typescript
// The variable replacement should happen:
// - For virtual flows: after constructing the flow config from the request
// - For existing flows: after loading the flow from the database
// - Always before sending to the LLM executor

if (options.record_mode === 'virtual' || options.flow_mode === 'virtual') {
  // Apply variable replacement to incoming messages
  requestPayload.messages = processMessages(
    requestPayload.messages,
    requestPayload.record
  );
}

// Also ensure flow config prompts are processed if using virtual flow
if (options.flow_mode === 'virtual' && flow.steps) {
  flow.steps.forEach(step => {
    if (step.type === 'prompt' && step.config) {
      if (step.config.systemPrompt) {
        step.config.systemPrompt = replaceVariables(
          step.config.systemPrompt,
          requestPayload.record,
          requestPayload.messages
        );
      }
      if (step.config.userPrompt) {
        step.config.userPrompt = replaceVariables(
          step.config.userPrompt,
          requestPayload.record,
          requestPayload.messages
        );
      }
      // Note: previousMessages usually references {{messages}}, 
      // which should be replaced with the actual message history
    }
  });
}
```

## Testing

After implementing the fix, verify with this test payload:

```bash
curl -X POST https://api.travrse.ai/v1/dispatch \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "record": {
      "name": "Test Shopping Assistant",
      "type": "standalone",
      "metadata": {
        "shopping_elements": "[{\"className\":\"AddToCart\",\"innerText\":\"Add to Cart\"}]"
      }
    },
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful shopping assistant.\\n\\n# DOM Elements:\\n{{_record.metadata.shopping_elements}}"
      },
      {
        "role": "user",
        "content": "Show me the page elements"
      }
    ],
    "options": {
      "stream_response": true,
      "record_mode": "virtual",
      "flow_mode": "virtual"
    },
    "flow": {
      "name": "Test Flow",
      "steps": [
        {
          "id": "test_prompt",
          "type": "prompt",
          "enabled": true,
          "config": {
            "model": "gpt-4o",
            "previousMessages": "{{messages}}"
          }
        }
      ]
    }
  }'
```

Check the logs for:
- ✅ The system message should show the actual JSON array, not `{{_record.metadata.shopping_elements}}`
- ✅ The OpenAI executor should receive the processed messages with variables replaced

## Files to Modify

The exact files depend on your backend architecture, but look for:

1. **Dispatch endpoint handler**: `/api/v1/dispatch` route handler
2. **Executor preparation**: Code that formats messages before sending to OpenAI
3. **Variable replacement utility**: May already exist for prompt configs
4. **Flow processor**: Code that handles virtual flows and existing flows

## Related Code in This Workspace

This workspace contains the **proxy package** that forwards requests to the Travrse API. The proxy correctly sends:
- `messages` array with variable placeholders
- `record.metadata` with the actual values

The issue is in the **Travrse API backend** (not in this repository), which needs to replace variables in messages before calling the OpenAI executor.

Example from proxy (`packages/proxy/src/index.ts`):

```typescript
const travrsePayload: Record<string, unknown> = {
  record: {
    name: "Streaming Chat Widget",
    type: "standalone",
    metadata: clientPayload.metadata || {} // ✅ Metadata is sent correctly
  },
  messages: formattedMessages, // ❌ Messages contain unreplaced variables
  options: {
    stream_response: true,
    record_mode: "virtual",
    flow_mode: flowId ? "existing" : "virtual",
    auto_append_metadata: false
  }
};
```

## Additional Notes

- The `auto_append_metadata: false` option indicates that metadata should NOT be automatically appended to messages (which would duplicate the data)
- Instead, the user is manually including metadata via variable placeholders in the message content
- This approach gives more control over formatting, but requires the backend to replace the variables
