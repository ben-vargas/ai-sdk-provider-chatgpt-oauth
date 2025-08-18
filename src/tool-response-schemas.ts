import { z } from 'zod';

/**
 * Zod schemas for validating tool call responses from the ChatGPT backend API.
 *
 * Since we're using an undocumented backend API meant for Codex CLI,
 * we validate responses to catch any changes OpenAI might make to the format.
 */

/**
 * Schema for shell tool response arguments
 */
export const shellToolResponseSchema = z.object({
  command: z.array(z.string()),
  workdir: z.string().optional(),
  timeout: z.number().optional(),
});

export type ShellToolResponse = z.infer<typeof shellToolResponseSchema>;

/**
 * Schema for update_plan tool response arguments
 */
export const updatePlanToolResponseSchema = z.object({
  plan: z.array(
    z.object({
      step: z.string(),
      status: z.enum(['pending', 'in_progress', 'completed']),
    })
  ),
  explanation: z.string().optional(),
});

export type UpdatePlanToolResponse = z.infer<typeof updatePlanToolResponseSchema>;

/**
 * Validates tool response arguments based on the tool name.
 * Throws a descriptive error if the response doesn't match expected schema.
 *
 * @param toolName - Name of the tool ('shell' or 'update_plan')
 * @param args - Raw JSON string of tool arguments
 * @returns Parsed and validated arguments
 */
export function validateToolResponse(toolName: string, args: string): unknown {
  try {
    const parsedArgs = JSON.parse(args);

    switch (toolName) {
      case 'shell': {
        const result = shellToolResponseSchema.safeParse(parsedArgs);
        if (!result.success) {
          throw new Error(
            `ChatGPT backend API returned unexpected format for 'shell' tool. ` +
              `This may indicate the API has changed. ` +
              `Validation errors: ${result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
          );
        }
        return result.data;
      }

      case 'update_plan': {
        const result = updatePlanToolResponseSchema.safeParse(parsedArgs);
        if (!result.success) {
          throw new Error(
            `ChatGPT backend API returned unexpected format for 'update_plan' tool. ` +
              `This may indicate the API has changed. ` +
              `Validation errors: ${result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
          );
        }
        return result.data;
      }

      default:
        // For unknown tools, just return parsed JSON without validation
        // This allows for potential new tools without breaking
        return parsedArgs;
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Failed to parse tool arguments as JSON for tool '${toolName}': ${error.message}`
      );
    }
    throw error;
  }
}
