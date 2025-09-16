# ChatGPT OAuth Provider Limitations

This document outlines the limitations and constraints of the ChatGPT OAuth provider compared to standard OpenAI API providers.

## Tool System Limitations

### Only Two Predefined Tools

The ChatGPT backend **only** supports these tools:

1. **`shell`** - Execute command-line commands
   - Mapped from: `bash`, `shell`, `command`, `execute`
   - Purpose: Run CLI tools and scripts

2. **`update_plan`** - Task planning and tracking
   - Mapped from: `TodoWrite`, `update_plan`, `plan`, `todo`
   - Purpose: Maintain task lists and progress

### No Custom Function Tools

❌ **Cannot Define Custom Tools** like:
- `getWeather` - Weather API calls
- `searchDatabase` - Database queries
- `sendEmail` - Email operations
- `calculatePrice` - Custom calculations

✅ **Workaround**: Implement as CLI tools called via shell:
```typescript
// Instead of a custom tool, create a CLI
// weather-cli that the AI calls via shell
["weather-cli", "--city", "San Francisco"]
```

## Structured Output Limitations

### ❌ JSON Generation Does NOT Work with AI SDK Features

**Critical Limitation**: The ChatGPT OAuth backend does NOT support custom tools, which means **`generateObject()` and `streamObject()` do NOT work**.

**What Does NOT Work:**
- ❌ **`generateObject()` function** - Requires custom tools, backend only supports shell/update_plan
- ❌ **`streamObject()` function** - Same limitation as generateObject
- ❌ **Custom tool schemas** - Only predefined Codex tools are allowed
- ❌ **Response format parameters** - Backend ignores these entirely
- ❌ **Modified instructions** - Backend validates and rejects any changes

### Why It Doesn't Work

1. **No Custom Tools**: The backend only accepts `shell` and `update_plan` tools
2. **Fixed Instructions**: Codex CLI instructions cannot be modified (causes "Instructions are not valid" error)
3. **AI SDK Incompatibility**: generateObject creates custom tools that the backend rejects
4. **No Response Format Control**: The backend has no structured output mode

### The ONLY Working Approach: Prompt Engineering

```typescript
// This is the ONLY way to get JSON from ChatGPT OAuth
const result = await generateText({
  model: chatgptOAuth('gpt-5'),
  prompt: `Generate a user profile as JSON.
  
IMPORTANT: Respond ONLY with valid JSON. No text before or after.
{
  "name": "string",
  "age": number,
  "email": "string"
}`,
});

// Parse manually with error handling
try {
  const data = JSON.parse(result.text);
  console.log('Parsed:', data);
} catch (e) {
  console.error('Not valid JSON');
}
```

### Best Practices for JSON Output

1. **Use explicit prompt instructions** for JSON formatting
2. **Provide examples** in the prompt
3. **Parse manually** with error handling
4. **Consider retry logic** if parsing fails
5. **Accept that it's not 100% reliable** - the model may still output text

## Parameter Limitations

These standard parameters are **not supported**:

| Parameter | Impact | Workaround |
|-----------|--------|------------|
| `temperature` | Cannot control randomness | Use prompt engineering |
| `topP` | Cannot adjust sampling | Model uses defaults |
| `maxTokens` | Cannot limit output length | Model manages internally |
| `frequencyPenalty` | Cannot reduce repetition | Prompt design only |
| `presencePenalty` | Cannot encourage novelty | Prompt engineering |
| `seed` | No deterministic outputs | Not available |
| `stop` | Cannot define stop sequences | Model controlled |

## API Differences

### Endpoint Behavior

- **Always Streams**: Even non-streaming calls use SSE internally
- **Responses API**: Uses `/codex/responses` not `/chat/completions`
- **Event Format**: Custom SSE events, not standard OpenAI format

### Authentication

- **OAuth Only**: No API key support
- **Token Refresh**: Requires refresh token management
- **Account ID**: Needs ChatGPT account identifier

