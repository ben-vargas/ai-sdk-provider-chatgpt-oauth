# ChatGPT OAuth Example

A complete, standalone OAuth 2.0 implementation for ChatGPT that works without Codex CLI. This example demonstrates how to implement the full OAuth flow with PKCE, token management, and integration with the `ai-sdk-provider-chatgpt-oauth` package.

## 🎯 Purpose

This example provides:
- **Full OAuth 2.0 PKCE flow** implementation
- **Token persistence** and automatic refresh
- **No dependency on Codex CLI** - completely standalone
- **Ready-to-use integration** with the AI SDK provider
- **Production-ready patterns** for your own applications

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd oauth-example
npm install
```

### 2. Build the Main Package

```bash
# From the oauth-example directory
cd .. && npm run build && cd oauth-example
```

### 3. Authenticate

```bash
npm run login
```

This will:
1. Start a local callback server on port 1455
2. Open your browser to ChatGPT's OAuth authorization page
3. After you authorize, capture the callback and exchange it for tokens
4. Save the tokens locally for future use

### 4. Run Examples

```bash
# Test the integration
npm run test

# Run the example app
npm run example
```

## 📁 Project Structure

```
oauth-example/
├── src/
│   ├── oauth-client.ts      # OAuth 2.0 client with PKCE
│   ├── oauth-server.ts      # Local callback server
│   ├── token-manager.ts     # Token storage and refresh
│   ├── auth-cli.ts         # CLI for login/logout/status
│   └── example-app.ts      # Example usage with AI SDK
├── scripts/
│   └── test.ts             # Integration test script
├── package.json
├── tsconfig.json
└── README.md
```

## 🔐 How It Works

### OAuth Flow

1. **Authorization Request**: Generate PKCE challenge and state
2. **Browser Authorization**: User authorizes in ChatGPT web interface
3. **Callback Capture**: Local server captures the authorization code
4. **Token Exchange**: Exchange code for access/refresh tokens
5. **Token Storage**: Save tokens securely for future use
6. **Automatic Refresh**: Tokens refresh automatically when expired

### PKCE Security

This implementation uses PKCE (Proof Key for Code Exchange) to prevent authorization code interception:
- Generates cryptographically random verifier
- Creates SHA-256 challenge from verifier
- Validates state parameter to prevent CSRF attacks

### Token Management

- Tokens stored in `oauth-tokens.json` (configurable)
- Automatic refresh when tokens expire
- 5-minute buffer before expiry for proactive refresh
- Account ID extraction from JWT tokens

## 📘 API Usage

### Using with AI SDK Provider

```typescript
import { generateText } from 'ai';
import { createChatGPTOAuth } from 'ai-sdk-provider-chatgpt-oauth';
import { TokenManager } from './token-manager.js';

// Get OAuth credentials
const tokenManager = new TokenManager();
const credentials = await tokenManager.getCredentials();

// Create provider with OAuth tokens
const provider = createChatGPTOAuth({
  credentials,
  autoRefresh: true,
});

// Use with AI SDK
const result = await generateText({
  model: provider('gpt-5'),
  prompt: 'Hello, OAuth world!',
});
```

### Direct OAuth Client Usage

```typescript
import { OAuthClient } from './oauth-client.js';
import { OAuthCallbackServer } from './oauth-server.js';

// Create client
const client = new OAuthClient();

// Start OAuth flow
const authRequest = await client.createAuthorizationRequest();

// Start callback server
const server = new OAuthCallbackServer();
const code = await server.waitForCallback(authRequest.state);

// Exchange for tokens
const tokens = await client.exchangeCodeForTokens(code, authRequest.verifier);
```

### Token Manager

```typescript
import { TokenManager } from './token-manager.js';

const manager = new TokenManager();

// Save tokens
manager.saveTokens(tokenResponse);

// Get valid token (auto-refreshes if needed)
const token = await manager.getValidToken();

// Check status
const status = manager.getStatus();
if (status.isAuthenticated) {
  console.log(`Expires in: ${status.expiresIn}`);
}

