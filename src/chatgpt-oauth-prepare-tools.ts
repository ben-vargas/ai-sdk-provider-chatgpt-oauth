import type {
  LanguageModelV2FunctionTool,
  LanguageModelV2ProviderDefinedTool,
  LanguageModelV2ToolChoice,
  LanguageModelV2CallWarning,
} from '@ai-sdk/provider';
import type { ChatGPTTool, ChatGPTToolChoice } from './chatgpt-oauth-settings';

// Define the Codex tools that ChatGPT backend supports (Responses API format)
const CODEX_SHELL_TOOL: ChatGPTTool = {
  type: 'function',
  name: 'shell',
  description: 'Runs a shell command and returns its output',
  strict: false,
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'array',
        items: { type: 'string' },
      },
      workdir: {
        type: 'string',
      },
      timeout: {
        type: 'number',
      },
    },
    required: ['command'],
    additionalProperties: false,
  },
};

const CODEX_UPDATE_PLAN_TOOL: ChatGPTTool = {
  type: 'function',
  name: 'update_plan',
  description: `Use the update_plan tool to keep the user updated on the current plan for the task.
After understanding the user's task, call the update_plan tool with an initial plan. An example of a plan:
1. Explore the codebase to find relevant files (status: in_progress)
2. Implement the feature in the XYZ component (status: pending)
3. Commit changes and make a pull request (status: pending)
Each step should be a short, 1-sentence description.
Until all the steps are finished, there should always be exactly one in_progress step in the plan.
Call the update_plan tool whenever you finish a step, marking the completed step as completed and marking the next step as in_progress.
Before running a command, consider whether or not you have completed the previous step, and make sure to mark it as completed before moving on to the next step.
Sometimes, you may need to change plans in the middle of a task: call update_plan with the updated plan and make sure to provide an explanation of the rationale when doing so.
When all steps are completed, call update_plan one last time with all steps marked as completed.`,
  strict: false,
  parameters: {
    type: 'object',
    properties: {
      explanation: {
        type: 'string',
      },
      plan: {
        type: 'array',
        description: 'The list of steps',
        items: {
          type: 'object',
          properties: {
            step: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
          },
          required: ['step', 'status'],
          additionalProperties: false,
        },
      },
    },
    required: ['plan'],
    additionalProperties: false,
  },
};

export function prepareChatGPTTools({
  tools,
  toolChoice,
}: {
  tools?: Array<LanguageModelV2FunctionTool | LanguageModelV2ProviderDefinedTool>;
  toolChoice?: LanguageModelV2ToolChoice;
}): {
  tools?: ChatGPTTool[];
  toolChoice?: ChatGPTToolChoice;
  warnings: LanguageModelV2CallWarning[];
  toolMapping: Map<string, string>;
} {
  const warnings: LanguageModelV2CallWarning[] = [];
  const toolMapping = new Map<string, string>();

  // ChatGPT backend only supports its own predefined tools (shell and update_plan)
  // We can only include these tools if the user has corresponding tools
  const chatGPTTools: ChatGPTTool[] = [];

  if (tools && tools.length > 0) {
    let hasShellTool = false;
    let hasUpdatePlanTool = false;

    // Check which tools the user has that we can map
    for (const tool of tools) {
      if (tool.type === 'function') {
        // Map command execution tools to shell
        if (
          tool.name === 'bash' ||
          tool.name === 'shell' ||
          tool.name.includes('execute') ||
          tool.name.includes('command')
        ) {
          if (!hasShellTool) {
            chatGPTTools.push(CODEX_SHELL_TOOL);
            hasShellTool = true;
          }
          toolMapping.set('shell', tool.name);
        }
        // Map planning tools to update_plan
        else if (
          tool.name === 'TodoWrite' ||
          tool.name === 'update_plan' ||
          tool.name.includes('plan') ||
          tool.name.includes('todo')
        ) {
          if (!hasUpdatePlanTool) {
            chatGPTTools.push(CODEX_UPDATE_PLAN_TOOL);
            hasUpdatePlanTool = true;
          }
          toolMapping.set('update_plan', tool.name);
        }
        // Other tools can't be directly mapped - ChatGPT doesn't support custom tools
        else {
          warnings.push({
            type: 'unsupported-tool',
            tool,
            details: 'ChatGPT backend only supports shell and update_plan tools',
          });
        }
      } else {
        warnings.push({
          type: 'other',
          message: `Tool type ${tool.type} is not supported`,
        });
      }
    }
  }

  // Handle tool choice
  let chatGPTToolChoice: ChatGPTToolChoice | undefined;

  if (toolChoice === undefined && chatGPTTools.length > 0) {
    chatGPTToolChoice = 'auto';
  } else if (toolChoice && typeof toolChoice === 'object') {
    if (toolChoice.type === 'auto') {
      chatGPTToolChoice = 'auto';
    } else if (toolChoice.type === 'none') {
      chatGPTToolChoice = 'none';
    } else if (toolChoice.type === 'required') {
      chatGPTToolChoice = 'required';
    } else if (toolChoice.type === 'tool') {
      // Specific tool choice not supported, default to auto
      chatGPTToolChoice = 'auto';
      warnings.push({
        type: 'unsupported-setting',
        setting: 'toolChoice',
        details: 'Specific tool choice is not supported',
      });
    }
  }

  return {
    tools: chatGPTTools,
    toolChoice: chatGPTToolChoice,
    warnings,
    toolMapping,
  };
}
