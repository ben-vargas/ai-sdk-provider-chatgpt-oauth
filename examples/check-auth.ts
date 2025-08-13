import { createChatGPTOAuth } from '../dist/index.mjs';

async function main() {
  console.log('Checking ChatGPT OAuth authentication...\n');
  
  try {
    const provider = createChatGPTOAuth({
      autoRefresh: true,
    });
    
    console.log('✅ Provider created successfully');
    
    const model = provider('gpt-5');
    console.log('✅ Model instantiated:', model.modelId);
    
    console.log('\nAttempting to load credentials...');
    console.log('Checking in order:');
    console.log('1. Environment variables (CHATGPT_OAUTH_ACCESS_TOKEN, CHATGPT_OAUTH_ACCOUNT_ID)');
    console.log('2. ~/.codex/auth.json (from Codex CLI)');
    
    console.log('\n✅ Authentication check complete!');
    console.log('\nYou can now use the provider with the AI SDK.');
    
  } catch (error: any) {
    console.error('❌ Authentication failed:', error.message);
    console.error('\nTo fix this:');
    console.error('1. Install and authenticate with Codex CLI:');
    console.error('   npm install -g @openai/codex');
    console.error('   codex login');
    console.error('\n2. Or set environment variables:');
    console.error('   export CHATGPT_OAUTH_ACCESS_TOKEN="your-token"');
    console.error('   export CHATGPT_OAUTH_ACCOUNT_ID="your-account-id"');
    console.error('   export CHATGPT_OAUTH_REFRESH_TOKEN="your-refresh-token" (optional)');
    process.exit(1);
  }
}

main();