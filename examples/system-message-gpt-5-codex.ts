import { generateText, type CoreMessage } from 'ai';
import { createChatGPTOAuth } from '../dist/index.mjs';

async function main() {
  try {
    const provider = createChatGPTOAuth({
      autoRefresh: true,
    });

    const messages: CoreMessage[] = [
      {
        role: 'system',
        content: 'You are a terse assistant. Always answer in exactly three words.',
      },
      {
        role: 'user',
        content: 'Summarize what this OAuth provider does.',
      },
    ];

    const result = await generateText({
      model: provider('gpt-5-codex'),
      messages,
      maxToolRoundtrips: 0,
    });

    console.log('Model reply:', result.text);

    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      for (const warning of result.warnings) {
        console.log('-', warning.message ?? JSON.stringify(warning));
      }
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
