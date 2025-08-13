import { generateText } from 'ai';
import { createChatGPTOAuth } from '../dist/index.mjs';

/**
 * This example demonstrates how to use the reasoning effort parameter
 * to control the depth of thinking for supported models like gpt-5.
 * 
 * The reasoning effort parameter works similarly to Codex CLI's
 * -c model_reasoning_effort="high" option.
 */

async function testReasoningEffort() {
  console.log('=' .repeat(60));
  console.log('ChatGPT OAuth Reasoning Effort Demo');
  console.log('=' .repeat(60));
  console.log('\n');

  // Create provider with default reasoning settings
  const provider = createChatGPTOAuth({
    autoRefresh: true,
    reasoningEffort: 'medium',  // Default effort level
    reasoningSummary: 'auto',   // Default summary mode
  });

  // Test different reasoning effort levels
  const testCases = [
    { effort: 'low', prompt: 'What is 2+2?' },
    { effort: 'medium', prompt: 'Explain why 0.999... equals 1' },
    { effort: 'high', prompt: 'Prove that the square root of 2 is irrational' },
  ] as const;

  for (const { effort, prompt } of testCases) {
    console.log(`\n🧠 Reasoning Effort: ${effort.toUpperCase()}`);
    console.log('─'.repeat(50));
    console.log(`Prompt: ${prompt}`);
    console.log('');

    try {
      const result = await generateText({
        // Pass reasoning options per-model call
        model: provider('gpt-5', { 
          reasoningEffort: effort,
          reasoningSummary: 'detailed', // Use 'detailed' for reliability
        }),
        prompt,
        maxToolRoundtrips: 0,
      });

      console.log('Response:', result.text);
      
      if (result.usage) {
        console.log(`\nToken usage:`);
        console.log(`  Input: ${result.usage.inputTokens}`);
        console.log(`  Output: ${result.usage.outputTokens}`);
        console.log(`  Total: ${result.usage.totalTokens}`);
        
        // Note: reasoning tokens are included in the output tokens
        // The backend may provide separate reasoning token counts in future
      }
    } catch (error: any) {
      console.error('Error:', error.message);
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('Alternative Usage: Global Settings');
  console.log('=' .repeat(60));
  console.log('\n');

  // You can also set reasoning globally for all models
  const highReasoningProvider = createChatGPTOAuth({
    autoRefresh: true,
    reasoningEffort: 'high',
    reasoningSummary: 'detailed',
  });

  console.log('Using provider with global high reasoning effort...\n');

  const result = await generateText({
    model: highReasoningProvider('gpt-5'),
    prompt: 'Analyze the computational complexity of quicksort',
    maxToolRoundtrips: 0,
  });

  console.log('Response:', result.text);
  console.log(`\nTokens used: ${result.usage?.totalTokens || 0}`);

  console.log('\n' + '=' .repeat(60));
  console.log('Notes:');
  console.log('  • Reasoning effort: low, medium, high (all work reliably)');
  console.log('  • Reasoning summary: detailed, auto (work reliably)');
  console.log('  • Note: "none" and "concise" may trigger API errors (inconsistent behavior)');
  console.log('  • The provider passes all values as-is and warns about potential issues');
  console.log('  • Higher effort levels may increase response time and token usage');
  console.log('  • Similar to: codex -m gpt-5 -c model_reasoning_effort="high"');
  console.log('=' .repeat(60));
}

testReasoningEffort().catch(console.error);