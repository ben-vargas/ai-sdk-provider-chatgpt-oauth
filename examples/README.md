# ChatGPT OAuth Provider Examples

This directory contains examples demonstrating the ChatGPT OAuth provider for the Vercel AI SDK v4.

## Working Examples

### ✅ Authentication & Setup
- `check-auth.ts` - Verify OAuth credentials and authentication status
- `model-support.ts` - Demonstrates working models (gpt-5, gpt-5-codex, codex-mini-latest) and errors for unsupported models

### ✅ Text Generation
- `basic-usage.ts` - Simple text generation with proper telemetry
- `streaming.ts` - Real-time streaming responses with SSE
- `reasoning-effort.ts` - Control reasoning depth with effort levels (low/medium/high)

### ✅ GPT-5 Codex Focus
- `basic-usage-gpt-5-codex.ts` - Minimal call against the Codex-tuned model
- `streaming-gpt-5-codex.ts` - Stream Codex responses for long-form output
- `system-message-gpt-5-codex.ts` - Demonstrates system prompts and warnings
- `generate-json-basic-gpt-5-codex.ts` - Prompt-engineered JSON shaping with Zod validation

### ✅ Tool Calling (Codex-Style)
- `tool-calling-basic.ts` - Simple tool calling example with clear output
- `tool-calling-stateless.ts` - Demonstrates stateless backend (full history required)
- `tool-calling-limitations.ts` - Shows which tools are supported vs unsupported

## JSON Generation Examples

### ✅ Working Approach: Prompt Engineering

Since the ChatGPT OAuth backend doesn't support `generateObject()` or custom tools, all JSON examples use prompt engineering with `generateText()` / `streamText()` plus client-side parsing/validation (Zod):

- `generate-json-basic.ts` - Simple objects, arrays, and data types with validation
- `generate-json-nested.ts` - Complex nested structures and real-world schemas
- `generate-json-advanced.ts` - Production patterns with retry logic and error handling
- `generate-object.ts` - Object generation via strict JSON-only prompts + Zod
- `stream-object.ts` - Streaming JSON text with progressive parsing
- `structured-output.ts` - Multiple structured patterns and validation

### ❌ What Still Doesn’t Work
- Server-enforced JSON schemas (no “JSON mode” on this backend)
- AI SDK `generateObject()` / `streamObject()` APIs (require custom tools)

### Backend Architecture

The ChatGPT OAuth backend (`https://chatgpt.com/backend-api/codex/responses`) follows the Codex CLI pattern:

#### Key Characteristics
- **Models**: Supports `gpt-5`, `gpt-5-codex`, and `gpt-5-turbo-preview`
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
npx tsx examples/basic-usage.ts              # Basic text generation
npx tsx examples/streaming.ts                # Streaming responses
npx tsx examples/reasoning-effort.ts         # Reasoning with different effort levels
npx tsx examples/basic-usage-gpt-5-codex.ts       # Codex-tuned basic call
npx tsx examples/streaming-gpt-5-codex.ts         # Codex streaming demo
npx tsx examples/system-message-gpt-5-codex.ts    # System message handling
npx tsx examples/generate-json-basic-gpt-5-codex.ts # Prompt-engineered JSON output

# Tool Calling
npx tsx examples/tool-calling-basic.ts       # Simple tool calling
npx tsx examples/tool-calling-stateless.ts   # Stateless backend demo
npx tsx examples/tool-calling-limitations.ts # Tool support info
```

**More Structured JSON Examples:**
```bash
npx tsx examples/generate-object.ts    # JSON via prompt engineering + Zod
npx tsx examples/stream-object.ts      # Stream text; parse progressively
npx tsx examples/structured-output.ts  # Multiple structured patterns
```

Or use npm scripts:
```bash
npm run example:auth          # Check authentication
npm run example:models        # Test model support
npm run example:basic         # Basic text generation
npm run example:streaming     # Streaming
npm run example:reasoning     # Reasoning effort levels
npm run example:basic-codex     # Codex basic usage
npm run example:streaming-codex # Codex streaming demo
npm run example:system-codex    # Codex system message handling
npm run example:object-codex    # Codex JSON generation with Zod
npm run example:tools         # Tool calling basic example
npm run example:object        # Object generation via prompt engineering
npm run example:structured    # Structured output via prompt engineering
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
- Coding assistants with gpt-5 or gpt-5-codex access
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
