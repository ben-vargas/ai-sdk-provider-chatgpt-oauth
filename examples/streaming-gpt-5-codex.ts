import { streamText } from 'ai';
import { createChatGPTOAuth } from '../dist/index.mjs';

async function main() {
  try {
    const provider = createChatGPTOAuth({
      autoRefresh: true,
    });

    const { textStream, usage, warnings } = await streamText({
      model: provider('gpt-5-codex'),
      prompt: 'Outline a focused debugging plan for tracking flaky tests.',
      maxToolRoundtrips: 0,
    });

    console.log('Streaming response:');
    console.log('-------------------');

    for await (const chunk of textStream) {
      process.stdout.write(chunk);
    }

    console.log('\n-------------------');

    if (warnings.length > 0) {
      console.log('Warnings:', warnings.map((warning) => warning.message ?? JSON.stringify(warning)));
    }

    console.log('Usage:', await usage);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
