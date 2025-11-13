import { describe, it, expect, beforeEach } from 'vitest';
import { AgentWidgetClient } from './client';
import { AgentWidgetEvent, AgentWidgetMessage } from './types';
import { createJsonStreamParser } from './utils/formatting';

describe('AgentWidgetClient - JSON Streaming', () => {
  let client: AgentWidgetClient;
  let events: AgentWidgetEvent[] = [];

  beforeEach(() => {
    events = [];
    client = new AgentWidgetClient({
      apiUrl: 'http://localhost:8000',
      streamParser: createJsonStreamParser
    });
  });

  it('should stream text incrementally and not show raw JSON at the end', async () => {
    // Simulate the SSE stream from the user's example
    const sseEvents = [
      'data: {"type":"flow_start","flowId":"flow_01k9pfnztzfag9tfz4t65c9c5q","flowName":"Shopping Assistant","totalSteps":1,"startedAt":"2025-11-12T23:47:39.565Z","executionId":"exec_standalone_1762991259266_7wz736k7n","executionContext":{"source":"standalone","record":{"id":"-1","name":"Streaming Chat Widget","created":false},"flow":{"id":"flow_01k9pfnztzfag9tfz4t65c9c5q","name":"Shopping Assistant","created":false}}}',
      '',
      'data: {"type":"step_start","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","stepType":"prompt","index":1,"totalSteps":1,"startedAt":"2025-11-12T23:47:39.565Z"}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":"{\n"}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":" "}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":" \\""}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":"action"}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":"\\":"}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":" \\""}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":"message"}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":"\\",\\n"}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":" "}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":" \\""}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":"text"}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":"\\":"}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":" \\""}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":"Great"}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":"!"}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":" If"}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":" you"}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":" have"}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":" any"}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":" questions"}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":" or"}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":" need"}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":" help"}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":" finding"}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":" something"}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":","}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":" just"}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":" let"}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":" me"}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":" know"}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":"!\\"\\n"}',
      '',
      'data: {"type":"step_chunk","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":2,"text":"}"}',
      '',
      'data: {"type":"step_complete","id":"step_01k9x5db72fzwvmdenryn0qm48","name":"Prompt 1","executionType":"prompt","index":1,"success":true,"result":{"promptId":"step_01k9x5db72fzwvmdenryn0qm48","promptName":"Prompt 1","processedPrompt":"ok","response":"{\\"\\n  \\"action\\": \\"message\\",\\n  \\"text\\": \\"Great! If you have any questions or need help finding something, just let me know!\\"\\n}","tokens":{"input":1833,"output":34,"total":1867},"cost":0.000700125,"executionTime":2222,"order":2},"executionTime":2222}',
      '',
      'data: {"type":"flow_complete","flowId":"flow_01k9pfnztzfag9tfz4t65c9c5q","success":true,"duration":2968,"completedAt":"2025-11-12T23:47:42.234Z","totalTokensUsed":0}'
    ];

    // Create a ReadableStream from the SSE events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        for (const event of sseEvents) {
          controller.enqueue(encoder.encode(event + '\n'));
        }
        controller.close();
      }
    });

    // Mock fetch to return our stream
    global.fetch = async () => ({
      ok: true,
      body: stream
    }) as any;

    // Dispatch and collect events
    await client.dispatch(
      {
        messages: [{ role: 'user', content: 'ok' }]
      },
      (event) => {
        events.push(event);
        if (event.type === 'message') {
          console.log('Message event:', {
            content: event.message.content,
            streaming: event.message.streaming,
            contentLength: event.message.content.length
          });
        }
      }
    );

    // Filter for assistant message events
    const messageEvents = events.filter(
      (e) => e.type === 'message' && e.message.role === 'assistant'
    ) as Extract<AgentWidgetEvent, { type: 'message' }>[];

    // Validate behavior
    expect(messageEvents.length).toBeGreaterThan(0);

    // 1. Check that text starts streaming incrementally (not all at once)
    const streamingMessages = messageEvents.filter((e) => e.message.streaming);
    expect(streamingMessages.length).toBeGreaterThan(1);
    console.log(`Found ${streamingMessages.length} streaming message events`);

    // 2. Check that text content appears progressively
    let hasPartialText = false;
    const expectedFinalText = "Great! If you have any questions or need help finding something, just let me know!";
    
    for (const msgEvent of streamingMessages) {
      const content = msgEvent.message.content;
      
      // Should not contain raw JSON during streaming
      if (content.includes('"action"') || content.includes('"text"')) {
        console.error('Found raw JSON in streaming content:', content);
      }
      expect(content).not.toMatch(/"action"|"text":/);
      
      // Check for partial text (text that's incomplete)
      if (content.length > 0 && content.length < expectedFinalText.length) {
        hasPartialText = true;
        // Partial text should be a prefix of the final text
        expect(expectedFinalText.startsWith(content)).toBe(true);
      }
    }

    expect(hasPartialText).toBe(true);
    console.log('✓ Text streamed incrementally with partial values');

    // 3. Check final message (streaming: false)
    const finalMessages = messageEvents.filter((e) => !e.message.streaming);
    expect(finalMessages.length).toBeGreaterThan(0);

    const finalMessage = finalMessages[finalMessages.length - 1].message;
    console.log('Final message content:', finalMessage.content);

    // Final content should be ONLY the extracted text, not raw JSON
    expect(finalMessage.content).toBe(expectedFinalText);
    expect(finalMessage.content).not.toContain('"action"');
    expect(finalMessage.content).not.toContain('"text"');
    expect(finalMessage.content).not.toContain('{\n');

    console.log('✓ Final message contains only extracted text, no raw JSON');

    // 4. Verify no raw JSON was ever displayed
    const allContents = messageEvents.map((e) => e.message.content);
    const hasRawJson = allContents.some(
      (content) => content.includes('{\n  "action": "message"')
    );
    
    if (hasRawJson) {
      const rawJsonMessage = allContents.find((content) =>
        content.includes('{\n  "action": "message"')
      );
      console.error('Found raw JSON in message content:', rawJsonMessage);
    }
    
    expect(hasRawJson).toBe(false);
    console.log('✓ No raw JSON was displayed at any point');
  });
});

