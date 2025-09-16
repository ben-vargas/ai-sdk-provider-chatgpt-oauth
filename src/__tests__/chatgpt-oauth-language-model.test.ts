import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import type { LanguageModelV2CallWarning } from '@ai-sdk/provider';
import { ChatGPTOAuthLanguageModel } from '../chatgpt-oauth-language-model';
import type { AuthProvider } from '../auth';
import type { ChatGPTRequest } from '../chatgpt-oauth-settings';

class MockAuthProvider implements AuthProvider {
  async getCredentials() {
    return {
      accessToken: 'test-token',
      accountId: 'test-account',
    };
  }
}

const prompt = [
  {
    role: 'user' as const,
    content: [
      {
        type: 'text' as const,
        text: 'Say hello to the new model.',
      },
    ],
  },
];

const baseInstructionsPath = join(__dirname, '..', 'codex-instructions.txt');
const codexInstructionsPath = join(__dirname, '..', 'codex-gpt5-codex-instructions.txt');
const applyPatchInstructionsPath = join(__dirname, '..', 'codex-apply-patch-instructions.txt');

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n');
}

const baseInstructions = normalizeLineEndings(readFileSync(baseInstructionsPath, 'utf8'));
const codexInstructions = normalizeLineEndings(readFileSync(codexInstructionsPath, 'utf8'));
const applyPatchInstructions = normalizeLineEndings(readFileSync(applyPatchInstructionsPath, 'utf8'));

const BASE_PROMPT_HASH = '8441530b38aba0ba999aa3657b9906df803c92f4ed78e59ecc2895ac010a844d';
const GPT5_CODEX_PROMPT_HASH = 'beea8f974b13e5c241320afd71706b162e2006ef0e2f5b2bdcc7891743abbdd1';
const APPLY_PATCH_PROMPT_HASH = '061ad07965f437292a604be2518a6fe445c19324946f9e827fffa0a3e8695d94';
const GPT5_PROMPT_HASH = 'eefaf14fa9d709fe650181e6af8bdc781f9646bcc7ce36ccf99980fa781bcc86';

const baseHash = createHash('sha256').update(baseInstructions).digest('hex');
const codexHash = createHash('sha256').update(codexInstructions).digest('hex');
const applyPatchHash = createHash('sha256').update(applyPatchInstructions).digest('hex');

if (baseHash !== BASE_PROMPT_HASH) {
  throw new Error('Base Codex instructions are out of sync with Codex CLI prompt.md');
}

if (codexHash !== GPT5_CODEX_PROMPT_HASH) {
  throw new Error('GPT-5 Codex instructions are out of sync with Codex CLI gpt_5_codex_prompt.md');
}

if (applyPatchHash !== APPLY_PATCH_PROMPT_HASH) {
  throw new Error('Apply patch instructions are out of sync with Codex CLI apply_patch_tool_instructions.md');
}

function createModel(modelId: string) {
  return new ChatGPTOAuthLanguageModel(modelId, {
    provider: 'chatgpt-oauth',
    baseURL: 'https://chatgpt.com/backend-api',
    headers: {},
    authProvider: new MockAuthProvider(),
  });
}

describe('ChatGPTOAuthLanguageModel', () => {
  it('uses model-specific instructions for GPT-5 variants and codex models', async () => {
    const cases = [
      {
        modelId: 'gpt-5',
        expectedInstructions: [baseInstructions, applyPatchInstructions].join('\n'),
        expectedHash: GPT5_PROMPT_HASH,
      },
      {
        modelId: 'gpt-5-codex',
        expectedInstructions: codexInstructions,
        expectedHash: GPT5_CODEX_PROMPT_HASH,
      },
      {
        modelId: 'codex-mini-latest',
        expectedInstructions: codexInstructions,
        expectedHash: GPT5_CODEX_PROMPT_HASH,
      },
    ] as const;

    for (const testCase of cases) {
      const model = createModel(testCase.modelId);
      const exposedModel = model as unknown as ChatGPTOAuthLanguageModel & {
        getArgs: (options: { prompt: typeof prompt }) => Promise<{
          args: ChatGPTRequest;
          warnings: LanguageModelV2CallWarning[];
          toolMapping: Map<string, string>;
        }>;
      };
      const args = await exposedModel.getArgs({ prompt });

      expect(args.args.model).toBe(testCase.modelId);
      expect(args.args.instructions).toBe(testCase.expectedInstructions);

      const hash = createHash('sha256').update(args.args.instructions).digest('hex');
      expect(hash).toBe(testCase.expectedHash);
    }
  });

  it('treats gpt-5-codex as a reasoning-capable model', () => {
    const model = createModel('gpt-5-codex');
    const exposedModel = model as unknown as ChatGPTOAuthLanguageModel & {
      supportsReasoning: () => boolean;
    };
    const supportsReasoning = exposedModel.supportsReasoning();

    expect(supportsReasoning).toBe(true);
  });
});
