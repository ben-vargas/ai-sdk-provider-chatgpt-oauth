# ChatGPT OAuth Provider Examples

This directory contains examples demonstrating the ChatGPT OAuth provider for the Vercel AI SDK v5.

## Working Examples

### ✅ Authentication & Setup
- `check-auth.ts` - Verify OAuth credentials and authentication status
- `model-support.ts` - Demonstrates working models (gpt-5, codex-mini-latest) and errors for unsupported models

### ✅ Text Generation
- `basic-usage.ts` - Simple text generation with proper telemetry
- `streaming.ts` - Real-time streaming responses with SSE
- `reasoning-effort.ts` - Control reasoning depth with effort levels (low/medium/high)

### ✅ Tool Calling (Codex-Style)
- `tool-calling-basic.ts` - Simple tool calling example with clear output
- `tool-calling-stateless.ts` - Demonstrates stateless backend (full history required)
- `tool-calling-limitations.ts` - Shows which tools are supported vs unsupported

## Limitations

### ❌ Structured Output / Object Generation
The `generate-object.ts`, `stream-object.ts`, and `structured-output.ts` examples **do not work** with the ChatGPT OAuth backend because:

1. **Codex Instructions**: The ChatGPT backend is configured with Codex CLI instructions that make it behave as a coding assistant, not a general-purpose JSON generator
2. **No JSON Mode**: Unlike standard OpenAI models, the ChatGPT backend doesn't support response_format or JSON mode
3. **Tool-Focused**: The backend is designed for tool use (shell commands, planning) rather than structured data generation

### Backend Architecture

The ChatGPT OAuth backend (`https://chatgpt.com/backend-api/codex/responses`) follows the Codex CLI pattern:

#### Key Characteristics
- **Models**: Supports `gpt-5` and `gpt-5-turbo-preview`
- **Tools**: Only `shell` and `update_plan` (predefined Codex tools)
- **Instructions**: Uses Codex CLI instructions for optimal performance
- **Streaming**: Always uses Server-Sent Events (SSE)
- **Telemetry**: Provides accurate token usage tracking
- **STATELESS**: Backend doesn't maintain conversation state between requests

#### Tool System
- **Codex Pattern**: All tools are CLI commands executed via `shell`
- **No Custom Functions**: Can't define arbitrary function tools
- **Tool Mapping**: Provider maps user tool names to Codex tools

#### Parameters Not Supported
- `temperature` - Model uses default settings
- `topP` - Sampling parameters fixed
- `maxTokens` - Output length managed by model
- `responseFormat` - No JSON mode available

## Running Examples

First, ensure you're authenticated with ChatGPT OAuth:
```bash
# The provider reads credentials from ~/.codex/auth.json
# Make sure you have valid ChatGPT OAuth tokens
```

Then run any example:

**Working Examples:**
```bash
# Authentication & Models
npx tsx examples/check-auth.ts       # Check authentication
npx tsx examples/model-support.ts    # Test model support

# Text Generation
npx tsx examples/basic-usage.ts      # Basic text generation
npx tsx examples/streaming.ts        # Streaming responses
npx tsx examples/reasoning-effort.ts # Reasoning with different effort levels

# Tool Calling
npx tsx examples/tool-calling-basic.ts       # Simple tool calling
npx tsx examples/tool-calling-stateless.ts   # Stateless backend demo
npx tsx examples/tool-calling-limitations.ts # Tool support info
```

**Examples That Show Limitations:**
```bash
# These demonstrate what doesn't work
npx tsx examples/generate-object.ts    # No JSON mode
npx tsx examples/stream-object.ts      # No streaming objects
npx tsx examples/structured-output.ts  # No structured output
```

Or use npm scripts:
```bash
npm run example:auth          # Check authentication
npm run example:models        # Test model support
npm run example:basic         # Basic text generation
npm run example:streaming     # Streaming
npm run example:reasoning     # Reasoning effort levels
npm run example:tools         # Tool calling basic example
npm run example:object        # Object generation (fails)
npm run example:structured    # Structured output (fails)
```

## Important Concepts

### Stateless Backend
The ChatGPT OAuth backend is **stateless** - it doesn't remember previous messages. You must send the full conversation history with each request:

```typescript
const messages: CoreMessage[] = [];

// First message
messages.push({ role: 'user', content: 'Question 1' });
const response1 = await generateText({ model, messages });
messages.push({ role: 'assistant', content: response1.text });

// Second message - must include ALL history
messages.push({ role: 'user', content: 'Question 2' });
const response2 = await generateText({ model, messages });
```

### Tool Limitations
Only two tools are supported:
- **`bash`** - Maps to the `shell` tool internally
- **`TodoWrite`** - Maps to the `update_plan` tool internally

All other tools will generate warnings and be ignored.

### Tool Response Pattern
The model describes what it will do but doesn't automatically interpret tool results. This is the Codex CLI pattern - tools execute and show output directly rather than being interpreted by the model.

## Best Use Cases

✅ **Ideal For:**
- Coding assistants with gpt-5 access
- CLI automation and scripting
- Task planning and execution
- Integration with existing CLI tools
- Codex CLI ecosystem applications

❌ **Not Suitable For:**
- Structured data generation (no JSON mode)
- Custom function tools (weather APIs, databases)
- Applications needing temperature control
- General-purpose chatbots

For these use cases, consider standard OpenAI API or other providers.