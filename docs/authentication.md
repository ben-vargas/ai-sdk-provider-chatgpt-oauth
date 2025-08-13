# Authentication Guide

This guide covers all authentication options for the ChatGPT OAuth provider.

## Authentication Methods

### Option 1: Use Codex CLI (Recommended for Quick Start)

Install and authenticate with OpenAI's Codex CLI:

```bash
npm install -g @openai/codex
codex login
```

This will create OAuth credentials at `~/.codex/auth.json` that the provider can use automatically.

### Option 2: Implement Your Own OAuth Flow

See the [complete OAuth implementation example](../oauth-example/) that demonstrates how to implement the full OAuth flow without Codex CLI, including:
- PKCE (Proof Key for Code Exchange) flow
- Token refresh handling
- Secure credential storage
- Working CLI implementation

### Option 3: Environment Variables

Set the following environment variables:

```bash
export CHATGPT_OAUTH_ACCESS_TOKEN="your-access-token"
export CHATGPT_OAUTH_ACCOUNT_ID="your-account-id"
export CHATGPT_OAUTH_REFRESH_TOKEN="your-refresh-token" # Optional, for auto-refresh
```

### Option 4: Direct Credentials

Pass credentials directly to the provider:

```typescript
import { createChatGPTOAuth } from 'ai-sdk-provider-chatgpt-oauth';

const provider = createChatGPTOAuth({
  credentials: {
    accessToken: 'your-access-token',
    accountId: 'your-account-id',
    refreshToken: 'your-refresh-token', // Optional
  },
});
```

### Option 5: Custom Authentication Provider

Implement your own authentication logic:

```typescript
import { createChatGPTOAuth, AuthProvider } from 'ai-sdk-provider-chatgpt-oauth';

class CustomAuthProvider implements AuthProvider {
  async getCredentials() {
    // Your custom logic to get credentials
    // Could read from a database, key vault, etc.
    return {
      accessToken: 'token',
      accountId: 'account-id',
    };
  }
  
  async refreshCredentials(refreshToken: string) {
    // Optional: Implement token refresh
    const response = await fetch('https://chatgpt.com/oauth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const data = await response.json();
    return {
      accessToken: data.access_token,
      accountId: data.account_id,
      refreshToken: data.refresh_token,
    };
  }
}

const provider = createChatGPTOAuth({
  authProvider: new CustomAuthProvider(),
});
```

## Token Refresh

The provider automatically refreshes expired tokens when:

1. A refresh token is available
2. `autoRefresh` is enabled (default: true)
3. The access token is within 60 seconds of expiring

### Enable Auto-Refresh

```typescript
const provider = createChatGPTOAuth({
  autoRefresh: true, // Default
});
```

### Manual Token Refresh

If you prefer to handle token refresh manually:

```typescript
const provider = createChatGPTOAuth({
  autoRefresh: false,
  credentials: {
    accessToken: 'current-token',
    accountId: 'account-id',
    refreshToken: 'refresh-token',
  },
});

// Handle token expiration in your code
try {
  const result = await generateText({ model: provider('gpt-5'), prompt: 'Hello' });
} catch (error) {
  if (error.message.includes('401')) {
    // Refresh token and retry
    const newToken = await refreshMyToken();
    // Update provider with new credentials
  }
}
```

## Credential Sources Priority

The provider checks for credentials in this order:

1. Directly provided credentials
2. Custom auth provider
3. Environment variables
4. Credentials file (default: `~/.codex/auth.json`)

## Credential File Format

The credentials file (e.g., `~/.codex/auth.json`) should have this format:

```json
{
  "access_token": "your-access-token",
  "account_id": "your-account-id",
  "refresh_token": "your-refresh-token",
  "expires_at": 1234567890
}
```

## Custom Credential File Path

To use a different credential file location:

```typescript
const provider = createChatGPTOAuth({
  credentialsPath: '/path/to/your/credentials.json',
});
```

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** for production deployments
3. **Implement token refresh** to minimize exposure
4. **Store credentials securely** (encrypted, key vault, etc.)
5. **Rotate tokens regularly** when possible
6. **Use minimal scopes** for your OAuth tokens

## Troubleshooting

### No credentials found

Ensure you have either:
- Authenticated with Codex CLI: `codex login`
- Set environment variables
- Passed credentials directly
- Implemented a custom auth provider

### Token expired

Enable `autoRefresh` or provide a refresh token:

```typescript
const provider = createChatGPTOAuth({
  autoRefresh: true,
});
```

### Invalid credentials

Check that your credentials are valid:
- Access token is not expired
- Account ID matches the token
- Refresh token is valid (if using auto-refresh)

### Rate limiting

The provider includes automatic retry logic for rate limits. You can also implement custom retry logic in your application.

## See Also

- [OAuth Implementation Example](../oauth-example/)
- [Check Authentication Example](../examples/check-auth.ts)