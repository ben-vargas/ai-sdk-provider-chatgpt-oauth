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

### No JSON Mode for Model Responses

The ChatGPT backend does not support:
- `responseFormat: { type: 'json' }` - No JSON mode for model responses
- `generateObject()` function - Not available
- `streamObject()` function - Not available
- Structured output schemas - Not supported

### Limited JSON Support (Events Only)

**What IS Available:**
- **`codex exec --json` flag**: Outputs events as JSONL (JSON Lines) format
- **Event streaming**: Debug/monitoring events can be output as JSON
- **NOT for model responses**: This only affects event logging, not AI responses

Example of `--json` flag usage (Codex CLI):
```bash
codex exec --json "Write a function"
# Outputs events as JSONL, but AI response is still plain text
```

### Why Structured Output Doesn't Work

1. **Codex Instructions**: The model uses Codex CLI instructions that optimize for coding tasks
2. **No Response Format Control**: Cannot enforce JSON output at the model level
3. **Tool-Focused Design**: Optimized for command execution, not data generation
4. **Events vs Responses**: JSON flag only affects event streaming, not model outputs

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

Only **2 models** work through the ChatGPT OAuth API:

1. **`gpt-5`** - Latest GPT-5 with reasoning support (200k context, 100k output)
2. **`codex-mini-latest`** - Experimental with local shell understanding (200k context, 100k output)

### Models That DO NOT Work

Testing confirmed these models return "Unsupported model" errors:
- ❌ `o3`, `o4-mini` - Reasoning models
- ❌ `gpt-4.1`, `gpt-4.1-2025-04-14` - 1M context models
- ❌ `gpt-4o` and all variants - GPT-4o series
- ❌ `gpt-3.5-turbo` - Legacy model
- ❌ `gpt-oss-20b`, `gpt-oss-120b` - Open source models
- ❌ `gpt-5-turbo-preview` - Not available

### Important Distinction

**Codex CLI** internally supports many models, but the **ChatGPT OAuth API** (`/backend-api/codex/responses`) only accepts `gpt-5` and `codex-mini-latest`. This is a limitation of the OAuth API endpoint, not the provider.

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
| Models | ✅ Many options | ❌ Only gpt-5 |
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