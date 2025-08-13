import { generateText } from 'ai';
import { createChatGPTOAuth } from '../src';
import { execSync } from 'child_process';

async function main() {
  const provider = createChatGPTOAuth();
  const model = provider('gpt-5');

  const result = await generateText({
    model,
    prompt: 'List the files in the current directory',
    tools: {
      // Map the shell tool to a bash executor
      bash: {
        description: 'Execute a bash command',
        parameters: {
          type: 'object',
          properties: {
            command: {
              type: 'array',
              items: { type: 'string' },
              description: 'Command to execute as array of arguments',
            },
          },
          required: ['command'],
        },
        execute: async ({ command }) => {
          console.log('Executing command:', command);
          try {
            const cmd = Array.isArray(command) ? command.join(' ') : command;
            const output = execSync(cmd, { encoding: 'utf-8' });
            return output;
          } catch (error: any) {
            return `Error: ${error.message}`;
          }
        },
      },
    },
  });

  console.log('Response:', result.text);
  console.log('\nTool calls:', result.toolCalls);
  console.log('\nTool results:', result.toolResults);
  console.log('\nUsage:', result.usage);
}

main().catch(console.error);