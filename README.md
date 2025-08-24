# AI SDK Provider for ChatGPT OAuth (gpt-5)

A [Vercel AI SDK](https://sdk.vercel.ai) v4 provider for accessing GPT-5 models through ChatGPT OAuth authentication. This provider enables you to use ChatGPT Plus, Pro, or Teams subscriptions with the AI SDK.

## Features

- 🚀 **GPT-5 Access** - Use the latest gpt-5 models via ChatGPT OAuth
- 🔐 **OAuth Support** - Automatic token management and refresh
- 🔄 **Full Streaming** - Real-time streaming responses with SSE
- 🛠️ **Codex-Style Tools** - Shell command and task planning tools
- 📦 **AI SDK v4 Compatible** - Works seamlessly with Vercel AI SDK v4
- 🔥 **TypeScript Ready** - Full TypeScript support with type definitions
- 📊 **Usage Tracking** - Accurate token usage and telemetry
- 📝 **JSON Generation** - Generate structured JSON through prompt engineering (see [examples](./examples/))

> ⚠️ **Important**: This provider has significant differences from standard OpenAI API. See [limitations](./docs/limitations.md) for details.

📚 **Documentation**:

- [Examples](./examples/README.md) - Working code examples
- [Limitations](./docs/limitations.md) - API constraints and workarounds
- [Authentication](./docs/authentication.md) - All authentication options
- [Tool Calling](./docs/tool-calling.md) - How to use tools
- [Reasoning](./docs/reasoning.md) - Control reasoning depth
- [JSON Formatting](./docs/json-formatting.md) - Generate structured output
- [Tool System](./docs/tool-system.md) - Understanding the architecture

## Installation

```bash
npm install ai-sdk-provider-chatgpt-oauth
# or
yarn add ai-sdk-provider-chatgpt-oauth
# or
pnpm add ai-sdk-provider-chatgpt-oauth
```

## Prerequisites

### Option 1: Use Codex CLI (Recommended for Quick Start)

Install and authenticate with OpenAI's Codex CLI:

```bash
npm install -g @openai/codex
codex login
```

This will create OAuth credentials at `~/.codex/auth.json` that the provider can use automatically.

### Option 2: Implement Your Own OAuth Flow

See the [complete OAuth implementation example](./oauth-example/) that demonstrates how to implement the full OAuth flow without Codex CLI, including PKCE, token refresh, and a working CLI.

### Option 3: Environment Variables

Set the following environment variables:

```bash
export CHATGPT_OAUTH_ACCESS_TOKEN="your-access-token"
export CHATGPT_OAUTH_ACCOUNT_ID="your-account-id"
export CHATGPT_OAUTH_REFRESH_TOKEN="your-refresh-token" # Optional, for auto-refresh
```

### Option 4: Direct Credentials

Pass credentials directly to the provider (see usage examples below).

## Quick Start

```typescript
import { generateText } from 'ai';
import { createChatGPTOAuth } from 'ai-sdk-provider-chatgpt-oauth';

const provider = createChatGPTOAuth();

const result = await generateText({
  model: provider('gpt-5'),
  prompt: 'Write a haiku about TypeScript',
});

console.log(result.text);
```

## Usage Examples

### Basic Text Generation

```typescript
import { generateText } from 'ai';
import { createChatGPTOAuth } from 'ai-sdk-provider-chatgpt-oauth';

const provider = createChatGPTOAuth({ autoRefresh: true });

const result = await generateText({
  model: provider('gpt-5'),
  prompt: 'Explain quantum computing in simple terms',
});
```

### Streaming Responses

```typescript
import { streamText } from 'ai';
import { createChatGPTOAuth } from 'ai-sdk-provider-chatgpt-oauth';

const provider = createChatGPTOAuth();

const result = await streamText({
  model: provider('gpt-5'),
  prompt: 'Write a story about a robot',
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

### Reasoning Effort Control

Control the depth of reasoning for gpt-5 models:

```typescript
const provider = createChatGPTOAuth({
  reasoningEffort: 'high', // 'low' | 'medium' | 'high'
});

// Or per-model call
const result = await generateText({
  model: provider('gpt-5', { reasoningEffort: 'high' }),
  prompt: 'Solve this complex problem...',
});
```

See [Reasoning Documentation](./docs/reasoning.md) for detailed configuration and compatibility.

### Tool Calling

ChatGPT OAuth supports only two predefined tools:

1. **`shell`** - Execute command-line tools (maps from: `bash`, `shell`, `command`, `execute`)
2. **`update_plan`** - Task planning (maps from: `TodoWrite`, `update_plan`, `plan`, `todo`)

```typescript
import { generateText, tool } from 'ai';
import { z } from 'zod';

const result = await generateText({
  model: provider('gpt-5'),
  prompt: 'List files in current directory',
  tools: {
    bash: tool({
      description: 'Execute shell commands',
      parameters: z.object({ command: z.array(z.string()) }),
      execute: async ({ command }) => {
        // Execute command (implement with proper sandboxing)
        return executeCommand(command);
      },
    }),
  },
});
```

**Note**: Custom functionality must be implemented as CLI tools. See [Tool Calling Guide](./docs/tool-calling.md) for details.

### Parameters Not Supported
- `temperature`, `topP`, `maxTokens` are ignored by the ChatGPT OAuth backend. See [limitations](./docs/limitations.md).

## Configuration Options

### `createChatGPTOAuth(options?)`

| Option            | Type                      | Description                                                            |
| ----------------- | ------------------------- | ---------------------------------------------------------------------- |
| `baseURL`         | `string`                  | Override the API base URL (default: `https://chatgpt.com/backend-api`) |
| `headers`         | `Record<string, string>`  | Additional headers to send with requests                               |
| `fetch`           | `FetchFunction`           | Custom fetch implementation                                            |
| `credentials`     | `ChatGPTOAuthCredentials` | Direct credentials object                                              |
| `credentialsPath` | `string`                  | Path to credentials file (default: `~/.codex/auth.json`)               |
| `authProvider`    | `AuthProvider`            | Custom authentication provider                                         |
| `autoRefresh`     | `boolean`                 | Enable automatic token refresh (default: `true`)                       |

## Supported Models

### Actually Working Models (Tested)

- `gpt-5` - Latest GPT-5 model with reasoning support (200k context, 100k output)
- `codex-mini-latest` - Experimental model with local shell understanding (200k context, 100k output)

### Model Limitations

The ChatGPT OAuth API at `https://chatgpt.com/backend-api/codex/responses` only supports these two models. While Codex CLI internally supports additional models (o3, o4-mini, gpt-4.1, gpt-4o, etc.), they return "Unsupported model" errors when accessed through the OAuth API.

Any other model ID string will be passed through to the API, allowing for future model support without code changes.

### JSON Generation

**Note**: `generateObject()` and `streamObject()` are not supported. Use prompt engineering:

```typescript
const result = await generateText({
  model: provider('gpt-5'),
  prompt: 'Generate user profile.\nOUTPUT ONLY JSON: {"name": "string", "age": number}',
});

const data = JSON.parse(result.text);
```

See [JSON examples](./examples/) and [JSON documentation](./docs/json-formatting.md) for patterns.

## Error Handling

```typescript
import { ChatGPTOAuthError } from 'ai-sdk-provider-chatgpt-oauth';

try {
  const result = await generateText({
    model: provider('gpt-5'),
    prompt: 'Hello',
  });
} catch (error) {
  if (error instanceof ChatGPTOAuthError) {
    console.error('ChatGPT OAuth error:', error.message);
    console.error('Status code:', error.statusCode);
  }
}
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Examples

```bash
# Check authentication
npm run example:auth

# Basic usage
npm run example:basic

# Streaming
npm run example:streaming

# Tool calling
npm run example:tools
```

## Troubleshooting

### No credentials found

Ensure you have either:

- Authenticated with Codex CLI: `codex login`
- Set environment variables
- Passed credentials directly

### Token expired

Enable `autoRefresh` or provide a refresh token:

```typescript
const provider = createChatGPTOAuth({
  autoRefresh: true,
});
```

### Rate limiting

The provider includes automatic retry logic for rate limits. You can also implement custom retry logic in your application.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please use the [GitHub Issues](https://github.com/ben-vargas/ai-sdk-provider-chatgpt-oauth/issues) page.
