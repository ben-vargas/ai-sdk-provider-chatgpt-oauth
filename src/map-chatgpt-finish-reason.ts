import type { LanguageModelV2FinishReason } from '@ai-sdk/provider';

export function mapChatGPTFinishReason(
  finishReason: string | null | undefined
): LanguageModelV2FinishReason {
  switch (finishReason) {
    case 'stop':
    case 'completed': // ChatGPT backend uses 'completed' status
      return 'stop';
    case 'length':
    case 'max_tokens':
      return 'length';
    case 'tool_calls':
    case 'function_call':
      return 'tool-calls';
    case 'content_filter':
      return 'content-filter';
    default:
      return 'stop'; // Default to 'stop' instead of 'unknown' for ChatGPT backend
  }
}
