import { generateText } from 'ai';
import { createChatGPTOAuth } from '../src';
import { execSync } from 'child_process';

/**
 * Basic Tool Calling Example
 * 
 * This demonstrates how the ChatGPT OAuth provider handles tool calls.
 * Note: The model will call tools but won't automatically use the results to answer questions.
 */

async function main() {
  console.log('🔧 Basic Tool Calling Example\n');
  console.log('=' .repeat(50));
  
  const provider = createChatGPTOAuth();
  
  const result = await generateText({
    model: provider('gpt-5'),
    prompt: 'Count how many TypeScript files are in this directory',
    tools: {
      bash: {
        description: 'Execute bash commands',
        parameters: {
          type: 'object',
          properties: {
            command: {
              type: 'array',
              items: { type: 'string' },
              description: 'Command array to execute',
            },
          },
          required: ['command'],
        },
        execute: async ({ command }) => {
          // Handle the command array format
          let cmd: string;
          if (Array.isArray(command)) {
            // Extract actual command from ["bash", "-lc", "command"] format
            cmd = command[command.length - 1];
          } else {
            cmd = command;
          }
          
          console.log(`\n📟 Tool Called: bash`);
          console.log(`   Command: ${cmd.substring(0, 50)}${cmd.length > 50 ? '...' : ''}`);
          
          try {
            // Execute a simple ls command to count .ts files
            const output = execSync('ls -1 *.ts 2>/dev/null | wc -l', { 
              encoding: 'utf-8',
              shell: '/bin/bash' 
            });
            const count = output.trim();
            console.log(`   Result: ${count} TypeScript files found`);
            return `${count}`;
          } catch (error) {
            console.log('   Result: Error counting files');
            return 'Error: Could not count files';
          }
        },
      },
    },
  });

  console.log(`\n💬 Model's Response: "${result.text}"`);
  
  console.log('\n📊 Summary:');
  console.log(`   • Tool calls made: ${result.toolCalls?.length || 0}`);
  console.log(`   • Tool executed: ${result.toolResults?.length || 0} time(s)`);
  console.log(`   • Tokens used: ${result.usage?.totalTokens || 0}`);
  
  console.log('\n💡 Key Points:');
  console.log('   1. The model calls the bash tool');
  console.log('   2. The tool executes and returns results');
  console.log('   3. The model describes what it will do (Codex-style)');
  console.log('   4. It does NOT interpret the results automatically');
  
  console.log('\n' + '=' .repeat(50));
}

main().catch(console.error);