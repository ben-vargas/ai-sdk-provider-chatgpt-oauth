import { generateText } from 'ai';
import { createChatGPTOAuth } from '../dist/index.mjs';

async function main() {
  try {
    const provider = createChatGPTOAuth({
      autoRefresh: true,
    });

    const result = await generateText({
      model: provider('gpt-5-codex'),
      prompt: 'Reply with a single sentence describing your CLI workflow.',
      maxToolRoundtrips: 0,
    });

    console.log('Generated text:', result.text);
    console.log('Usage:', result.usage);

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
