import type {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2CallWarning,
  LanguageModelV2StreamPart,
  LanguageModelV2Content,
  LanguageModelV2Usage,
  LanguageModelV2FinishReason,
} from '@ai-sdk/provider';
import type { FetchFunction } from '@ai-sdk/provider-utils';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type {
  ChatGPTOAuthModelId,
  ChatGPTRequest,
  ReasoningEffort,
  ReasoningSummary,
  ChatGPTReasoning,
} from './chatgpt-oauth-settings';
import { convertToChatGPTMessages } from './convert-to-chatgpt-messages';
import { prepareChatGPTTools } from './chatgpt-oauth-prepare-tools';
import { mapChatGPTFinishReason } from './map-chatgpt-finish-reason';
import type { AuthProvider } from './auth';

// Load instructions file
let codexInstructions: string;
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  codexInstructions = readFileSync(join(__dirname, 'codex-instructions.txt'), 'utf8');
} catch {
  // Fallback if file not found
  codexInstructions = 'You are a helpful assistant.';
}

type ChatGPTOAuthConfig = {
  provider: string;
  baseURL: string;
  headers: Record<string, string | undefined>;
  fetch?: FetchFunction;
  authProvider: AuthProvider;
  reasoningEffort?: ReasoningEffort | null;
  reasoningSummary?: ReasoningSummary | null;
};

export class ChatGPTOAuthLanguageModel implements LanguageModelV2 {
  readonly specificationVersion = 'v2' as const;
  readonly modelId: ChatGPTOAuthModelId;
  readonly provider: string;
  readonly supportsImageUrls = true;
  readonly supportsUrls = false;
  readonly supportedUrls: Record<string, RegExp[]> = {
    'image/*': [/^https?:\/\/.*$/],
  };

  private readonly config: ChatGPTOAuthConfig;

  constructor(modelId: ChatGPTOAuthModelId, config: ChatGPTOAuthConfig) {
    this.modelId = modelId;
    this.provider = config.provider;
    this.config = config;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const credentials = await this.config.authProvider.getCredentials();

    return {
      Authorization: `Bearer ${credentials.accessToken}`,
      'chatgpt-account-id': credentials.accountId,
      'OpenAI-Beta': 'responses=experimental',
      originator: 'codex_cli_rs',
      session_id: this.generateSessionId(),
    };
  }

  private generateSessionId(): string {
    return crypto.randomUUID();
  }

  /**
   * Determine if reasoning should be enabled for the model.
   * Reasoning is supported for gpt-5 and codex models.
   */
  private supportsReasoning(): boolean {
    const modelName = this.modelId.toLowerCase();
    return (
      modelName.startsWith('gpt-5') || modelName.startsWith('codex') || modelName.startsWith('o')
    ); // o3, o4 etc if they get OAuth support
  }

  /**
   * Create reasoning parameter for the request.
   * For reasoning-capable models, defaults to medium effort and auto summary (matching Codex CLI).
   * Returns null if reasoning is not supported or explicitly disabled.
   */
  private createReasoningParam(): ChatGPTReasoning | null {
    // If model doesn't support reasoning, don't send reasoning params
    if (!this.supportsReasoning()) {
      return null;
    }

    // If effort is explicitly set to null, disable reasoning
    if (this.config.reasoningEffort === null) {
      return null;
    }

    // Use provided values or Codex CLI defaults
    // undefined means use default, null means disable
    const effort = this.config.reasoningEffort ?? 'medium';
    const summary = this.config.reasoningSummary ?? 'auto';

    // If summary is explicitly null, omit it
    if (summary === null) {
      return { effort, summary: undefined };
    }

    // Pass through exactly what the user specified
    // Let the API decide what's valid - this ensures future compatibility
    return {
      effort,
      summary,
    };
  }

