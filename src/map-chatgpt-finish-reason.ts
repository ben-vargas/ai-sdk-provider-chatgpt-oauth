import type { LanguageModelV1FinishReason } from '@ai-sdk/provider';

export function mapChatGPTFinishReason(
  finishReason: string | null | undefined
): LanguageModelV1FinishReason {
  switch (finishReason) {
    case 'stop':
    case 'completed': // ChatGPT backend uses 'completed' status
      return 'stop';
    case 'length':
    case 'max_tokens':
      return 'length';
    case 'content_filter':
      return 'content-filter';
    default:
      return 'unknown';
  }
}
