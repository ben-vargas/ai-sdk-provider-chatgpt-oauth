import { streamText } from 'ai';
import { createChatGPTOAuth } from '../dist/index.mjs';

async function main() {
  try {
    const provider = createChatGPTOAuth({
      autoRefresh: true,
    });

    const result = await streamText({
      model: provider('gpt-5'),
      prompt: 'Explain quantum computing in simple terms',
    });

    console.log('Streaming response:');
    console.log('-------------------');
    
    for await (const chunk of result.textStream) {
      process.stdout.write(chunk);
    }
    
    console.log('\n-------------------');
    
    const usage = await result.usage;
    console.log('Usage:', usage);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