  private async getArgs(options: LanguageModelV2CallOptions) {
    const warnings: LanguageModelV2CallWarning[] = [];

    const { messages: chatgptMessages, warnings: messageWarnings } = convertToChatGPTMessages({
      prompt: options.prompt,
      systemMessageMode: 'user',
    });
    warnings.push(...messageWarnings);

    const {
      tools,
      toolChoice,
      warnings: toolWarnings,
      toolMapping,
    } = prepareChatGPTTools({
      tools: options.tools,
      toolChoice: options.toolChoice,
    });
    warnings.push(...toolWarnings);

    const reasoning = this.createReasoningParam();
    const include: string[] = [];

    // Request encrypted COT if reasoning is enabled and we're not storing responses
    if (reasoning) {
      include.push('reasoning.encrypted_content');

      // Warn about potentially problematic summary values
      if (reasoning.summary === 'none' || reasoning.summary === 'concise') {
        warnings.push({
          type: 'other',
          message: `Reasoning summary '${reasoning.summary}' may not be consistently supported by the ChatGPT OAuth API. If you encounter errors, try 'auto' or 'detailed' instead.`,
        });
      }
    }

    const args: ChatGPTRequest = {
      model: this.modelId,
      instructions: codexInstructions,
      input: chatgptMessages,
      tools,
      tool_choice: toolChoice,
      parallel_tool_calls: false,
      reasoning,
      store: false,
      stream: true,
      include,
    };

    // ChatGPT backend doesn't support these parameters
    // but we should warn if they're provided
    if (options.temperature !== undefined) {
      warnings.push({
        type: 'other',
        message: 'Temperature parameter is not supported by ChatGPT backend',
      });
    }
    if (options.topP !== undefined) {
      warnings.push({
        type: 'other',
        message: 'Top-p parameter is not supported by ChatGPT backend',
      });
    }
    if (options.maxOutputTokens !== undefined) {
      warnings.push({
        type: 'other',
        message: 'Max tokens parameter is not supported by ChatGPT backend',
      });
    }

    return { args, warnings, toolMapping };
  }

