export type ChatGPTOAuthModelId = 'gpt-5' | 'codex-mini-latest' | (string & {});

export const chatGPTOAuthModels = {
  // Only models that actually work with ChatGPT OAuth API
  'gpt-5': {
    contextWindow: 200000,
    maxTokens: 100000,
    supportsReasoning: true,
  },
  'codex-mini-latest': {
    contextWindow: 200000,
    maxTokens: 100000,
    supportsReasoning: true,
    localShellTool: true,
  },
} as const;

export interface ChatGPTMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_calls?: ChatGPTToolCall[];
  tool_call_id?: string;
}

export interface ChatGPTToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatGPTTool {
  type: 'function';
  name: string;
  description: string;
  strict: boolean;
  parameters: Record<string, unknown>;
}

export type ChatGPTToolChoice =
  | 'none'
  | 'auto'
  | 'required'
  | { type: 'function'; function: { name: string } };

// Reasoning types based on OpenAI's reasoning API
export type ReasoningEffort = 'low' | 'medium' | 'high';
export type ReasoningSummary = 'auto' | 'none' | 'concise' | 'detailed';

export interface ChatGPTReasoning {
  effort: ReasoningEffort;
  summary?: ReasoningSummary;
}

export interface ChatGPTRequest {
  model: string;
  instructions: string;
  input: ChatGPTMessage[];
  tools?: ChatGPTTool[];
  tool_choice?: ChatGPTToolChoice;
  parallel_tool_calls: boolean;
  reasoning: ChatGPTReasoning | null;
  store: boolean;
  stream: boolean;
  include: string[];
}

export interface ChatGPTStreamEvent {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices?: Array<{
    index: number;
    delta?: {
      role?: string;
      content?: string | null;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        type?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export interface ChatGPTResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
      tool_calls?: ChatGPTToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatGPTOAuthCredentials {
  accessToken: string;
  refreshToken?: string;
  accountId: string;
  expiresAt?: number;
}
