### Standalone Execution
Send a **POST** request to `https://api.travrse.ai/v1/dispatch`.

#### Headers
- `Content-Type`: `application/json`
- `Authorization`: `Bearer YOUR_API_KEY`


Travrse API Keys always begin with either tv_test_ or tv_live_
#### Body
```json
{
  "record": {
    "name": "Standalone Execution",
    "type": "standalone",
    "metadata": {
      "message": "Sample message"
    }
  },
  "flow": {
    "name": "Simple Chat User / System Prompt",
    "description": "Flow with 1 step",
    "steps": [
      {
        "id": "step_01k5r9pj9kf26src3enda8ht0a",
        "name": "Prompt 1",
        "type": "prompt",
        "enabled": true,
        "config": {
          "text": "{{_record.metadata.message}}",
          "model": "meta/llama3.1-8b-instruct-free",
          "responseFormat": "markdown",
          "outputVariable": "prompt_result",
          "tools": {
            "toolIds": []
          },
          "userPrompt": "{{_record.metadata.message}}",
          "outputFormat": "json",
          "systemPrompt": "you are a helpful assistant, chatting with a user. \n\nthe previous messages between you and the user are:\n{{_record.metadata.previous_messages}}"
        }
      }
    ]
  },
  "options": {
    "stream_response": true,
    "record_mode": "virtual",
    "flow_mode": "virtual"
  }
}
```

#### Tools Support (AI Function Calling)
Prompt steps support AI function calling via the `tools` configuration. Any tools configured in your flow editor will automatically appear in the generated examples above.

**Example tools configuration in a prompt step:**
```json
{
  "type": "prompt",
  "config": {
    "text": "Your prompt here...",
    "model": "gpt-4o",
    "tools": {
      "toolIds": ["tool_abc_123", "tool_xyz_456"],
      "maxToolCalls": 10,
      "toolCallStrategy": "auto",
      "parallelCalls": true,
      "perToolLimits": {
        "tool_abc_123": {
          "maxCalls": 5,
          "required": false
        }
      }
    }
  }
}
```

**Tool Call Strategies:**
- `auto` - Model decides when to use tools (default)
- `required` - Model must use at least one tool
- `none` - Disable tool calling for this step

**Creating Tools:**
Tools can be created in the dashboard under Tools section. Three types are supported:
- `flow` - Execute another flow as a tool
- `custom` - JavaScript code executed in a sandbox
- `external` - HTTP API calls to external services

The API streams responses using Server-Sent Events (SSE). Read events from the stream, collect the content, and process the final `flow_complete` event to obtain results.

#### Streaming Response (SSE)
```text
event: flow_start
data: {"executionId":"exec_20240816_xyz789","flowId":123,"recordId":456}

event: step_start
data: {"stepId":"step-1","stepName":"Analysis Prompt","stepType":"prompt"}

event: step_chunk
data: {"content":"Based on the analysis of Acme Corporation...","isComplete":false}

event: step_chunk
data: {"content":" the company shows strong growth potential","isComplete":false}

event: step_complete
data: {"stepId":"step-1","result":"Based on the analysis of Acme Corporation, the company shows strong growth potential in Q4 2024.","status":"completed","executionTime":"2.3s"}

event: flow_complete
data: {"executionId":"exec_20240816_xyz789","status":"completed","totalSteps":2,"executionTime":"4.7s","tokensUsed":156}
```

**Tool Call Events (when tools are used):**
```text
event: step_chunk
data: {"type":"tool_call","toolCall":{"toolId":"tool_abc_123","toolName":"search_database","args":{"query":"customer data"}}}

event: step_chunk
data: {"type":"tool_result","toolResult":{"toolId":"tool_abc_123","toolName":"search_database","result":{"count":42,"data":[...]}}}
```

#### Security & Authentication
- Store your Travrse API key in a server-side environment variable (e.g., `TRAVRSE_API_KEY` in `.env` or deployment secrets). Do not expose it in the client (avoid `NEXT_PUBLIC_` prefixes).
- Proxy requests through your backend so the browser never sees the key. Example (Next.js App Router):
```ts
// app/api/travrse/dispatch/route.ts
export async function POST(req: Request) {
  const apiKey = process.env.TRAVRSE_API_KEY!
  const body = await req.json()

  const res = await fetch('https://api.travrse.ai/v1/dispatch', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  return new Response(res.body, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}

// Client calls /api/travrse/dispatch instead of the Travrse URL
```


ALWAYS run the client side code so the client app loads in the preview first


