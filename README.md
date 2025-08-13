# AI SDK Provider for ChatGPT OAuth (gpt-5)

A [Vercel AI SDK](https://sdk.vercel.ai) v5 provider for accessing GPT-5 models through ChatGPT OAuth authentication. This provider enables you to use ChatGPT Plus, Pro, or Teams subscriptions with the AI SDK.

## Features

- 🚀 **GPT-5 Access** - Use the latest gpt-5 models via ChatGPT OAuth
- 🔐 **OAuth Support** - Automatic token management and refresh
- 🔄 **Full Streaming** - Real-time streaming responses with SSE
- 🛠️ **Codex-Style Tools** - Shell command and task planning tools
- 📦 **AI SDK v5 Compatible** - Works seamlessly with Vercel AI SDK v5
- 🔥 **TypeScript Ready** - Full TypeScript support with type definitions
- 📊 **Usage Tracking** - Accurate token usage and telemetry

> ⚠️ **Important**: This provider has significant differences from standard OpenAI API. See [limitations](./docs/limitations.md) for details.

📚 **Documentation**:

- [Limitations](./docs/limitations.md) - API constraints and workarounds
- [Examples](./examples/README.md) - Working code examples

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

### Option 2: Environment Variables

Set the following environment variables:

```bash
export CHATGPT_OAUTH_ACCESS_TOKEN="your-access-token"
export CHATGPT_OAUTH_ACCOUNT_ID="your-account-id"
export CHATGPT_OAUTH_REFRESH_TOKEN="your-refresh-token" # Optional, for auto-refresh
```

### Option 3: Implement Your Own OAuth Flow

See the [complete OAuth implementation example](./oauth-example/) that demonstrates how to implement the full OAuth flow without Codex CLI, including PKCE, token refresh, and a working CLI.

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

const provider = createChatGPTOAuth({
  autoRefresh: true, // Enable automatic token refresh
});

const result = await generateText({
  model: provider('gpt-5'),
  prompt: 'Explain quantum computing',
  temperature: 0.7,
  maxTokens: 500,
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

Control the depth of reasoning for supported models (similar to Codex CLI's `-c model_reasoning_effort="high"`):

```typescript
import { generateText } from 'ai';
import { createChatGPTOAuth } from 'ai-sdk-provider-chatgpt-oauth';

// Default behavior (matches Codex CLI defaults)
const provider = createChatGPTOAuth();
// For gpt-5/codex models: automatically uses effort='medium', summary='auto'

// Customize global reasoning settings
const customProvider = createChatGPTOAuth({
  reasoningEffort: 'high', // 'low' | 'medium' | 'high' | null (null disables)
  reasoningSummary: 'detailed', // 'auto' | 'none' | 'concise' | 'detailed' | null
});

// Or per-model call
const result = await generateText({
  model: provider('gpt-5', {
    reasoningEffort: 'high',
    reasoningSummary: 'detailed',
  }),
  prompt: 'Prove that the square root of 2 is irrational',
});

// Explicitly disable reasoning (even for gpt-5)
const noReasoning = provider('gpt-5', { reasoningEffort: null });
```

#### Reasoning Compatibility Table

| Model                 | Reasoning Effort                     | Reasoning Summary                                       | Notes                                                      |
| --------------------- | ------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------- |
| **gpt-5**             | ✅ `low`<br>✅ `medium`<br>✅ `high` | ✅ `auto`<br>✅ `detailed`<br>⚠️ `none`<br>⚠️ `concise` | \*API behavior inconsistent - defaults to omitting summary |
| **codex-mini-latest** | ✅ `low`<br>✅ `medium`<br>✅ `high` | ✅ `auto`<br>✅ `detailed`<br>⚠️ `none`<br>⚠️ `concise` | \*API behavior inconsistent - defaults to omitting summary |

**Defaults (matching Codex CLI):**

- When using `gpt-5` or `codex-mini-latest` models, reasoning defaults to `effort: 'medium'` and `summary: 'auto'`
- To disable reasoning, explicitly set `reasoningEffort: null`
- Other models do not receive reasoning parameters

**Notes:**

- Higher effort levels typically increase response time and token usage
- ⚠️ The API shows inconsistent behavior with `none` and `concise` summary values - the provider will warn but still pass them through
- All user-specified values are passed to the API as-is to ensure future compatibility
- When reasoning is enabled, the request automatically includes `reasoning.encrypted_content`
- API errors will clearly indicate if a value is not supported

### Tool Calling

The ChatGPT backend implements a Codex-style tool system with two predefined tools:

#### Supported Tools

1. **`shell`** - Execute command-line tools and scripts
2. **`update_plan`** - Update task planning and progress tracking

#### How It Works

Unlike standard OpenAI models, ChatGPT uses a pattern where all custom functionality is implemented through command-line tools that are orchestrated via the `shell` tool:

```typescript
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { createChatGPTOAuth } from 'ai-sdk-provider-chatgpt-oauth';

const provider = createChatGPTOAuth();

const result = await generateText({
  model: provider('gpt-5'),
  prompt: 'List the files in the current directory',
  tools: {
    // Tool names that map to 'shell': bash, shell, command, execute
    bash: tool({
      description: 'Execute shell commands',
      parameters: z.object({
        command: z.array(z.string()),
        workdir: z.string().optional(),
        timeout: z.number().optional(),
      }),
      execute: async ({ command, workdir, timeout }) => {
        // Implement with proper sandboxing in production
        const { spawnSync } = require('child_process');
        const [cmd, ...args] = command;
        const result = spawnSync(cmd, args, {
          cwd: workdir,
          timeout: (timeout || 30) * 1000,
          encoding: 'utf8',
        });
        return result.stdout || result.stderr;
      },
    }),
  },
  toolChoice: 'auto',
});
```

#### Custom Tool Pattern

To implement custom functionality (like a weather API), create command-line tools:

1. **Create a CLI tool**: `weather-cli` that fetches weather data
2. **Call it via shell**: The AI calls `["weather-cli", "San Francisco"]`
3. **Return results**: The CLI output becomes the tool result

This mirrors how Codex CLI implements sophisticated tools like `apply_patch` for file editing.

#### Limitations

- **No arbitrary function tools**: Can't define custom function tools like `getWeather`
- **Shell-based only**: All custom logic must be executable via command line
- **Two tools only**: Limited to `shell` and `update_plan` functionality

See the `examples/` directory for complete implementation patterns.

### Direct Credentials

```typescript
import { createChatGPTOAuth } from 'ai-sdk-provider-chatgpt-oauth';

const provider = createChatGPTOAuth({
  credentials: {
    accessToken: 'your-access-token',
    accountId: 'your-account-id',
    refreshToken: 'your-refresh-token', // Optional
  },
});
```

### Custom Authentication Provider

```typescript
import { createChatGPTOAuth, AuthProvider } from 'ai-sdk-provider-chatgpt-oauth';

class CustomAuthProvider implements AuthProvider {
  async getCredentials() {
    // Your custom logic to get credentials
    return {
      accessToken: 'token',
      accountId: 'account-id',
    };
  }
}

const provider = createChatGPTOAuth({
  authProvider: new CustomAuthProvider(),
});
```

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

## Understanding ChatGPT's Tool System

The ChatGPT backend follows the Codex CLI architecture:

### Architecture

- **Predefined Tools Only**: Unlike standard OpenAI models, ChatGPT only supports two specific tools
- **Shell-Based Execution**: All custom functionality runs through shell commands
- **Codex Instructions**: The model uses specific Codex CLI instructions for optimal performance

### Tool Mapping

The provider automatically maps your tool names to ChatGPT's predefined tools:

| Your Tool Name                             | Maps To       | Purpose           |
| ------------------------------------------ | ------------- | ----------------- |
| `bash`, `shell`, `command`, `execute`      | `shell`       | Command execution |
| `TodoWrite`, `update_plan`, `plan`, `todo` | `update_plan` | Task planning     |
| Other names                                | Not supported | Warning generated |

### Codex Pattern Examples

In the Codex CLI ecosystem:

- **`apply_patch`**: A CLI tool for file editing, called via `shell`
- **`grep`/`find`**: System tools for searching, called via `shell`
- **Custom CLIs**: Your own tools, executed through `shell`

## Authentication Details

### Token Refresh

The provider automatically refreshes expired tokens when:

1. A refresh token is available
2. `autoRefresh` is enabled (default: true)
3. The access token is within 60 seconds of expiring

### Credential Sources

The provider checks for credentials in this order:

1. Directly provided credentials
2. Environment variables
3. Credentials file (default: `~/.codex/auth.json`)

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

## Acknowledgments

- [Vercel AI SDK](https://sdk.vercel.ai) for the excellent SDK framework
- [OpenAI](https://openai.com) for ChatGPT and Codex CLI
- Community contributors

## Support

For issues and questions, please use the [GitHub Issues](https://github.com/ben-vargas/ai-sdk-provider-chatgpt-oauth/issues) page.