// Clear tokens (logout)
manager.clearTokens();
```

## 🛠️ CLI Commands

### Login
```bash
npm run login
# or
npx tsx src/auth-cli.ts login
```

The login command automatically detects if you're in a headless/SSH environment and offers two options:
1. **Start local server** - Run a callback server on port 1455
2. **Paste callback URL** - Manually paste the redirect URL after authorizing

### Logout
```bash
npm run logout
# or
npx tsx src/auth-cli.ts logout
```

### Check Status
```bash
npm run status
# or
npx tsx src/auth-cli.ts status
```

## 🖥️ Headless/SSH Support

The OAuth example fully supports headless and SSH environments. When running `npm run login` over SSH or without a display:

### Option 1: Manual URL Paste
1. The CLI will show you the authorization URL
2. Open the URL in any browser (on any machine)
3. Complete the authorization
4. Copy the ENTIRE redirect URL from your browser
5. Paste it back into the CLI when prompted

### Option 2: Local Server with Port Forwarding
1. Use SSH port forwarding: `ssh -L 1455:localhost:1455 user@server`
2. The CLI starts a callback server on port 1455
3. Open the authorization URL in your local browser
4. The callback will be forwarded through SSH to the server

### Option 3: curl Callback
1. Start the local server option
2. Complete authorization in any browser
3. Use curl to send the callback:
```bash
curl 'http://localhost:1455/auth/callback?code=AUTH_CODE&state=STATE'
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file (optional - defaults are provided):

```env
# OAuth Configuration
OAUTH_CLIENT_ID=app_EMoamEEZ73f0CkXaXp7hrann
OAUTH_ISSUER=https://auth.openai.com
OAUTH_REDIRECT_PORT=1455

# Token Storage
TOKEN_STORAGE_PATH=./oauth-tokens.json

# Debug Mode
DEBUG=false
```

### Custom Token Storage

```typescript
// Use custom storage path
const tokenManager = new TokenManager('/path/to/tokens.json');
```

## 🔧 Integration Guide

### Adding to Your Project

1. **Copy the OAuth implementation files** to your project:
   - `oauth-client.ts` - OAuth 2.0 client
   - `oauth-server.ts` - Callback server
   - `token-manager.ts` - Token management

2. **Install required dependencies**:
```bash
npm install open dotenv
```

3. **Implement authentication flow**:
```typescript
// See auth-cli.ts for complete example
const client = new OAuthClient();
const authRequest = await client.createAuthorizationRequest();
// ... implement flow
```

4. **Use with AI SDK provider**:
```typescript
const credentials = await tokenManager.getCredentials();
const provider = createChatGPTOAuth({ credentials });
```

## 🚨 Important Notes

### Security Considerations

- **Never commit tokens**: The `oauth-tokens.json` file contains sensitive credentials
- **Use HTTPS in production**: The callback URL uses localhost for development
- **Validate state parameter**: Prevents CSRF attacks
- **Store tokens securely**: Consider encryption for production use

### Token Expiration

- Access tokens expire after ~1 hour
- Refresh tokens are long-lived (28+ days)
- Automatic refresh happens when:
  - Token is expired
  - Token expires within 5 minutes
  - `getValidToken()` is called

### Browser Authentication

- Requires ChatGPT Plus/Pro/Teams subscription
- Must be logged into ChatGPT in your browser
- Browser will open automatically during login
- Callback server runs on `localhost:1455`

## 🐛 Troubleshooting

### "Port already in use"
Another process is using port 1455. Either:
- Stop the other process
- Change `OAUTH_REDIRECT_PORT` in `.env`

### "State mismatch"
The OAuth flow was interrupted or tampered with. Try logging in again.

### "Token refresh failed"
Your refresh token may have expired (after 28 days). Run `npm run login` again.

### "Model not supported"
Only `gpt-5`, `gpt-5-codex`, and `codex-mini-latest` work with OAuth. Other models require API keys.

## 📚 Additional Resources

- [OAuth 2.0 RFC](https://tools.ietf.org/html/rfc6749)
- [PKCE RFC](https://tools.ietf.org/html/rfc7636)
- [Vercel AI SDK](https://sdk.vercel.ai)
- [Main Package README](../README.md)

## 📄 License

This example is part of the `ai-sdk-provider-chatgpt-oauth` package and follows the same license.
