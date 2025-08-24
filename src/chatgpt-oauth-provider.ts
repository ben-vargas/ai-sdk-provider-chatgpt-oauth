import type { LanguageModelV1, ProviderV1 } from '@ai-sdk/provider';
import { NoSuchModelError } from '@ai-sdk/provider';
import type { FetchFunction } from '@ai-sdk/provider-utils';
import { ChatGPTOAuthLanguageModel } from './chatgpt-oauth-language-model';
import type {
  ChatGPTOAuthModelId,
  ChatGPTOAuthCredentials,
  ReasoningEffort,
  ReasoningSummary,
} from './chatgpt-oauth-settings';
import { AuthProvider, DefaultAuthProvider } from './auth';

export interface ChatGPTOAuthProvider extends ProviderV1 {
  (modelId: ChatGPTOAuthModelId, options?: ChatGPTOAuthModelOptions): LanguageModelV1;
  languageModel(modelId: ChatGPTOAuthModelId, options?: ChatGPTOAuthModelOptions): LanguageModelV1;
  chat(modelId: ChatGPTOAuthModelId, options?: ChatGPTOAuthModelOptions): LanguageModelV1;
}

export interface ChatGPTOAuthModelOptions {
  reasoningEffort?: ReasoningEffort | null; // null to explicitly disable
  reasoningSummary?: ReasoningSummary | null; // null to explicitly disable
}

export interface ChatGPTOAuthProviderSettings {
  baseURL?: string;
  headers?: Record<string, string>;
  fetch?: FetchFunction;

  credentials?: ChatGPTOAuthCredentials;
  credentialsPath?: string;
  authProvider?: AuthProvider;
  autoRefresh?: boolean;

  // Default reasoning settings (defaults to 'medium' and 'auto' like Codex CLI)
  reasoningEffort?: ReasoningEffort | null; // null to disable, undefined for default
  reasoningSummary?: ReasoningSummary | null; // null to disable, undefined for default
}

export function createChatGPTOAuth(
  options: ChatGPTOAuthProviderSettings = {}
): ChatGPTOAuthProvider {
  const baseURL = options.baseURL ?? 'https://chatgpt.com/backend-api';

  const authProvider =
    options.authProvider ??
    new DefaultAuthProvider({
      credentials: options.credentials,
      credentialsPath: options.credentialsPath,
      autoRefresh: options.autoRefresh,
    });

  const createModel = (
    modelId: ChatGPTOAuthModelId,
    modelOptions?: ChatGPTOAuthModelOptions
  ): LanguageModelV1 => {
    return new ChatGPTOAuthLanguageModel(modelId, {
      provider: 'chatgpt-oauth',
      baseURL,
      headers: options.headers ?? {},
      fetch: options.fetch,
      authProvider,
      reasoningEffort: modelOptions?.reasoningEffort ?? options.reasoningEffort,
      reasoningSummary: modelOptions?.reasoningSummary ?? options.reasoningSummary,
    });
  };

  const provider = Object.assign(
    (modelId: ChatGPTOAuthModelId, modelOptions?: ChatGPTOAuthModelOptions) =>
      createModel(modelId, modelOptions),
    {
      languageModel: (modelId: ChatGPTOAuthModelId, modelOptions?: ChatGPTOAuthModelOptions) =>
        createModel(modelId, modelOptions),
      chat: (modelId: ChatGPTOAuthModelId, modelOptions?: ChatGPTOAuthModelOptions) =>
        createModel(modelId, modelOptions),
    }
  ) as ChatGPTOAuthProvider;

  // add textEmbeddingModel to satisfy ProviderV1 shape; not supported
  provider.textEmbeddingModel = (modelId: string) => {
    throw new NoSuchModelError({ modelId, modelType: 'textEmbeddingModel' });
  };

  return provider;
}

export const chatgptOAuth = createChatGPTOAuth;
