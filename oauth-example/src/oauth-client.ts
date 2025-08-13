import { createHash, randomBytes } from 'crypto';

export interface OAuthConfig {
  clientId?: string;
  issuer?: string;
  redirectPort?: number;
  scope?: string;
}

export interface PKCEPair {
  verifier: string;
  challenge: string;
}

export interface AuthorizationRequest {
  url: string;
  verifier: string;
  state: string;
  port: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  id_token?: string;
}

export class OAuthClient {
  private readonly clientId: string;
  private readonly issuer: string;
  private readonly redirectPort: number;
  private readonly redirectUri: string;
  private readonly scope: string;

  constructor(config: OAuthConfig = {}) {
    this.clientId = config.clientId || 'app_EMoamEEZ73f0CkXaXp7hrann';
    this.issuer = config.issuer || 'https://auth.openai.com';
    this.redirectPort = config.redirectPort || 1455;
    this.redirectUri = `http://localhost:${this.redirectPort}/auth/callback`;
    this.scope = config.scope || 'openid profile email offline_access';
  }

  /**
   * Generate a random string for state or verifier
   */
  private generateRandomString(length: number): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Generate PKCE verifier and challenge
   */
  private async generatePKCE(): Promise<PKCEPair> {
    const verifier = this.generateRandomString(32);
    const challenge = createHash('sha256')
      .update(verifier)
      .digest('base64url');
    
    return { verifier, challenge };
  }

  /**
   * Create authorization URL with PKCE
   */
  async createAuthorizationRequest(): Promise<AuthorizationRequest> {
    const pkce = await this.generatePKCE();
    const state = this.generateRandomString(16);

    const url = new URL(`${this.issuer}/oauth/authorize`);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('scope', this.scope);
    url.searchParams.set('code_challenge', pkce.challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('state', state);
    
    // ChatGPT-specific parameters
    url.searchParams.set('id_token_add_organizations', 'true');
    url.searchParams.set('codex_cli_simplified_flow', 'true');

    return {
      url: url.toString(),
      verifier: pkce.verifier,
      state,
      port: this.redirectPort,
    };
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, verifier: string): Promise<TokenResponse> {
    const response = await fetch(`${this.issuer}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        code,
        code_verifier: verifier,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    return response.json();
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    const response = await fetch(`${this.issuer}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed: ${errorText}`);
    }

    return response.json();
  }

  /**
   * Extract account ID from JWT access token
   */
  extractAccountId(accessToken: string): string {
    const parts = accessToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT token format');
    }

    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      const authData = payload['https://api.openai.com/auth'];
      
      if (!authData || !authData.chatgpt_account_id) {
        throw new Error('ChatGPT account ID not found in token');
      }

      return authData.chatgpt_account_id;
    } catch (error) {
      throw new Error(`Failed to extract account ID: ${error}`);
    }
  }
}