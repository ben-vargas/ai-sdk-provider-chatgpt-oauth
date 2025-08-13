import { generateText } from 'ai';
import { createChatGPTOAuth } from '../src';

/**
 * Tool Limitations Example
 * 
 * Shows which tools are supported and which generate warnings.
 * Only "bash" and "TodoWrite" tools work with the ChatGPT OAuth backend.
 */

async function main() {
  console.log('⚠️  Tool Limitations Example\n');
  console.log('=' .repeat(50));
  
  const provider = createChatGPTOAuth();
  
  const result = await generateText({
    model: provider('gpt-5'),
    prompt: 'Please get the weather and also list files',
    tools: {
      // ✅ SUPPORTED: bash tool (maps to "shell" internally)
      bash: {
        description: 'Execute bash commands',
        parameters: {
          type: 'object',
          properties: {
            command: { type: 'array', items: { type: 'string' } },
          },
          required: ['command'],
        },
        execute: async () => 'Files: example1.ts, example2.ts',
      },
      
      // ❌ NOT SUPPORTED: Custom weather tool
      getWeather: {
        description: 'Get weather for a location',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string' },
          },
          required: ['location'],
        },
        execute: async () => '72°F and sunny',
      },
      
      // ❌ NOT SUPPORTED: Custom database tool  
      queryDatabase: {
        description: 'Query a database',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
          },
          required: ['query'],
        },
        execute: async () => 'Database results',
      },
    },
  });

  console.log(`\n💬 Model's Response: "${result.text}"`);
  
  console.log('\n⚠️  Warnings Generated:');
  if (result.warnings && result.warnings.length > 0) {
    result.warnings.forEach((warning, i) => {
      if (warning.type === 'unsupported-tool') {
        const tool = (warning as any).tool;
        console.log(`   ${i+1}. Tool "${tool?.name}" is not supported`);
        console.log(`      ${warning.details || warning.message}`);
      } else {
        console.log(`   ${i+1}. ${warning.message}`);
      }
    });
  } else {
    console.log('   (No warnings)');
  }
  
  console.log('\n📊 Tool Support Summary:');
  console.log('   ✅ Supported Tools:');
  console.log('      • "bash" - Executes shell commands');
  console.log('      • "TodoWrite" - Updates task lists');
  console.log('   ');
  console.log('   ❌ Not Supported:');
  console.log('      • Custom API tools (weather, database, etc.)');
  console.log('      • File manipulation tools');
  console.log('      • Web scraping tools');
  console.log('      • Any tool other than bash/TodoWrite');
  
  console.log('\n💡 Why this limitation?');
  console.log('   The ChatGPT OAuth backend uses the Codex CLI pattern.');
  console.log('   It only supports predefined Codex tools (shell and update_plan).');
  console.log('   All other tools are ignored with warnings.');
  
  console.log('\n' + '=' .repeat(50));
}

main().catch(console.error);