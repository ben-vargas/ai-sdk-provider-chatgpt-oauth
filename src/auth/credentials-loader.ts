import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { ChatGPTOAuthCredentials } from '../chatgpt-oauth-settings';
import { extractAccountIdFromToken } from './index';

interface CodexAuthJson {
  openai_api_key?: string;
  tokens?: {
    id_token: string;
    access_token: string;
    refresh_token: string;
    account_id?: string;
  };
  last_refresh?: string;
}

export function loadCredentialsFromFile(filePath?: string): ChatGPTOAuthCredentials {
  const path = filePath || join(homedir(), '.codex', 'auth.json');

  try {
    const content = readFileSync(path, 'utf-8');
    const auth: CodexAuthJson = JSON.parse(content);

    if (!auth.tokens) {
      throw new Error('No OAuth tokens found in auth.json');
    }

    const { access_token, refresh_token, id_token, account_id } = auth.tokens;

    if (!access_token) {
      throw new Error('No access token found in auth.json');
    }

    const accountId = account_id || extractAccountIdFromToken(id_token);

    if (!accountId) {
      throw new Error('Could not determine account ID from auth.json');
    }

    let expiresAt: number | undefined;
    if (auth.last_refresh) {
      const lastRefresh = new Date(auth.last_refresh).getTime();
      expiresAt = lastRefresh + 28 * 24 * 60 * 60 * 1000;
    }

    return {
      accessToken: access_token,
      refreshToken: refresh_token,
      accountId,
      expiresAt,
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`Auth file not found at ${path}`);
    }
    throw error;
  }
}
