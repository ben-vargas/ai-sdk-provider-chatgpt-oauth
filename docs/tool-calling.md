# Tool Calling Guide

The ChatGPT backend implements a Codex-style tool system with two predefined tools.

## Supported Tools

1. **`shell`** - Execute command-line tools and scripts
2. **`update_plan`** - Update task planning and progress tracking

## Basic Usage

Unlike standard OpenAI models, ChatGPT uses a pattern where all custom functionality is implemented through command-line tools that are orchestrated via the `shell` tool:

```typescript
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { createChatGPTOAuth } from 'ai-sdk-provider-chatgpt-oauth';

const provider = createChatGPTOAuth();

const result = await generateText({
  model: provider('gpt-5'),
  prompt: 'List the files in the current directory',
  tools: {
    // Tool names that map to 'shell': bash, shell, command, execute
    bash: tool({
      description: 'Execute shell commands',
      parameters: z.object({
        command: z.array(z.string()),
        workdir: z.string().optional(),
        timeout: z.number().optional(),
      }),
      execute: async ({ command, workdir, timeout }) => {
        // Implement with proper sandboxing in production
        const { spawnSync } = require('child_process');
        const [cmd, ...args] = command;
        const result = spawnSync(cmd, args, {
          cwd: workdir,
          timeout: (timeout || 30) * 1000,
          encoding: 'utf8',
        });
        return result.stdout || result.stderr;
      },
    }),
  },
  toolChoice: 'auto',
});
```

## Tool Name Mapping

The provider automatically maps your tool names to ChatGPT's predefined tools:

| Your Tool Name                             | Maps To       | Purpose           |
| ------------------------------------------ | ------------- | ----------------- |
| `bash`, `shell`, `command`, `execute`      | `shell`       | Command execution |
| `TodoWrite`, `update_plan`, `plan`, `todo` | `update_plan` | Task planning     |
| Other names                                | Not supported | Warning generated |

## Custom Tool Pattern

To implement custom functionality (like a weather API), create command-line tools:

1. **Create a CLI tool**: `weather-cli` that fetches weather data
2. **Call it via shell**: The AI calls `["weather-cli", "San Francisco"]`
3. **Return results**: The CLI output becomes the tool result

This mirrors how Codex CLI implements sophisticated tools like `apply_patch` for file editing.

## Example: Weather CLI Tool

### Step 1: Create the CLI Tool

```javascript
#!/usr/bin/env node
// weather-cli.js
const city = process.argv[2];
const apiKey = process.env.WEATHER_API_KEY;

async function getWeather(city) {
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`
  );
  const data = await response.json();
  console.log(JSON.stringify({
    city: data.name,
    temperature: data.main.temp,
    description: data.weather[0].description,
  }));
}

getWeather(city);
```

### Step 2: Make it Executable

```bash
chmod +x weather-cli.js
```

### Step 3: Use with ChatGPT OAuth

```typescript
const result = await generateText({
  model: provider('gpt-5'),
  prompt: 'What is the weather in San Francisco?',
  tools: {
    bash: tool({
      description: 'Execute shell commands',
      parameters: z.object({
        command: z.array(z.string()),
      }),
      execute: async ({ command }) => {
        // The model will call: ["./weather-cli.js", "San Francisco"]
        const { spawnSync } = require('child_process');
        const [cmd, ...args] = command;
        const result = spawnSync(cmd, args, {
          encoding: 'utf8',
        });
        return result.stdout;
      },
    }),
  },
});
```

## Task Planning Tool

The `update_plan` tool is used for maintaining task lists:

```typescript
const result = await generateText({
  model: provider('gpt-5'),
  prompt: 'Create a plan to build a web application',
  tools: {
    TodoWrite: tool({
      description: 'Update task plan',
      parameters: z.object({
        todos: z.array(z.object({
          content: z.string(),
          status: z.enum(['pending', 'in_progress', 'completed']),
          id: z.string(),
        })),
      }),
      execute: async ({ todos }) => {
        // Store/update the task list
        console.log('Updated task plan:', todos);
        return 'Task plan updated successfully';
      },
    }),
  },
});
```

## Limitations

- **No arbitrary function tools**: Can't define custom function tools like `getWeather`
- **Shell-based only**: All custom logic must be executable via command line
- **Two tools only**: Limited to `shell` and `update_plan` functionality
- **Stateless backend**: The model doesn't remember tool calls between requests

## Best Practices

1. **Sandbox Shell Commands**: Always sanitize and sandbox shell execution in production
2. **Use Proper Error Handling**: Handle command failures gracefully
3. **Implement Timeouts**: Prevent long-running commands from hanging
4. **Log Tool Calls**: Track what commands are being executed
5. **Validate Output**: Ensure tool outputs are in expected format

## Codex Pattern Examples

In the Codex CLI ecosystem:

- **`apply_patch`**: A CLI tool for file editing, called via `shell`
- **`grep`/`find`**: System tools for searching, called via `shell`
- **Custom CLIs**: Your own tools, executed through `shell`

## See Also

- [Tool Calling Examples](../examples/tool-calling-basic.ts)
- [Stateless Backend Demo](../examples/tool-calling-stateless.ts)
- [Tool Limitations Demo](../examples/tool-calling-limitations.ts)