import { generateText, tool } from 'ai';
import { createChatGPTOAuth } from '../src';
import { execSync } from 'child_process';
import { z } from 'zod';

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
    prompt:
      [
        'You MUST use the bash tool to solve this task.',
        'Task: Count how many TypeScript files (*.ts) are in the current directory.',
        'After the tool runs, read its output and respond with ONLY the integer count. No extra words.',
      ].join('\n'),
    maxToolRoundtrips: 1,
    tools: {
      bash: tool({
        description: 'Execute bash commands',
        parameters: z.object({
          command: z.array(z.string()).describe('Command array to execute, e.g. ["bash","-lc","ls"]'),
        }),
        execute: async ({ command }) => {
          // Execute the EXACT command provided by the model.
          // WARNING: This executes arbitrary commands. Sandbox/validate in production.
          const pretty = Array.isArray(command) ? command.join(' ') : String(command);
          console.log(`\n📟 Tool Called: bash`);
          console.log(`   Command: ${pretty}`);

          try {
            if (Array.isArray(command) && command.length > 0) {
              const bin = command[0];
              const args = command.slice(1);
              const { spawnSync } = await import('node:child_process');
              const res = spawnSync(bin, args, { encoding: 'utf-8' });
              const out = (res.stdout || '').trim();
              const err = (res.stderr || '').trim();
              if (err) console.log(`   Stderr: ${err.substring(0, 200)}`);
              console.log(`   Result: ${(out || err).substring(0, 80)}${(out || err).length > 80 ? '...' : ''}`);
              return out || err || '';
            } else {
              const output = execSync(String(command), { encoding: 'utf-8', shell: '/bin/bash' });
              const out = (output || '').trim();
              console.log(`   Result: ${out.substring(0, 80)}${out.length > 80 ? '...' : ''}`);
              return out;
            }
          } catch {
            console.log('   Result: Error executing command');
            return 'Error: command failed';
          }
        },
      }),
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
