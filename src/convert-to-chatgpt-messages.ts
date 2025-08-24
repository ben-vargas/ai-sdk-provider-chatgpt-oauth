import type { LanguageModelV1Prompt, LanguageModelV1CallWarning } from '@ai-sdk/provider';
import { ChatGPTMessage } from './chatgpt-oauth-settings';

export function convertToChatGPTMessages({
  prompt,
  systemMessageMode = 'user',
}: {
  prompt: LanguageModelV1Prompt;
  systemMessageMode?: 'user' | 'system';
}): {
  messages: ChatGPTMessage[];
  warnings: LanguageModelV1CallWarning[];
} {
  const warnings: LanguageModelV1CallWarning[] = [];
  const messages: ChatGPTMessage[] = [];

  for (const message of prompt) {
    switch (message.role) {
      case 'system': {
        if (systemMessageMode === 'user') {
          messages.push({ role: 'user', content: message.content });
          warnings.push({ type: 'other', message: 'System messages are converted to user messages' });
        } else {
          // In 'system' mode, we do not include system messages in input messages.
          // They should be forwarded via the ChatGPT `instructions` field instead.
        }
        break;
      }

      case 'user': {
        if (typeof message.content === 'string') {
          messages.push({ role: 'user', content: message.content });
        } else {
          const parts: string[] = [];
          for (const part of message.content) {
            if (part.type === 'text') {
              parts.push(part.text);
            } else if (part.type === 'image') {
              if (typeof part.image === 'string') {
                parts.push(`[Image: ${part.image}]`);
              } else if (part.image && 'url' in part.image && typeof (part.image as any).url === 'string') {
                parts.push(`[Image: ${(part.image as any).url}]`);
              } else {
                warnings.push({ type: 'other', message: 'Unsupported image content; converted to placeholder.' });
                parts.push('[Image]');
              }
            } else {
              const unknownPart = part as { type: string };
              warnings.push({ type: 'other', message: `Unsupported content part type: ${unknownPart.type}` });
            }
          }
          messages.push({ role: 'user', content: parts.join('\n') });
        }
        break;
      }

      case 'assistant': {
        let content: string | null = null;

        if (typeof message.content === 'string') {
          content = message.content;
        } else if (message.content.length > 0) {
          const textParts = message.content.filter((part) => part.type === 'text').map((part) => part.text);
          if (textParts.length > 0) content = textParts.join('');
        }

        const chatGPTMessage: ChatGPTMessage = {
          role: 'assistant',
          content,
        };

        if (Array.isArray(message.content)) {
          const toolCalls = message.content
            .filter((part) => (part as any).type === 'tool-call')
            .map((part: any) => ({
              id: part.toolCallId,
              type: 'function' as const,
              function: {
                name: part.toolName,
                arguments: typeof part.args === 'string' ? part.args : JSON.stringify(part.input ?? part.args ?? {}),
              },
            }));
          if (toolCalls.length > 0) chatGPTMessage.tool_calls = toolCalls;
        }

        messages.push(chatGPTMessage);
        break;
      }

      case 'tool': {
        for (const toolResponse of message.content as any[]) {
          let content: string;
          const output = toolResponse.result ?? toolResponse.output;
          if (output?.type === 'text' || output?.type === 'error-text') {
            content = output.value;
          } else if (typeof output === 'string') {
            content = output;
          } else {
            content = JSON.stringify(output?.value ?? output ?? {});
          }
          messages.push({ role: 'tool', content, tool_call_id: toolResponse.toolCallId });
        }
        break;
      }

      default: {
        const unknownMessage = message as { role: string };
        warnings.push({
          type: 'other',
          message: `Unsupported message role: ${unknownMessage.role}`,
        });
      }
    }
  }

  return { messages, warnings };
}

function convertUint8ArrayToBase64(array: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < array.byteLength; i++) {
    binary += String.fromCharCode(array[i]);
  }
  return btoa(binary);
}