## Model Availability

### Actually Working Models (Tested via API)

Only **3 models** work through the ChatGPT OAuth API:

1. **`gpt-5`** - Latest GPT-5 with reasoning support (200k context, 100k output)
2. **`gpt-5-codex`** - Codex-tuned GPT-5 variant with identical limits and defaults
3. **`codex-mini-latest`** - Experimental with local shell understanding (200k context, 100k output)

### Models That DO NOT Work

Testing confirmed these models return "Unsupported model" errors:
- ❌ `o3`, `o4-mini` - Reasoning models
- ❌ `gpt-4.1`, `gpt-4.1-2025-04-14` - 1M context models
- ❌ `gpt-4o` and all variants - GPT-4o series
- ❌ `gpt-3.5-turbo` - Legacy model
- ❌ `gpt-oss-20b`, `gpt-oss-120b` - Open source models
- ❌ `gpt-5-turbo-preview` - Not available

### Important Distinction

**Codex CLI** internally supports many models, but the **ChatGPT OAuth API** (`/backend-api/codex/responses`) currently only accepts `gpt-5`, `gpt-5-codex`, and `codex-mini-latest`. This is a limitation of the OAuth API endpoint, not the provider.

## Use Case Limitations

### Not Suitable For

❌ Applications requiring:
- Structured data extraction
- JSON API responses
- Custom business logic tools
- Precise output formatting
- Deterministic responses
- Fine-grained control

### Best Suited For

✅ Applications involving:
- Code generation and editing
- CLI automation
- File system operations
- Task planning and execution
- Development workflows
- Codex CLI integration

## Comparison with Standard OpenAI

| Feature | Standard OpenAI | ChatGPT OAuth |
|---------|----------------|---------------|
| Custom Tools | ✅ Unlimited | ❌ Only 2 predefined |
| JSON Mode | ✅ Supported | ❌ Not available |
| Temperature | ✅ Configurable | ❌ Fixed |
| API Keys | ✅ Simple | ❌ OAuth required |
| Models | ✅ Many options | ❌ Only gpt-5 / gpt-5-codex / codex-mini-latest |
| Structured Output | ✅ Full support | ❌ Not supported |
| Response Format | ✅ Controllable | ❌ Fixed |

## Migration Considerations

If migrating from standard OpenAI:

1. **Rewrite Custom Tools**: Convert to CLI utilities
2. **Remove Structured Output**: Use text parsing instead
3. **Adjust Prompts**: Work within Codex instructions
4. **Handle OAuth**: Implement token management
5. **Accept Limitations**: Design around constraints

## Workarounds and Best Practices

### Implementing Custom Logic

1. **Create CLI Tools**
   ```bash
   #!/usr/bin/env node
   // weather-cli.js
   const city = process.argv[2];
   // Fetch weather and output to stdout
   console.log(JSON.stringify(weatherData));
   ```

2. **Call via Shell**
   ```typescript
   tools: {
     bash: tool({
       execute: async ({ command }) => {
         // Execute your CLI tool
         return runCommand(command);
       }
     })
   }
   ```

### Handling Structured Data

Without JSON mode, use:
- Clear prompt instructions for formatting
- Text parsing on responses
- Validation and retry logic
- Accept some variability in output format

### Working with Limitations

1. **Embrace the Codex Pattern**: Design around CLI tools
2. **Use Shell Power**: Leverage existing CLI ecosystem
3. **Task Planning**: Utilize `update_plan` for complex workflows
4. **Prompt Engineering**: Compensate for missing parameters

## Conclusion

The ChatGPT OAuth provider is powerful for coding and CLI tasks but has significant limitations for general AI applications. Choose this provider when you need:

- Access to gpt-5 models
- Integration with Codex CLI
- Shell command execution
- Task planning capabilities

For applications requiring custom tools, structured output, or fine-grained control, consider using the standard OpenAI API provider instead.
