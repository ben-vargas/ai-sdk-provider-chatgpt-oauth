import type { LanguageModelV2Prompt, LanguageModelV2CallWarning } from '@ai-sdk/provider';
import { ChatGPTMessage } from './chatgpt-oauth-settings';

export function convertToChatGPTMessages({
  prompt,
  systemMessageMode = 'user',
}: {
  prompt: LanguageModelV2Prompt;
  systemMessageMode?: 'user' | 'system';
}): {
  messages: ChatGPTMessage[];
  warnings: LanguageModelV2CallWarning[];
} {
  const warnings: LanguageModelV2CallWarning[] = [];
  const messages: ChatGPTMessage[] = [];

  for (const message of prompt) {
    switch (message.role) {
      case 'system': {
        if (systemMessageMode === 'user') {
          messages.push({
            role: 'user',
            content: message.content,
            name: 'system',
          });

          warnings.push({
            type: 'other',
            message: 'System messages are converted to user messages with name="system"',
          });
        } else {
          messages.push({
            role: 'user',
            content: message.content,
          });
        }
        break;
      }

      case 'user': {
        if (message.content.length === 1 && message.content[0].type === 'text') {
          messages.push({
            role: 'user',
            content: message.content[0].text,
          });
        } else {
          const parts: string[] = [];

          for (const part of message.content) {
            switch (part.type) {
              case 'text': {
                parts.push(part.text);
                break;
              }

              case 'file': {
                if (part.mediaType.startsWith('image/')) {
                  if (part.data instanceof URL) {
                    parts.push(`[Image: ${part.data.href}]`);
                  } else if (typeof part.data === 'string') {
                    parts.push(`[Image: data:${part.mediaType};base64,${part.data}]`);
                  } else {
                    const base64String = convertUint8ArrayToBase64(part.data as Uint8Array);
                    parts.push(`[Image: data:${part.mediaType};base64,${base64String}]`);
                  }
                } else {
                  parts.push(`[File: ${part.filename || 'unnamed'}]`);
                }
                break;
              }

              default: {
                const unknownPart = part as { type: string };
                warnings.push({
                  type: 'other',
                  message: `Unsupported content part type: ${unknownPart.type}`,
                });
              }
            }
          }

          messages.push({
            role: 'user',
            content: parts.join('\n'),
          });
        }
        break;
      }

      case 'assistant': {
        let content: string | null = null;

        if (message.content.length > 0) {
          const textParts = message.content
            .filter((part) => part.type === 'text')
            .map((part) => part.text);

          if (textParts.length > 0) {
            content = textParts.join('');
          }
        }

        const chatGPTMessage: ChatGPTMessage = {
          role: 'assistant',
          content,
        };

        if (message.content.some((part) => part.type === 'tool-call')) {
          const toolCalls = message.content
            .filter((part) => part.type === 'tool-call')
            .map((part) => ({
              id: part.toolCallId,
              type: 'function' as const,
              function: {
                name: part.toolName,
                arguments: JSON.stringify(part.input),
              },
            }));

          if (toolCalls.length > 0) {
            chatGPTMessage.tool_calls = toolCalls;
          }
        }

        messages.push(chatGPTMessage);
        break;
      }

      case 'tool': {
        for (const toolResponse of message.content) {
          let content: string;
          if (toolResponse.output.type === 'text' || toolResponse.output.type === 'error-text') {
            content = toolResponse.output.value;
          } else {
            content = JSON.stringify(toolResponse.output.value);
          }
          messages.push({
            role: 'tool',
            content,
            tool_call_id: toolResponse.toolCallId,
          });
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
