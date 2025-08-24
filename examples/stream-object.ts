import { streamText } from 'ai';
import { createChatGPTOAuth } from '../src';
import { z } from 'zod';

async function main() {
  const provider = createChatGPTOAuth();
  const model = provider('gpt-5');

  console.log('=== ChatGPT OAuth: Streaming Object Generation ===\n');

  // Example 1: Stream a simple object
  console.log('1️⃣  Streaming Simple Object\n');
  
  const recipeSchema = z.object({
    name: z.string().describe('Recipe name'),
    ingredients: z.array(z.string()).describe('List of ingredients'),
    steps: z.array(z.string()).describe('Cooking steps'),
    servings: z.number().describe('Number of servings'),
  });
  const recipeStream = await streamText({
    model,
    prompt: [
      'You MUST output ONLY valid JSON and nothing else.',
      'Do not use code fences, markdown, or explanations.',
      'The first character must be { and the last must be }.',
      'Return JSON matching the required schema exactly.',
      'Expected JSON shape: { "name": string, "ingredients": string[], "steps": string[], "servings": number }',
      '',
      'Task: Generate a detailed recipe for chocolate chip cookies.',
    ].join('\n'),
  });

  console.log('Streaming recipe...\n');
  
  let buffer = '';
  for await (const chunk of recipeStream.textStream) {
    buffer += chunk;
    const partial = tryParseJson(buffer);
    if (partial) {
      console.clear();
      console.log('=== Partial Recipe (Building...) ===');
      console.log(JSON.stringify(partial, null, 2));
    }
  }

  console.log('\n=== Final Recipe ===');
  const finalRecipe = recipeSchema.parse(JSON.parse(extractJson((await recipeStream.text) || '')));
  console.log(JSON.stringify(finalRecipe, null, 2));
  console.log();

  // Example 2: Stream a complex nested object
  console.log('2️⃣  Streaming Complex Object\n');
  
  const projectSchema = z.object({
    projectName: z.string().describe('Project name'),
    description: z.string().describe('Project description'),
    team: z.array(z.object({
      name: z.string(),
      role: z.string(),
      skills: z.array(z.string()),
    })).describe('Team members'),
    milestones: z.array(z.object({
      title: z.string(),
      description: z.string(),
      dueDate: z.string(),
      status: z.enum(['pending', 'in-progress', 'completed']),
    })).describe('Project milestones'),
    budget: z.object({
      total: z.number(),
      spent: z.number(),
      remaining: z.number(),
    }),
  });
  const projectText = await streamText({
    model,
    prompt: [
      'You MUST output ONLY valid JSON and nothing else.',
      'Do not use code fences, markdown, or explanations.',
      'The first character must be { and the last must be }.',
      'Return JSON matching the required schema exactly.',
      'Expected JSON shape: { "projectName": string, "description": string, "team": { "name": string, "role": string, "skills": string[] }[], "milestones": { "title": string, "description": string, "dueDate": string, "status": "pending"|"in-progress"|"completed" }[], "budget": { "total": number, "spent": number, "remaining": number } }',
      '',
      'Task: Generate a software development project plan for building a mobile app.',
    ].join('\n'),
  });

  console.log('Streaming project plan...\n');
  
  let updateCount = 0;
  for await (const chunk of projectText.textStream) {
    updateCount++;
    const partial = tryParseJson(chunk);
    if (partial) {
      const fields = Object.keys(partial);
      console.log(`Update ${updateCount}: Fields populated: ${fields.join(', ')}`);
      if (Array.isArray(partial.team)) console.log(`  Team members: ${partial.team.length}`);
      if (Array.isArray(partial.milestones)) console.log(`  Milestones: ${partial.milestones.length}`);
    }
  }

  console.log('\n=== Final Project Plan ===');
  const project = projectSchema.parse(JSON.parse(extractJson((await projectText.text) || '')));
  console.log(JSON.stringify(project, null, 2));
  console.log();

  // Example 3: Stream with progress tracking
  console.log('3️⃣  Streaming with Progress Tracking\n');
  
  const schema = z.object({
    analysis: z.object({
      summary: z.string().describe('Executive summary'),
      strengths: z.array(z.string()).describe('Key strengths'),
      weaknesses: z.array(z.string()).describe('Key weaknesses'),
      opportunities: z.array(z.string()).describe('Opportunities'),
      threats: z.array(z.string()).describe('Threats'),
    }),
    recommendations: z.array(z.object({
      title: z.string(),
      description: z.string(),
      priority: z.enum(['low', 'medium', 'high']),
      timeframe: z.string(),
    })),
    conclusion: z.string(),
  });
  const analysisStream = await streamText({
    model,
    prompt: [
      'You MUST output ONLY valid JSON and nothing else.',
      'Do not use code fences, markdown, or explanations.',
      'The first character must be { and the last must be }.',
      'Return JSON matching the required schema exactly.',
      'Expected JSON shape: { "analysis": { "summary": string, "strengths": string[], "weaknesses": string[], "opportunities": string[], "threats": string[] }, "recommendations": { "title": string, "description": string, "priority": "low"|"medium"|"high", "timeframe": string }[], "conclusion": string }',
      '',
      'Task: Generate a SWOT analysis for a startup entering the AI market.',
    ].join('\n'),
  });

  console.log('Streaming SWOT analysis...\n');
  
  const expectedFields = Object.keys(schema.shape);
  const completedFields = new Set<string>();
  
  for await (const chunk of analysisStream.textStream) {
    const partialObject = tryParseJson(chunk);
    const currentFields = partialObject ? Object.keys(partialObject) : [];
    
    // Check for newly completed fields
    for (const field of currentFields) {
      if (!completedFields.has(field)) {
        completedFields.add(field);
        const progress = (completedFields.size / expectedFields.length) * 100;
        console.log(`✓ Field "${field}" completed (${progress.toFixed(0)}% overall progress)`);
      }
    }
  }

  console.log('\n=== Final SWOT Analysis ===');
  const analysis = schema.parse(JSON.parse(extractJson((await analysisStream.text) || '')));
  console.log(JSON.stringify(analysis, null, 2));
  console.log();

  console.log('✅ All streaming object examples completed successfully!');
}

main().catch(console.error);

// Helpers
function extractJson(text: string): string {
  const match = text.match(/[\{\[][\s\S]*[\}\]]/);
  if (!match) throw new Error('No JSON found in model output');
  return match[0];
}

function tryParseJson(text: string): any | null {
  try {
    const jsonText = extractJson(text);
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}
