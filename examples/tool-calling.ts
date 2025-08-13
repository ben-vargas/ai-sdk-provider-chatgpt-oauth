import { generateText, tool } from 'ai';
import { z } from 'zod';
import { createChatGPTOAuth } from '../dist/index.mjs';

// IMPORTANT: ChatGPT backend only supports specific predefined tools:
// - 'shell' (or 'bash', 'command', 'execute') for running commands
// - 'update_plan' (or 'TodoWrite', 'plan', 'todo') for task planning
// 
// Custom tools like 'getWeather' are NOT supported and will generate warnings.
// This example demonstrates the limitation.

async function main() {
  try {
    const provider = createChatGPTOAuth({
      autoRefresh: true,
    });

    console.log('Note: ChatGPT backend does not support custom tools like getWeather.');
    console.log('Only shell and update_plan tools are supported.\n');

    const result = await generateText({
      model: provider('gpt-5'),
      prompt: 'What is the weather like in San Francisco and New York?',
      tools: {
        // This tool won't work - ChatGPT backend doesn't support custom tools
        getWeather: tool({
          description: 'Get weather information for a city',
          parameters: z.object({
            city: z.string().describe('The city name'),
            unit: z.enum(['celsius', 'fahrenheit']).optional(),
          }),
          execute: async ({ city, unit = 'celsius' }) => {
            console.log(`Getting weather for ${city} in ${unit}...`);
            
            return {
              city,
              temperature: Math.floor(Math.random() * 30) + 10,
              unit,
              condition: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)],
            };
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
    console.log('\nWarnings:', result.warnings);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();