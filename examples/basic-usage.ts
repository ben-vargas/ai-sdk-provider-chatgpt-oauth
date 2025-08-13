import { generateText } from 'ai';
import { createChatGPTOAuth } from '../dist/index.mjs';

async function main() {
  try {
    const provider = createChatGPTOAuth({
      autoRefresh: true,
    });

    const result = await generateText({
      model: provider('gpt-5'),
      prompt: 'Write a haiku about TypeScript',
      temperature: 0.7,
      maxTokens: 100,
    });

    console.log('Generated text:', result.text);
    console.log('Usage:', result.usage);
    console.log('Finish reason:', result.finishReason);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();