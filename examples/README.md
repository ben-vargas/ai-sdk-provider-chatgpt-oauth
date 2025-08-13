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
- `tool-calling-shell.ts` - Shell command execution via `bash` tool
- `tool-calling-custom.ts` - Pattern for implementing custom tools through shell
- `tool-calling.ts` - Demonstrates tool limitations and warnings

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
npx tsx examples/tool-calling.ts        # Tool limitations demo
npx tsx examples/tool-calling-shell.ts  # Shell command execution
npx tsx examples/tool-calling-custom.ts # Custom tool pattern
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
npm run example:tools         # Tool calling demo
npm run example:tools:shell   # Shell tool
npm run example:tools:custom  # Custom tool pattern
npm run example:object        # Object generation (fails)
npm run example:structured    # Structured output (fails)
```

## Understanding the Tool Pattern

### How Codex Tools Work

In the Codex CLI ecosystem, sophisticated functionality is implemented as command-line tools:

1. **`apply_patch`** - File editing tool
   - Called as: `["apply_patch", "patch content"]`
   - Executed via `shell` tool

2. **Custom Tools** - Your functionality
   - Create a CLI: `my-tool --arg value`
   - AI calls: `["my-tool", "--arg", "value"]`
   - Results returned through stdout

### Example Implementation

```typescript
// Define a tool that maps to shell
tool({
  name: 'bash',  // Maps to 'shell' in ChatGPT
  execute: async ({ command }) => {
    // Your command execution logic
    return executeCommand(command);
  }
})
```

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