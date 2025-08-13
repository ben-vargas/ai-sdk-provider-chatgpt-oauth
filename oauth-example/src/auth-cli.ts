#!/usr/bin/env node

import { OAuthClient } from './oauth-client.js';
import { OAuthCallbackServer } from './oauth-server.js';
import { TokenManager } from './token-manager.js';
import open from 'open';
import { config } from 'dotenv';
import readline from 'readline';

// Load environment variables
config();

const command = process.argv[2];

// Helper to create readline interface for prompts
function createPrompt(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

// Helper to ask a question
function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Helper to select from options
async function select(question: string, options: { label: string; value: string; hint?: string }[]): Promise<string> {
  console.log(`\n${question}`);
  options.forEach((opt, i) => {
    const hint = opt.hint ? ` (${opt.hint})` : '';
    console.log(`  ${i + 1}. ${opt.label}${hint}`);
  });
  
  const rl = createPrompt();
  while (true) {
    const answer = await ask(rl, '\nEnter your choice (number): ');
    const choice = parseInt(answer);
    if (choice >= 1 && choice <= options.length) {
      rl.close();
      return options[choice - 1].value;
    }
    console.log('Invalid choice. Please enter a number between 1 and', options.length);
  }
}

// Check if running in headless environment
function isHeadless(): boolean {
  // Check for common headless environment indicators
  const isSSH = process.env.SSH_CLIENT || process.env.SSH_TTY;
  const noDisplay = !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY;
  const isCI = process.env.CI === 'true';
  
  return !!(isSSH || (noDisplay && process.platform !== 'darwin') || isCI);
}

async function login() {
  console.log('🚀 Starting ChatGPT OAuth login flow...\n');
  
  const client = new OAuthClient();
  const tokenManager = new TokenManager();

  try {
    // Check if already authenticated
    const existingStatus = tokenManager.getStatus();
    if (existingStatus?.isAuthenticated) {
      console.log(`⚠️  Already authenticated (expires in ${existingStatus.expiresIn})`);
      console.log(`   Account ID: ${existingStatus.accountId}`);
      console.log('\n   Run "npm run logout" to clear tokens and login again.\n');
      return;
    }

    // Create authorization request
    const authRequest = await client.createAuthorizationRequest();
    console.log(`📋 State: ${authRequest.state}`);
    console.log(`🔑 PKCE Verifier: ${authRequest.verifier.substring(0, 8)}...`);
    console.log(`🌐 Authorization URL generated\n`);

    // Detect if we're in a headless environment
    const headless = isHeadless();
    let browserOpened = false;
    
    if (!headless) {
      // Try to open browser
      console.log('🌐 Opening browser for authorization...');
      try {
        await open(authRequest.url);
        browserOpened = true;
        console.log('✅ Browser opened successfully\n');
      } catch (error) {
        console.log('⚠️  Failed to open browser automatically\n');
      }
    } else {
      console.log('🖥️  Detected headless/SSH environment\n');
    }

    // If browser didn't open, show URL and offer options
    if (!browserOpened) {
      console.log('📋 Please open this URL in your browser:');
      console.log('━'.repeat(50));
      console.log(authRequest.url);
      console.log('━'.repeat(50));
      console.log();
      
      // Offer choice between server callback or manual paste
      const callbackMethod = await select(
        'How would you like to complete authorization?',
        [
          {
            label: 'Start local server',
            value: 'server',
            hint: 'requires port 1455 accessible'
          },
          {
            label: 'Paste the callback URL manually',
            value: 'manual',
            hint: 'copy URL after authorization'
          }
        ]
      );
      
      if (callbackMethod === 'manual') {
        // Manual URL paste method
        console.log('\n📋 Instructions:');
        console.log('1. Complete authorization in your browser');
        console.log('2. When redirected, copy the ENTIRE URL from your browser');
        console.log('3. The URL should look like:');
        console.log(`   http://localhost:${authRequest.port}/auth/callback?code=...&state=...\n`);
        
        const rl = createPrompt();
        const callbackUrl = await ask(rl, 'Paste the full callback URL here: ');
        rl.close();
        
        try {
          // Parse the callback URL
          const parsedUrl = new URL(callbackUrl.replace('localhost', '127.0.0.1'));
          const code = parsedUrl.searchParams.get('code');
          const returnedState = parsedUrl.searchParams.get('state');
          
          // Validate state
          if (returnedState !== authRequest.state) {
            console.error('\n❌ State mismatch - possible security issue');
            console.error('   Please try logging in again.');
            process.exit(1);
          }
          
          if (!code) {
            console.error('\n❌ No authorization code found in URL');
            console.error('   Make sure you copied the complete URL.');
            process.exit(1);
          }
          
          console.log('\n✅ Authorization code received!');
          
          // Exchange code for tokens
          console.log('🔄 Exchanging code for tokens...');
          const tokens = await client.exchangeCodeForTokens(code, authRequest.verifier);
          
          // Save tokens
          tokenManager.saveTokens(tokens);
          
          // Get account info
          const accountId = client.extractAccountId(tokens.access_token);
          const expiresIn = Math.floor(tokens.expires_in / 3600);
          
          console.log('\n🎉 Login successful!');
          console.log(`   Account ID: ${accountId}`);
          console.log(`   Token expires in: ${expiresIn} hours`);
          console.log(`   Refresh token: ${tokens.refresh_token ? 'Yes' : 'No'}`);
          console.log('\n✅ You can now use the ChatGPT OAuth provider!\n');
          
        } catch (error) {
          console.error('\n❌ Failed to process callback URL:', error);
          console.error('   Please make sure you copied the complete URL.');
          process.exit(1);
        }
        
        return;
      }
      
      // Server callback method
      console.log(`\n🔐 Starting callback server on port ${authRequest.port}...`);
      console.log(`   Callback URL: http://localhost:${authRequest.port}/auth/callback`);
      
      if (headless) {
        console.log('\n💡 Tips for headless/SSH environments:');
        console.log('   - Use SSH port forwarding: ssh -L 1455:localhost:1455 user@server');
        console.log('   - Or use curl after authorizing:');
        console.log(`     curl 'http://localhost:${authRequest.port}/auth/callback?code=CODE&state=${authRequest.state}'`);
      }
    }

    // Start callback server (for both browser-opened and server-selected cases)
    if (browserOpened || true) { // Always start server unless manual mode was selected above
      const server = new OAuthCallbackServer(authRequest.port);
      console.log('\n⏳ Waiting for authorization callback...');
      console.log('   (This will timeout in 5 minutes)\n');

      // Wait for callback with authorization code
      const code = await server.waitForCallback(authRequest.state, 300000);
      console.log('\n✅ Authorization code received!');

      // Exchange code for tokens
      console.log('🔄 Exchanging code for tokens...');
      const tokens = await client.exchangeCodeForTokens(code, authRequest.verifier);
      
      // Save tokens
      tokenManager.saveTokens(tokens);
      
      // Get account info
      const accountId = client.extractAccountId(tokens.access_token);
      const expiresIn = Math.floor(tokens.expires_in / 3600);
      
      console.log('\n🎉 Login successful!');
      console.log(`   Account ID: ${accountId}`);
      console.log(`   Token expires in: ${expiresIn} hours`);
      console.log(`   Refresh token: ${tokens.refresh_token ? 'Yes' : 'No'}`);
      console.log('\n✅ You can now use the ChatGPT OAuth provider!\n');
    }

  } catch (error) {
    console.error('\n❌ Login failed:', error);
    process.exit(1);
  }
}

async function logout() {
  const tokenManager = new TokenManager();
  const status = tokenManager.getStatus();
  
  if (!status?.isAuthenticated && !status?.accountId) {
    console.log('⚠️  No active session found.\n');
    return;
  }

  tokenManager.clearTokens();
  console.log('🚪 Logged out successfully!\n');
  if (status.accountId) {
    console.log(`   Previous account: ${status.accountId}\n`);
  }
}

async function checkStatus() {
  const tokenManager = new TokenManager();
  const status = tokenManager.getStatus();
  
  console.log('📊 Authentication Status\n');
  console.log('━'.repeat(40));
  
  if (!status) {
    console.log('❌ No tokens found');
    console.log('\nRun "npm run login" to authenticate.\n');
    return;
  }

  if (status.isAuthenticated) {
    console.log('✅ Authenticated');
    console.log(`   Account ID: ${status.accountId || 'Unknown'}`);
    console.log(`   Expires in: ${status.expiresIn}`);
    
    // Test if we can get valid credentials
    const creds = await tokenManager.getCredentials();
    if (creds) {
      console.log('   Token status: Valid and ready');
    } else {
      console.log('   Token status: Needs refresh');
    }
  } else {
    console.log('❌ Not authenticated');
    if (status.accountId) {
      console.log(`   Previous account: ${status.accountId}`);
    }
    console.log('\nRun "npm run login" to authenticate.');
  }
  
  console.log('━'.repeat(40));
  console.log();
}

async function main() {
  console.log('\n🔐 ChatGPT OAuth CLI\n');
  
  switch (command) {
    case 'login':
      await login();
      break;
    
    case 'logout':
      await logout();
      break;
    
    case 'status':
      await checkStatus();
      break;
    
    default:
      console.log('Usage: auth-cli.ts <command>\n');
      console.log('Commands:');
      console.log('  login   - Start OAuth login flow');
      console.log('  logout  - Clear stored tokens');
      console.log('  status  - Check authentication status\n');
      console.log('Or use npm scripts:');
      console.log('  npm run login');
      console.log('  npm run logout');
      console.log('  npm run status\n');
      process.exit(1);
  }
}

// Run the CLI
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});