import { generateText, tool } from 'ai';
import { z } from 'zod';
import { createChatGPTOAuth } from '../dist/index.mjs';
import { spawnSync } from 'child_process';

// ChatGPT backend implements custom tools through shell commands.
// This example shows how to create a custom "weather" tool that works with ChatGPT.

async function main() {
  try {
    const provider = createChatGPTOAuth({
      autoRefresh: true,
    });

    console.log('Demonstrating custom tool implementation through shell commands...\n');

    const result = await generateText({
      model: provider('gpt-5'),
      prompt: 'Use the shell command to get weather: Run the command ["node", "-e", "console.log(\'Weather in SF: 72°F, sunny\')"]',
      tools: {
        // The shell tool is how ChatGPT executes custom functionality
        shell: tool({
          description: 'Execute shell commands',
          parameters: z.object({
            command: z.array(z.string()).describe('Command and arguments to execute'),
            workdir: z.string().optional().describe('Working directory'),
            timeout: z.number().optional().describe('Timeout in seconds'),
          }),
          execute: async ({ command, workdir, timeout }) => {
            console.log('Executing command:', command);
            
            try {
              // In a real implementation, you'd have proper sandboxing
              // This is just a demonstration
              const [cmd, ...args] = command;
              const result = spawnSync(cmd, args, {
                cwd: workdir,
                timeout: (timeout || 30) * 1000,
                encoding: 'utf8',
                shell: false,
              });
              
              if (result.error) {
                return `Error: ${result.error.message}`;
              }
              if (result.status !== 0) {
                return `Error: Command exited with status ${result.status}\n${result.stderr}`;
              }
              
              return result.stdout || '';
            } catch (error: any) {
              return `Error: ${error.message}`;
            }
          },
        }),
      },
      toolChoice: 'auto',
      maxToolRoundtrips: 3,
    });

    console.log('Response:', result.text);
    console.log('\nTool calls:', result.toolCalls);
    console.log('\nTool results:', result.toolResults);
    console.log('\nUsage:', result.usage);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();