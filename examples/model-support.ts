import { generateText } from 'ai';
import { createChatGPTOAuth } from '../dist/index.mjs';

/**
 * This example demonstrates which models work with the ChatGPT OAuth API
 * and what happens when you try to use an unsupported model.
 */

async function testModel(provider: any, modelId: string, description: string) {
  console.log(`\n${modelId} - ${description}`);
  console.log('─'.repeat(50));
  
  try {
    const result = await generateText({
      model: provider(modelId),
      prompt: 'Respond with a single sentence about your capabilities.',
      maxToolRoundtrips: 0, // No tools for this demo
    });
    
    console.log('✅ SUCCESS');
    console.log(`Response: ${result.text}`);
    console.log(`Tokens used: ${result.usage.totalTokens}`);
    console.log(`Finish reason: ${result.finishReason}`);
  } catch (error: any) {
    console.log('❌ ERROR');
    console.log(`Error message: ${error.message}`);
    
    // Show the specific error for unsupported models
    if (error.message.includes('Unsupported model')) {
      console.log('This model is not supported by the ChatGPT OAuth API.');
      console.log('The model may be available in Codex CLI but not via OAuth.');
    }
  }
}

async function main() {
  const provider = createChatGPTOAuth({
    autoRefresh: true,
  });

  console.log('=' .repeat(60));
  console.log('ChatGPT OAuth Model Support Demonstration');
  console.log('=' .repeat(60));
  console.log('\nThis example shows which models work with the ChatGPT OAuth API');
  console.log('and demonstrates the error when using unsupported models.\n');

  // Test working models
  console.log('\n🟢 WORKING MODELS:');
  await testModel(
    provider, 
    'gpt-5',
    'Latest GPT-5 with reasoning (200k context)'
  );
  
  await testModel(
    provider,
    'codex-mini-latest', 
    'Experimental model with local shell understanding'
  );

  // Test an unsupported model to show the error
  console.log('\n\n🔴 UNSUPPORTED MODEL EXAMPLE:');
  await testModel(
    provider,
    'o3',
    'Advanced reasoning model (works in Codex CLI, not OAuth)'
  );

  // Additional examples of unsupported models
  console.log('\n\n📋 OTHER UNSUPPORTED MODELS:');
  console.log('The following models also return "Unsupported model" errors:');
  console.log('  • o4-mini - Efficient reasoning model');
  console.log('  • gpt-4.1 - 1M+ context window model');
  console.log('  • gpt-4o - GPT-4o and all its variants');
  console.log('  • gpt-3.5-turbo - Legacy model');
  console.log('  • gpt-oss-20b, gpt-oss-120b - Open source models');
  
  console.log('\n' + '=' .repeat(60));
  console.log('Summary:');
  console.log('  • Only gpt-5 and codex-mini-latest work via OAuth API');
  console.log('  • Other models may work in Codex CLI but not through OAuth');
  console.log('  • The provider will pass through any model ID for future support');
  console.log('=' .repeat(60));
}

main().catch(console.error);