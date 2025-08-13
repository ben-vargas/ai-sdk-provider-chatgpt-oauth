# JSON Formatting with ChatGPT OAuth Provider

## Overview

The ChatGPT OAuth backend API (`chatgpt.com/backend-api/codex/responses`) has **very limited support for JSON output**. Unlike the standard OpenAI API, the ChatGPT backend:

- **REQUIRES exact Codex CLI instructions** - cannot be modified
- **Does NOT support custom tools** - only `shell` and `update_plan` are allowed
- **Does NOT support** `generateObject()` or `streamObject()` from AI SDK
- **Can ONLY generate JSON** through prompt engineering

## The Reality

### What DOESN'T Work

❌ **`generateObject()`** - Requires custom tools which the backend doesn't support  
❌ **`streamObject()`** - Same limitation as generateObject  
❌ **Response format parameters** - Backend ignores these  
❌ **Modifying instructions** - Backend validates and rejects any changes to Codex instructions  
❌ **Custom tools for structured output** - Only `shell` and `update_plan` tools are allowed  

### What DOES Work

✅ **Prompt engineering** - Adding JSON instructions directly to the user prompt

This is the ONLY reliable method:

```typescript
const result = await generateText({
  model: chatgptOAuth('gpt-5'),
  prompt: `Generate a user profile as JSON.

IMPORTANT: Respond ONLY with valid JSON. No text before or after.
The response must be a single JSON object with this structure:
{
  "name": "string",
  "age": number,
  "email": "string"
}`,
});

// Parse the response
const data = JSON.parse(result.text);
```

## Working Approach: Prompt Engineering

### The ONLY Method That Works

Since the ChatGPT OAuth backend doesn't support custom tools or response formatting, **prompt engineering is the only way** to get JSON output:

### Example: Working JSON Generation

```typescript
import { generateText } from 'ai';
import { createChatGPTOAuth } from 'ai-sdk-provider-chatgpt-oauth';

const chatgptOAuth = createChatGPTOAuth();

const result = await generateText({
  model: chatgptOAuth('gpt-5'),
  prompt: `Generate a user profile with name, age, and email.

IMPORTANT: Respond ONLY with valid JSON. No text before or after.
The response must be a single JSON object like this:
{
  "name": "string",
  "age": number,
  "email": "string"
}`,
});

// Parse the response
try {
  const data = JSON.parse(result.text);
  console.log('Success:', data);
} catch (e) {
  console.error('Failed to parse JSON:', e);
}
```

### Tips for Better JSON Generation

1. **Be explicit** about JSON requirements in the prompt
2. **Provide an example** of the expected structure
3. **Use clear instructions** like "ONLY JSON" and "No text before or after"
4. **Handle parse errors** - the model might still add text sometimes
5. **Consider retry logic** if JSON parsing fails

## Example Files

We provide three progressively advanced examples demonstrating JSON generation through prompt engineering:

1. **[generate-json-basic.ts](../examples/generate-json-basic.ts)** - Simple objects, arrays, and data types
2. **[generate-json-nested.ts](../examples/generate-json-nested.ts)** - Complex nested structures
3. **[generate-json-advanced.ts](../examples/generate-json-advanced.ts)** - Production patterns with retry logic

Run them with:
```bash
npx tsx examples/generate-json-basic.ts
npx tsx examples/generate-json-nested.ts
npx tsx examples/generate-json-advanced.ts
```

## Fundamental Limitations

1. **No Custom Tools**: The backend only supports `shell` and `update_plan` tools, making `generateObject` impossible

2. **Fixed Instructions**: The Codex CLI instructions cannot be modified - any changes cause "Instructions are not valid" error

3. **No Response Format Control**: The backend ignores `response_format` parameters entirely

4. **AI SDK Incompatibility**: Standard AI SDK structured output features (`generateObject`, `streamObject`) do NOT work

5. **Prompt-Only Control**: The ONLY way to influence output format is through the user prompt

## Workarounds

### Custom JSON Extractor
If you need to extract JSON from mixed text responses:

```typescript
function extractJSON(text: string): any {
  // Try to find JSON in the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      throw new Error('Invalid JSON in response');
    }
  }
  throw new Error('No JSON found in response');
}
```

### Retry with Validation
Implement retry logic with validation using prompt engineering:

```typescript
import { z } from 'zod';

async function getStructuredOutput(prompt: string, schema: z.ZodSchema) {
  const maxRetries = 3;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await generateText({
        model: chatgptOAuth('gpt-5'),
        prompt: `${prompt}\n\nOUTPUT ONLY VALID JSON:`,
      });
      
      const json = JSON.parse(result.text);
      return schema.parse(json);
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      // Retry with more explicit instructions
    }
  }
}
```

## Future Improvements

As the ChatGPT backend API evolves, we'll update the provider to support new formatting capabilities. Potential future enhancements:

- Native `response_format` support
- Custom agent/metadata parameters
- Improved system prompt control
- Direct schema validation

## See Also

- [Working Examples: Basic JSON](../examples/generate-json-basic.ts)
- [Working Examples: Nested JSON](../examples/generate-json-nested.ts)
- [Working Examples: Advanced Patterns](../examples/generate-json-advanced.ts)
- [Examples README](../examples/README.md#json-generation-examples)
- [Limitations Documentation](./limitations.md#structured-output-limitations)