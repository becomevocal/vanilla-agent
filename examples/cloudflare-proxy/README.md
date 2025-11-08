# Vanilla Agent Proxy - Cloudflare Workers

A production-ready chat proxy service deployed on Cloudflare Workers, powered by the `vanilla-agent-proxy` package and Travrse AI.

## Features

- **Multiple Proxy Endpoints**: Three different configurations demonstrating various use cases
- **Custom API Endpoints**: Example form handler and health check
- **Shared Package Imports**: Uses `vanilla-agent-proxy` from the monorepo
- **Edge Deployment**: Runs on Cloudflare's global network for low latency
- **Type Safety**: Full TypeScript support with Cloudflare Workers types

## Available Endpoints

### Proxy Endpoints

1. **`/api/chat/dispatch`** - Basic conversational assistant
   - Simple proxy with default settings
   - Great for getting started

2. **`/api/chat/dispatch-directive`** - Directive-enabled flow
   - Uses a reference to an existing Travrse flow (via `TRAVRSE_FLOW_ID`)
   - Demonstrates flow ID configuration

3. **`/api/chat/dispatch-action`** - Custom flow with actions
   - Inline flow configuration with action middleware
   - Includes example actions: `get_time`, `calculate`

### Custom Endpoints

- **`POST /api/form`** - Form submission handler
- **`GET /health`** - Health check and status
- **`GET /`** - API documentation and available endpoints

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ and pnpm installed
- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed globally or use via pnpm
- Travrse API key ([get one here](https://travrse.ai))

## Setup

### 1. Install Dependencies

From the root of the monorepo:

```bash
pnpm install
```

### 2. Configure Environment Variables

Create a `.dev.vars` file for local development:

```bash
cd examples/cloudflare-proxy
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` and add your Travrse API key:

```env
TRAVRSE_API_KEY=tv_test_your_api_key_here
TRAVRSE_FLOW_ID=flow_your_flow_id_here  # Optional
```

### 3. Authenticate with Cloudflare

```bash
npx wrangler login
```

This will open a browser window to authenticate with your Cloudflare account.

## Local Development

Start the development server:

```bash
pnpm dev
```

Or from the monorepo root:

```bash
pnpm dev:cloudflare-proxy
```

The proxy will be available at `http://localhost:8787`.

### Test the Endpoints

```bash
# Health check
curl http://localhost:8787/health

# Test basic proxy (requires a chat client or POST request)
curl -X POST http://localhost:8787/api/chat/dispatch \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello!"}]}'

# Test form submission
curl -X POST http://localhost:8787/api/form \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com"}'
```

## Deployment

### 1. Set Production Secrets

Before deploying, set your API key as a secret:

```bash
npx wrangler secret put TRAVRSE_API_KEY
```

Optionally, set your flow ID:

```bash
npx wrangler secret put TRAVRSE_FLOW_ID
```

You'll be prompted to enter the value. This keeps sensitive data out of your code.

### 2. Deploy to Cloudflare Workers

```bash
pnpm deploy
```

Or:

```bash
npx wrangler deploy
```

After deployment, you'll see output like:

```
Published vanilla-agent-proxy (1.2.3)
  https://vanilla-agent-proxy.your-subdomain.workers.dev
```

### 3. Configure CORS (Production)

Update `src/index.ts` to restrict allowed origins:

```typescript
allowedOrigins: ["https://yourdomain.com"]
```

Then redeploy.

## Configuration

### Customize Worker Name

Edit `wrangler.toml`:

```toml
name = "your-custom-name"
```

### Update Allowed Origins

In `src/index.ts`, change:

```typescript
allowedOrigins: ["*"]  // Development
```

To:

```typescript
allowedOrigins: ["https://yourdomain.com"]  // Production
```

### Add Custom Domains

In `wrangler.toml`:

```toml
routes = [
  { pattern = "api.yourdomain.com/*", custom_domain = true }
]
```

See [Cloudflare Workers Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/) for details.

## Usage with Frontend

### Vanilla JavaScript

```javascript
const response = await fetch('https://your-worker.workers.dev/api/chat/dispatch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello!' }]
  })
});

const data = await response.json();
console.log(data);
```

### With vanilla-agent Widget

```javascript
import { VanillaAgent } from 'vanilla-agent';

const agent = new VanillaAgent({
  dispatchUrl: 'https://your-worker.workers.dev/api/chat/dispatch'
});

agent.mount('#chat-container');
```

## Architecture

This example demonstrates:

- **Shared Package Usage**: Imports `createChatProxyApp` from the workspace `vanilla-agent-proxy` package
- **Multiple Configurations**: Shows different ways to configure the proxy (basic, flow ID reference, inline flow config)
- **Custom Endpoints**: Extends the proxy with additional API endpoints
- **Type Safety**: Full TypeScript support with Cloudflare Workers types
- **Independent Deployment**: Can be deployed without affecting other parts of the monorepo

## Monitoring

View logs in real-time:

```bash
npx wrangler tail
```

Or view in the [Cloudflare Dashboard](https://dash.cloudflare.com/) under Workers & Pages > your-worker > Logs.

## Troubleshooting

### Error: "Missing TRAVRSE_API_KEY"

Make sure you've set the secret:

```bash
npx wrangler secret put TRAVRSE_API_KEY
```

### CORS Errors

Update `allowedOrigins` in `src/index.ts` to include your frontend domain.

### TypeScript Errors

Run type checking:

```bash
pnpm types-check
```

## Learn More

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [Travrse AI Docs](https://docs.travrse.ai)
- [Hono Framework](https://hono.dev/)

## License

This example is part of the vanilla-agent monorepo. See the root LICENSE file for details.
