# Understanding ChatGPT's Tool System

The ChatGPT backend follows the Codex CLI architecture, which is fundamentally different from standard OpenAI models.

## Architecture Overview

### Key Differences from Standard OpenAI

| Feature | Standard OpenAI | ChatGPT OAuth |
|---------|----------------|---------------|
| Tool Definition | Arbitrary functions | Only 2 predefined tools |
| Tool Execution | Direct function calls | Shell command pattern |
| Custom Logic | Native function tools | CLI tools via shell |
| Instructions | Customizable | Fixed Codex CLI instructions |
| Tool Choice | Any tool name | Must map to shell/update_plan |

### Core Principles

1. **Predefined Tools Only**: Unlike standard OpenAI models, ChatGPT only supports two specific tools
2. **Shell-Based Execution**: All custom functionality runs through shell commands
3. **Codex Instructions**: The model uses specific Codex CLI instructions for optimal performance
4. **CLI Philosophy**: Everything is a command-line tool

## The Two Available Tools

### 1. Shell Tool (`shell`)

**Purpose**: Execute any command-line tool or script

**Your tool names that map to it**:
- `bash`
- `shell`
- `command`
- `execute`

**Parameters**:
```typescript
{
  command: string[], // Command and arguments
  workdir?: string,  // Working directory
  timeout?: number   // Timeout in seconds
}
```

### 2. Update Plan Tool (`update_plan`)

**Purpose**: Maintain task lists and track progress

**Your tool names that map to it**:
- `TodoWrite`
- `update_plan`
- `plan`
- `todo`

**Parameters**:
```typescript
{
  todos: Array<{
    content: string,
    status: 'pending' | 'in_progress' | 'completed',
    id: string
  }>
}
```

## Tool Mapping System

The provider automatically maps your tool names to ChatGPT's predefined tools:

```typescript
// Internal mapping logic
const toolMapping = {
  // Shell tool mappings
  'bash': 'shell',
  'shell': 'shell',
  'command': 'shell',
  'execute': 'shell',
  
  // Update plan mappings
  'TodoWrite': 'update_plan',
  'update_plan': 'update_plan',
  'plan': 'update_plan',
  'todo': 'update_plan',
};
```

Any tool name not in this mapping will:
1. Generate a warning in the console
2. Be ignored by the model
3. Not cause an error (graceful degradation)

## The Codex CLI Pattern

### How Codex CLI Works

Codex CLI implements all functionality through command-line tools:

1. **File Editing**: `apply_patch` CLI tool (not `writeFile` function)
2. **Code Search**: `grep`/`rg` commands (not `searchCode` function)
3. **Web Requests**: `curl`/`wget` commands (not `fetch` function)
4. **Data Processing**: `jq`/`sed`/`awk` commands (not custom parsers)

### Examples from Codex CLI

```typescript
// How Codex edits files
["apply_patch", "file.txt", "patch-content"]

// How Codex searches code
["grep", "-r", "function", "./src"]

// How Codex makes API calls
["curl", "-X", "GET", "https://api.example.com/data"]
```

## Implementing Custom Functionality

### The Pattern

Since you can't create custom function tools, you must:

1. **Create a CLI tool** that performs your custom logic
2. **Make it executable** from the command line
3. **Let the AI call it** via the shell tool

### Example: Database Query Tool

Instead of a `queryDatabase` function tool:

```bash
#!/usr/bin/env node
// db-query.js
const query = process.argv[2];
const db = require('./database');

async function runQuery(sql) {
  const results = await db.query(sql);
  console.log(JSON.stringify(results));
}

runQuery(query);
```

The AI would call: `["node", "db-query.js", "SELECT * FROM users"]`

### Example: API Integration

Instead of a `callAPI` function tool:

```bash
#!/usr/bin/env python
# api-client.py
import sys
import requests
import json

endpoint = sys.argv[1]
method = sys.argv[2] if len(sys.argv) > 2 else 'GET'

response = requests.request(method, endpoint)
print(json.dumps(response.json()))
```

The AI would call: `["python", "api-client.py", "https://api.example.com/data", "GET"]`

## Why This Architecture?

### Security

- **Sandboxing**: Shell commands can be sandboxed more easily
- **Permissions**: OS-level permissions control what can be executed
- **Auditing**: Command execution can be logged and audited

### Flexibility

- **Language Agnostic**: Any language can create CLI tools
- **Existing Tools**: Leverage the entire Unix toolchain
- **Composability**: Pipe commands together for complex operations

### Consistency

- **Unified Interface**: Everything is a command
- **Predictable Behavior**: Shell semantics are well-understood
- **Portability**: Works across different environments

## Limitations and Considerations

### Limitations

1. **No Direct Function Calls**: Can't call JavaScript/Python functions directly
2. **Serialization Overhead**: Data must be serialized to/from CLI
3. **Process Overhead**: Each tool call spawns a new process
4. **Error Handling**: Must parse stdout/stderr for errors

### Best Practices

1. **Create Wrapper Scripts**: Bundle complex logic into simple CLI tools
2. **Use JSON for Data Exchange**: Standardize on JSON for tool I/O
3. **Implement Proper Error Codes**: Use exit codes to indicate success/failure
4. **Add Help Text**: Include `--help` flags in your CLI tools
5. **Version Your Tools**: Track CLI tool versions for compatibility

## Comparison with Standard OpenAI

### Standard OpenAI Approach

```typescript
// Define custom function tools
tools: {
  getWeather: {
    parameters: { city: z.string() },
    execute: async ({ city }) => {
      const weather = await fetchWeather(city);
      return weather;
    }
  },
  sendEmail: {
    parameters: { to: z.string(), subject: z.string() },
    execute: async ({ to, subject }) => {
      await emailService.send(to, subject);
    }
  }
}
```

### ChatGPT OAuth Approach

```typescript
// Everything goes through shell
tools: {
  bash: {
    execute: async ({ command }) => {
      // Model calls: ["weather-cli", "San Francisco"]
      // Model calls: ["send-email", "user@example.com", "Subject"]
      return executeCommand(command);
    }
  }
}
```

## Future Considerations

As the ChatGPT backend evolves, we might see:

- Additional predefined tools beyond shell and update_plan
- Support for custom tool registration
- Native function tool support
- Direct API integrations

For now, the shell-based pattern is the only way to extend functionality.

## See Also

- [Tool Calling Guide](./tool-calling.md)
- [Tool Examples](../examples/tool-calling-basic.ts)
- [Limitations](./limitations.md)