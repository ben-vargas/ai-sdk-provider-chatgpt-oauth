import { ChatGPTOAuthCredentials } from '../chatgpt-oauth-settings';
import { loadCredentialsFromFile } from './credentials-loader';
import { refreshAccessToken } from './token-refresh';

export interface AuthProvider {
  getCredentials(): Promise<ChatGPTOAuthCredentials>;
}

export class DefaultAuthProvider implements AuthProvider {
  private credentials?: ChatGPTOAuthCredentials;
  private refreshPromise?: Promise<ChatGPTOAuthCredentials>;

  constructor(
    private options: {
      credentials?: ChatGPTOAuthCredentials;
      credentialsPath?: string;
      autoRefresh?: boolean;
    } = {}
  ) {
    this.credentials = options.credentials;
  }

  async getCredentials(): Promise<ChatGPTOAuthCredentials> {
    if (!this.credentials) {
      this.credentials = await this.loadCredentials();
    }

    if (this.options.autoRefresh !== false && this.shouldRefresh()) {
      if (!this.refreshPromise) {
        this.refreshPromise = this.refreshToken();
      }
      this.credentials = await this.refreshPromise;
      this.refreshPromise = undefined;
    }

    return this.credentials;
  }

  private async loadCredentials(): Promise<ChatGPTOAuthCredentials> {
    if (this.options.credentials) {
      return this.options.credentials;
    }

    const envToken = process.env.CHATGPT_OAUTH_ACCESS_TOKEN;
    const envAccountId = process.env.CHATGPT_OAUTH_ACCOUNT_ID;

    if (envToken && envAccountId) {
      return {
        accessToken: envToken,
        accountId: envAccountId,
        refreshToken: process.env.CHATGPT_OAUTH_REFRESH_TOKEN,
      };
    }

    if (this.options.credentialsPath) {
      return loadCredentialsFromFile(this.options.credentialsPath);
    }

    try {
      return loadCredentialsFromFile();
    } catch {
      throw new Error(
        'No ChatGPT OAuth credentials found. Please provide credentials directly, ' +
          'set environment variables (CHATGPT_OAUTH_ACCESS_TOKEN, CHATGPT_OAUTH_ACCOUNT_ID), ' +
          'or ensure ~/.codex/auth.json exists with valid credentials.'
      );
    }
  }

  private shouldRefresh(): boolean {
    if (!this.credentials?.expiresAt) {
      return false;
    }

    const now = Date.now();
    const expiresIn = this.credentials.expiresAt - now;

    return expiresIn < 60000;
  }

  private async refreshToken(): Promise<ChatGPTOAuthCredentials> {
    if (!this.credentials?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const newCredentials = await refreshAccessToken(
        this.credentials.refreshToken,
        this.credentials.accountId
      );

      return newCredentials;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      throw new Error('Failed to refresh ChatGPT OAuth token');
    }
  }
}

export function extractAccountIdFromToken(idToken: string): string {
  try {
    const payload = idToken.split('.')[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());

    return decoded['https://chatgpt.com/account_id'] || decoded.account_id || decoded.sub || '';
  } catch (error) {
    console.error('Failed to extract account ID from token:', error);
    return '';
  }
}
