import type {
  LanguageModelV1Prompt,
  LanguageModelV1CallWarning,
  LanguageModelV1TextPart,
  LanguageModelV1ImagePart,
  LanguageModelV1FilePart,
  LanguageModelV1ToolCallPart,
  LanguageModelV1ReasoningPart,
  LanguageModelV1RedactedReasoningPart,
  LanguageModelV1ToolResultPart,
} from '@ai-sdk/provider';
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
          const userParts = message.content as Array<
            LanguageModelV1TextPart | LanguageModelV1ImagePart | LanguageModelV1FilePart
          >;
          for (const part of userParts) {
            if (part.type === 'text') {
              parts.push(part.text);
            } else if (part.type === 'image') {
              const img = (part as LanguageModelV1ImagePart).image;
              if (img instanceof URL) parts.push(`[Image: ${img.toString()}]`);
              else parts.push('[Image]');
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
          const assistantParts = message.content as Array<
            | LanguageModelV1TextPart
            | LanguageModelV1FilePart
            | LanguageModelV1ReasoningPart
            | LanguageModelV1RedactedReasoningPart
            | LanguageModelV1ToolCallPart
          >;

          const toolCalls = assistantParts
            .filter((p): p is LanguageModelV1ToolCallPart => p.type === 'tool-call')
            .map((part) => ({
              id: part.toolCallId,
              type: 'function' as const,
              function: {
                name: part.toolName,
                arguments:
                  typeof (part.args as unknown) === 'string'
                    ? (part.args as string)
                    : JSON.stringify(part.args ?? {}),
              },
            }));
          if (toolCalls.length > 0) chatGPTMessage.tool_calls = toolCalls;
        }

        messages.push(chatGPTMessage);
        break;
      }

      case 'tool': {
        const contentArray = message.content as Array<LanguageModelV1ToolResultPart>;
        for (const toolResponse of contentArray) {
          let content: string;
          // Prefer text content from advanced tool result parts when available
          const textPart = toolResponse.content?.find((p) => p.type === 'text');
          if (textPart && textPart.type === 'text') content = textPart.text;
          else if (typeof toolResponse.result === 'string') content = toolResponse.result;
          else content = JSON.stringify(toolResponse.result ?? {});
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

// Removed unused helper to satisfy strict typecheck settings
