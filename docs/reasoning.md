# Reasoning Effort Control

Control the depth of reasoning for supported models (similar to Codex CLI's `-c model_reasoning_effort="high"`).

## Quick Example

```typescript
import { generateText } from 'ai';
import { createChatGPTOAuth } from 'ai-sdk-provider-chatgpt-oauth';

// Default behavior (matches Codex CLI defaults)
const provider = createChatGPTOAuth();
// For gpt-5, gpt-5-codex, and codex models: automatically uses effort='medium', summary='auto'

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

// Explicitly disable reasoning (even for gpt-5 variants)
const noReasoning = provider('gpt-5', { reasoningEffort: null });
```

## Reasoning Compatibility Table

| Model                 | Reasoning Effort                     | Reasoning Summary                                       | Notes                                                      |
| --------------------- | ------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------- |
| **gpt-5**             | ✅ `low`<br>✅ `medium`<br>✅ `high` | ✅ `auto`<br>✅ `detailed`<br>⚠️ `none`<br>⚠️ `concise` | \*API behavior inconsistent - defaults to omitting summary |
| **gpt-5-codex**       | ✅ `low`<br>✅ `medium`<br>✅ `high` | ✅ `auto`<br>✅ `detailed`<br>⚠️ `none`<br>⚠️ `concise` | \*API behavior inconsistent - defaults to omitting summary |
| **codex-mini-latest** | ✅ `low`<br>✅ `medium`<br>✅ `high` | ✅ `auto`<br>✅ `detailed`<br>⚠️ `none`<br>⚠️ `concise` | \*API behavior inconsistent - defaults to omitting summary |

## Defaults (matching Codex CLI)

- When using `gpt-5`, `gpt-5-codex`, or `codex-mini-latest` models, reasoning defaults to `effort: 'medium'` and `summary: 'auto'`
- To disable reasoning, explicitly set `reasoningEffort: null`
- Other models do not receive reasoning parameters

## Important Notes

- Higher effort levels typically increase response time and token usage
- ⚠️ The API shows inconsistent behavior with `none` and `concise` summary values - the provider will warn but still pass them through
- All user-specified values are passed to the API as-is to ensure future compatibility
- When reasoning is enabled, the request automatically includes `reasoning.encrypted_content`
- API errors will clearly indicate if a value is not supported

## Configuration Options

### Global Configuration

Set reasoning defaults for all models:

```typescript
const provider = createChatGPTOAuth({
  reasoningEffort: 'high',
  reasoningSummary: 'detailed',
});
```

### Per-Model Configuration

Override settings for specific model calls:

```typescript
const model = provider('gpt-5', {
  reasoningEffort: 'low',
  reasoningSummary: 'auto',
});
```

### Disabling Reasoning

To disable reasoning entirely (even for models that support it):

```typescript
const model = provider('gpt-5', { 
  reasoningEffort: null,
  reasoningSummary: null 
});
```
