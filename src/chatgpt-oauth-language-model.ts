import type {
  LanguageModelV1,
  LanguageModelV1CallOptions,
  LanguageModelV1CallWarning,
  LanguageModelV1StreamPart,
  LanguageModelV1FunctionToolCall,
  LanguageModelV1FinishReason,
} from '@ai-sdk/provider';
import type { FetchFunction } from '@ai-sdk/provider-utils';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { validateToolResponse } from './tool-response-schemas';
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
function loadInstructions(filename: string, fallback: string): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    return readFileSync(join(__dirname, filename), 'utf8');
  } catch {
    return fallback;
  }
}

const baseInstructions = loadInstructions('codex-instructions.txt', 'You are a helpful assistant.');
const codexModelInstructions = loadInstructions('codex-gpt5-codex-instructions.txt', baseInstructions);
const applyPatchInstructions = loadInstructions('codex-apply-patch-instructions.txt', '');

type ChatGPTOAuthConfig = {
  provider: string;
  baseURL: string;
  headers: Record<string, string | undefined>;
  fetch?: FetchFunction;
  authProvider: AuthProvider;
  reasoningEffort?: ReasoningEffort | null;
  reasoningSummary?: ReasoningSummary | null;
};

export class ChatGPTOAuthLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = 'v1' as const;
  readonly defaultObjectGenerationMode = 'json' as const;
  readonly supportsImageUrls = true;
  readonly supportsStructuredOutputs = true;

  readonly modelId: ChatGPTOAuthModelId;
  readonly provider: string;

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

  private getInstructions(): string {
    const modelName = this.modelId.toLowerCase();
    if (modelName.startsWith('codex-') || modelName.startsWith('gpt-5-codex')) {
      return codexModelInstructions;
    }

    if (modelName.startsWith('gpt-5') && applyPatchInstructions) {
      return [baseInstructions, applyPatchInstructions].join('\n');
    }

    return baseInstructions;
  }

  private async getArgs(options: LanguageModelV1CallOptions) {
    const warnings: LanguageModelV1CallWarning[] = [];

    const { messages: convertedMessages, warnings: messageWarnings } = convertToChatGPTMessages({
      prompt: options.prompt,
      systemMessageMode: 'user',
    });

    const sanitizedWarnings = messageWarnings.filter((warning) => {
      if ('message' in warning && warning.message) {
        return warning.message !== 'System messages are converted to user messages';
      }
      return true;
    });
    warnings.push(...sanitizedWarnings);

    const chatgptMessages = [...convertedMessages];

    // Tools only come from regular mode in v1
    const mode = options.mode ?? { type: 'regular' as const };
    const { tools, warnings: toolWarnings, toolMapping } = prepareChatGPTTools({
      tools: mode.type === 'regular' ? mode.tools : undefined,
    });
    warnings.push(...toolWarnings);

    const reasoning = this.createReasoningParam();
    const include: string[] = [];
    if (reasoning) {
      include.push('reasoning.encrypted_content');
      if (reasoning.summary === 'none' || reasoning.summary === 'concise') {
        warnings.push({
          type: 'other',
          message: `Reasoning summary '${reasoning.summary}' may not be consistently supported by the ChatGPT OAuth API. If you encounter errors, try 'auto' or 'detailed' instead.`,
        });
      }
    }

    // Determine tool choice behavior: require a tool call on first turn, allow auto after tool results
    const hasToolMessages = chatgptMessages.some((m) => m.role === 'tool');

    if ((options.mode?.type ?? 'regular') === 'object-json') {
      chatgptMessages.unshift({
        role: 'user',
        content: [
          'CRITICAL: Output MUST be valid JSON only.',
          '- Do not include markdown, code fences, or commentary.',
          '- Do not include fields not requested by the schema.',
          '- The first character must be { or [ and the last must be } or ].',
        ].join('\n'),
      });
    }

    const args: ChatGPTRequest = {
      model: this.modelId,
      instructions: this.getInstructions(),
      input: chatgptMessages,
      tools,
      tool_choice: tools && tools.length > 0 ? (hasToolMessages ? 'auto' : 'required') : 'none',
      parallel_tool_calls: false,
      reasoning,
      store: false,
      stream: true,
      include,
    };

    // Warn for unsupported parameters
    if (options.temperature !== undefined) {
      warnings.push({ type: 'other', message: 'Temperature parameter is not supported by ChatGPT backend' });
    }
    if (options.topP !== undefined) {
      warnings.push({ type: 'other', message: 'Top-p parameter is not supported by ChatGPT backend' });
    }
    const hasMaxOutputTokens =
      typeof (options as Record<string, unknown>) === 'object' &&
      options !== null &&
      'maxOutputTokens' in (options as Record<string, unknown>) &&
      (options as Record<string, unknown>)['maxOutputTokens'] !== undefined;
    if (hasMaxOutputTokens || options.maxTokens !== undefined) {
      warnings.push({ type: 'other', message: 'Max tokens parameter is not supported by ChatGPT backend' });
    }

    return { args, warnings, toolMapping, mode };
  }

  async doGenerate(options: LanguageModelV1CallOptions): Promise<{
    text?: string;
    toolCalls?: LanguageModelV1FunctionToolCall[];
    finishReason: LanguageModelV1FinishReason;
    usage: { promptTokens: number; completionTokens: number };
    rawCall: { rawPrompt: unknown; rawSettings: Record<string, unknown> };
    request?: { body?: string };
    response?: { id?: string; timestamp?: Date; modelId?: string };
    warnings?: LanguageModelV1CallWarning[];
  }> {
    const { args, warnings, toolMapping, mode } = await this.getArgs(options);
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
    if (!reader) throw new Error('No response body');

    let text = '';
    const toolCallsCollected: LanguageModelV1FunctionToolCall[] = [];
    let finishReason: LanguageModelV1FinishReason = 'stop';
    let usage = { promptTokens: 0, completionTokens: 0 };

    const activeToolCalls = new Map<string, { name: string; args: string }>();
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
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const event = JSON.parse(data);
            switch (event.type) {
              case 'response.output_item.added':
                if (event.item && event.item.type === 'function_call') {
                  const id = event.item.id || `call_${Date.now()}`;
                  activeToolCalls.set(id, { name: 'pending', args: '' });
                }
                break;
              case 'response.function_call_arguments.delta':
                if (event.item_id && event.delta && activeToolCalls.has(event.item_id)) {
                  const active = activeToolCalls.get(event.item_id)!;
                  active.args += event.delta;
                }
                break;
              case 'response.output_item.done':
                if (event.item && event.item.type === 'function_call' && event.item.name) {
                  const toolCallId = event.item.id;
                  if (activeToolCalls.has(toolCallId)) {
                    const toolCall = activeToolCalls.get(toolCallId)!;
                    toolCall.name = event.item.name;
                    toolCall.args = toolCall.args || event.item.arguments || '';
                    const originalName = toolMapping.get(toolCall.name) || toolCall.name;
                    try {
                      const validated = validateToolResponse(toolCall.name, toolCall.args);
                      toolCallsCollected.push({
                        toolCallType: 'function',
                        toolCallId,
                        toolName: originalName,
                        args: JSON.stringify(validated),
                      });
                    } catch (error) {
                      toolCallsCollected.push({
                        toolCallType: 'function',
                        toolCallId,
                        toolName: originalName,
                        args: toolCall.args,
                      });
                      warnings.push({
                        type: 'other',
                        message: error instanceof Error ? error.message : 'Failed to parse tool arguments',
                      });
                    }
                    activeToolCalls.delete(toolCallId);
                  }
                }
                break;
              case 'response.output_text.delta':
                text += event.delta || '';
                break;
              case 'response.completed':
                finishReason = mapChatGPTFinishReason(event.status);
                if (event.response?.usage) {
                  usage = {
                    promptTokens: event.response.usage.input_tokens || 0,
                    completionTokens: event.response.usage.output_tokens || 0,
                  };
                }
                break;
            }
          } catch {
            // ignore
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // object-json mode: extract JSON from text
    if (mode.type === 'object-json' && text) {
      try {
        // Keep it simple: ensure it's a JSON object; if it's not, try to trim
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          const extracted = text.slice(firstBrace, lastBrace + 1);
          JSON.parse(extracted);
          text = extracted;
        }
      } catch {
        // leave as-is
      }
    }

    return {
      text: text || undefined,
      toolCalls: toolCallsCollected.length ? toolCallsCollected : undefined,
      finishReason,
      usage,
      rawCall: { rawPrompt: args.input, rawSettings: {} },
      request: { body: JSON.stringify(args) },
      response: { id: crypto.randomUUID(), timestamp: new Date(), modelId: this.modelId },
      warnings: warnings.length ? warnings : undefined,
    };
  }

  async doStream(options: LanguageModelV1CallOptions): Promise<{
    stream: ReadableStream<LanguageModelV1StreamPart>;
    rawCall: { rawPrompt: unknown; rawSettings: Record<string, unknown> };
    warnings?: LanguageModelV1CallWarning[];
  }> {
    const { args, warnings, toolMapping, mode } = await this.getArgs(options);
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
    if (!reader) throw new Error('No response body');

    const activeToolCalls = new Map<string, { name: string; args: string }>();
    let accumulatedText = '';

    const stream = new ReadableStream<LanguageModelV1StreamPart>({
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
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6);
              if (data === '[DONE]') {
                controller.close();
                return;
              }
              try {
                const event = JSON.parse(data);
                switch (event.type) {
                  case 'response.output_item.added':
                    if (event.item && event.item.type === 'function_call') {
                      const id = event.item.id || `call_${Date.now()}`;
                      activeToolCalls.set(id, { name: 'pending', args: '' });
                    }
                    break;
                  case 'response.function_call_arguments.delta':
                    if (event.item_id && event.delta && activeToolCalls.has(event.item_id)) {
                      const active = activeToolCalls.get(event.item_id)!;
                      active.args += event.delta;
                    }
                    break;
                  case 'response.output_item.done':
                    if (event.item && event.item.type === 'function_call' && event.item.name) {
                      const toolCallId = event.item.id;
                      if (activeToolCalls.has(toolCallId)) {
                        const toolCall = activeToolCalls.get(toolCallId)!;
                        toolCall.name = event.item.name;
                        toolCall.args = toolCall.args || event.item.arguments || '';
                        const originalName = toolMapping.get(toolCall.name) || toolCall.name;
                        try {
                          const validated = validateToolResponse(toolCall.name, toolCall.args);
                          controller.enqueue({
                            type: 'tool-call',
                            toolCallType: 'function',
                            toolCallId,
                            toolName: originalName,
                            args: JSON.stringify(validated),
                          });
                        } catch {
                          controller.enqueue({
                            type: 'tool-call',
                            toolCallType: 'function',
                            toolCallId,
                            toolName: originalName,
                            args: toolCall.args,
                          });
                        }
                        activeToolCalls.delete(toolCallId);
                      }
                    }
                    break;
                  case 'response.output_text.delta':
                    if (event.delta) {
                      if (mode.type === 'object-json') {
                        accumulatedText += event.delta;
                      } else {
                        controller.enqueue({ type: 'text-delta', textDelta: event.delta });
                      }
                    }
                    break;
                  case 'response.completed': {
                    if (mode.type === 'object-json' && accumulatedText) {
                      // try to extract json
                      let toEmit = accumulatedText;
                      const firstBrace = toEmit.indexOf('{');
                      const lastBrace = toEmit.lastIndexOf('}');
                      if (firstBrace !== -1 && lastBrace !== -1) {
                        toEmit = toEmit.slice(firstBrace, lastBrace + 1);
                      }
                      controller.enqueue({ type: 'text-delta', textDelta: toEmit });
                    }
                    const finishReason = mapChatGPTFinishReason(event.status);
                    controller.enqueue({
                      type: 'finish',
                      finishReason,
                      usage: {
                        promptTokens: event.response?.usage?.input_tokens || 0,
                        completionTokens: event.response?.usage?.output_tokens || 0,
                      },
                    });
                    break;
                  }
                }
              } catch {
                // ignore parse error
              }
            }
          }
        } catch (error) {
          controller.error(error);
        } finally {
          reader.releaseLock();
        }
      },
    });

    return {
      stream,
      rawCall: { rawPrompt: args.input, rawSettings: {} },
      warnings: warnings.length ? warnings : undefined,
    };
  }
}