  async doGenerate(options: LanguageModelV2CallOptions): Promise<{
    content: LanguageModelV2Content[];
    finishReason: LanguageModelV2FinishReason;
    usage: LanguageModelV2Usage;
    warnings: LanguageModelV2CallWarning[];
  }> {
    const { args, warnings, toolMapping } = await this.getArgs(options);
    const authHeaders = await this.getAuthHeaders();

    // Debug logging
    if (process.env.DEBUG) {
      console.warn('Request URL:', `${this.config.baseURL}/codex/responses`);
      console.warn('Request Body:', JSON.stringify(args, null, 2));
      console.warn('Auth Headers:', authHeaders);
      console.warn('Tools:', JSON.stringify(args.tools, null, 2));
    }

    // ChatGPT backend always uses streaming, even for non-streaming calls
    // We collect the stream and return the complete response
    const response = await fetch(`${this.config.baseURL}/codex/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...this.config.headers,
        ...authHeaders,
        ...options.headers,
      },
      body: JSON.stringify(args),
      signal: options.abortSignal,
    });

    // Don't consume the body if it's not ok and it's a stream
    if (!response.ok) {
      // Try to get error message if available
      let errorMessage = `ChatGPT OAuth API error: ${response.status} ${response.statusText}`;
      try {
        // Attempt to read error body - this will only work once
        const errorText = await response.text();
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      } catch {
        // Ignore if we can't read the body
      }
      throw new Error(errorMessage);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const content: LanguageModelV2Content[] = [];
    let finishReason: LanguageModelV2FinishReason = 'stop';
    let usage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };

    let currentText = '';
    const activeToolCalls = new Map<string, { name: string; args: string }>();
    const decoder = new TextDecoder();
    let buffer = '';

    // Process all the streamed events
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              break;
            }

            try {
              const event = JSON.parse(data);

              if (process.env.DEBUG) {
                console.warn('SSE Event (doGenerate):', JSON.stringify(event, null, 2));
              }

              // Handle ChatGPT backend event format
              switch (event.type) {
                case 'response.output_item.added':
                  // Handle function call initialization
                  if (event.item && event.item.type === 'function_call') {
                    const id = event.item.id || `call_${Date.now()}`;
                    activeToolCalls.set(id, {
                      name: 'pending',
                      args: '',
                    });
                  }
                  break;

                case 'response.output_item.done':
                  // Handle completed function calls
                  if (event.item && event.item.type === 'function_call' && event.item.name) {
                    const toolCallId = event.item.id;
                    if (activeToolCalls.has(toolCallId)) {
                      const toolCall = activeToolCalls.get(toolCallId)!;
                      toolCall.name = event.item.name;
                      toolCall.args = event.item.arguments || '';

                      // Keep the mapping for later processing
                      activeToolCalls.set(toolCallId, {
                        name: toolCall.name,
                        args: toolCall.args,
                      });
                    }
                  }
                  break;

                case 'response.output_text.delta':
                  currentText += event.delta || '';
                  break;

                case 'response.completed':
                  finishReason = mapChatGPTFinishReason(event.status);
                  // Debug: log the entire event to understand structure
                  if (process.env.DEBUG_USAGE) {
                    console.warn('response.done event:', JSON.stringify(event, null, 2));
                  }
                  // Usage data is nested under response.usage
                  if (event.response?.usage) {
                    usage = {
                      inputTokens: event.response.usage.input_tokens || 0,
                      outputTokens: event.response.usage.output_tokens || 0,
                      totalTokens:
                        (event.response.usage.input_tokens || 0) +
                        (event.response.usage.output_tokens || 0),
                    };
                  }
                  break;
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (currentText) {
      content.push({ type: 'text', text: currentText });
    }

    for (const [id, toolCall] of activeToolCalls) {
      if (toolCall.name && toolCall.args) {
        // Map back to original tool names using toolMapping
        const originalName = toolMapping.get(toolCall.name) || toolCall.name;

        try {
          const args = JSON.parse(toolCall.args);
          content.push({
            type: 'tool-call',
            toolCallId: id,
            toolName: originalName,
            input: JSON.stringify(args),
          });
        } catch {
          console.error('Failed to parse tool arguments');
        }
      }
    }

    return {
      content,
      finishReason,
      usage,
      warnings,
    };
  }

  async doStream(options: LanguageModelV2CallOptions): Promise<{
    stream: ReadableStream<LanguageModelV2StreamPart>;
    usage: Promise<LanguageModelV2Usage>;
    warnings: LanguageModelV2CallWarning[];
  }> {
    const { args, warnings, toolMapping } = await this.getArgs(options);
    const authHeaders = await this.getAuthHeaders();

    const response = await fetch(`${this.config.baseURL}/codex/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...this.config.headers,
        ...authHeaders,
        ...options.headers,
      },
      body: JSON.stringify(args),
      signal: options.abortSignal,
    });

    // Don't consume the body if it's not ok and it's a stream
    if (!response.ok) {
      // Try to get error message if available
      let errorMessage = `ChatGPT OAuth API error: ${response.status} ${response.statusText}`;
      try {
        // Attempt to read error body - this will only work once
        const errorText = await response.text();
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      } catch {
        // Ignore if we can't read the body
      }
      throw new Error(errorMessage);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    let usage: LanguageModelV2Usage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };

    const activeToolCalls = new Map<string, { name: string; args: string }>();

    const stream = new ReadableStream<LanguageModelV2StreamPart>({
      async start(controller) {
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  controller.close();
                  return;
                }

                try {
                  const event = JSON.parse(data);

                  if (process.env.DEBUG) {
                    console.warn('SSE Event (doStream):', JSON.stringify(event, null, 2));
                  }

                  // Handle ChatGPT backend event format
                  switch (event.type) {
                    case 'response.output_item.added':
                      // Handle function call initialization
                      if (event.item && event.item.type === 'function_call') {
                        const id = event.item.id || `call_${Date.now()}`;
                        activeToolCalls.set(id, {
                          name: 'pending',
                          args: '',
                        });
                      }
                      break;

                    case 'response.output_item.done':
                      // Handle completed function calls
                      if (event.item && event.item.type === 'function_call' && event.item.name) {
                        const toolCallId = event.item.id;
                        if (activeToolCalls.has(toolCallId)) {
                          const toolCall = activeToolCalls.get(toolCallId)!;
                          toolCall.name = event.item.name;
                          toolCall.args = event.item.arguments || '';

                          // Map back to original tool names using toolMapping
                          const originalName = toolMapping.get(toolCall.name) || toolCall.name;

                          controller.enqueue({
                            type: 'tool-call',
                            toolCallId: toolCallId,
                            toolName: originalName,
                            input: toolCall.args,
                          });

                          activeToolCalls.delete(toolCallId);
                        }
                      }
                      break;

                    case 'response.output_text.delta':
                      if (event.delta) {
                        controller.enqueue({
                          type: 'text-delta',
                          id: `text-${Date.now()}`,
                          delta: event.delta,
                        });
                      }
                      break;

                    case 'response.function_call_arguments.delta':
                      // Handle incremental tool call arguments
                      if (event.item_id && event.delta) {
                        if (activeToolCalls.has(event.item_id)) {
                          const active = activeToolCalls.get(event.item_id)!;
                          active.args += event.delta;

                          controller.enqueue({
                            type: 'tool-input-delta',
                            id: event.item_id,
                            delta: event.delta,
                          });
                        }
                      }
                      break;

                    case 'response.completed':
                      // Usage data is nested under response.usage
                      if (event.response?.usage) {
                        usage = {
                          inputTokens: event.response.usage.input_tokens || 0,
                          outputTokens: event.response.usage.output_tokens || 0,
                          totalTokens:
                            (event.response.usage.input_tokens || 0) +
                            (event.response.usage.output_tokens || 0),
                        };
                      }
                      controller.enqueue({
                        type: 'finish',
                        finishReason: mapChatGPTFinishReason(event.status),
                        usage,
                      });
                      break;
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            }
          }
        } catch (error) {
          controller.error(error);
        } finally {
          reader.releaseLock();
          controller.close();
        }
      },
    });

    return {
      stream,
      usage: Promise.resolve(usage),
      warnings,
    };
  }
}
