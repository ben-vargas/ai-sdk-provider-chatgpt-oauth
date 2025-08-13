import { streamObject } from 'ai';
import { createChatGPTOAuth } from '../src';
import { z } from 'zod';

async function main() {
  const provider = createChatGPTOAuth();
  const model = provider('gpt-5');

  console.log('=== ChatGPT OAuth: Streaming Object Generation ===\n');

  // Example 1: Stream a simple object
  console.log('1️⃣  Streaming Simple Object\n');
  
  const { partialObjectStream, object: finalRecipe } = await streamObject({
    model,
    schema: z.object({
      name: z.string().describe('Recipe name'),
      ingredients: z.array(z.string()).describe('List of ingredients'),
      steps: z.array(z.string()).describe('Cooking steps'),
      servings: z.number().describe('Number of servings'),
    }),
    prompt: 'Generate a detailed recipe for chocolate chip cookies.',
  });

  console.log('Streaming recipe...\n');
  
  for await (const partialObject of partialObjectStream) {
    // Clear the console and show the partial object as it builds
    console.clear();
    console.log('=== Partial Recipe (Building...) ===');
    console.log(JSON.stringify(partialObject, null, 2));
  }

  console.log('\n=== Final Recipe ===');
  console.log(JSON.stringify(await finalRecipe, null, 2));
  console.log();

  // Example 2: Stream a complex nested object
  console.log('2️⃣  Streaming Complex Object\n');
  
  const { partialObjectStream: projectStream, object: finalProject } = await streamObject({
    model,
    schema: z.object({
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
    }),
    prompt: 'Generate a software development project plan for building a mobile app.',
  });

  console.log('Streaming project plan...\n');
  
  let updateCount = 0;
  for await (const partialObject of projectStream) {
    updateCount++;
    console.log(`Update ${updateCount}: Received partial data...`);
    
    // Show what fields have been populated so far
    const fields = Object.keys(partialObject);
    console.log(`  Fields populated: ${fields.join(', ')}`);
    
    // Show array lengths if arrays are being populated
    if (partialObject.team) {
      console.log(`  Team members: ${partialObject.team.length}`);
    }
    if (partialObject.milestones) {
      console.log(`  Milestones: ${partialObject.milestones.length}`);
    }
  }

  console.log('\n=== Final Project Plan ===');
  const project = await finalProject;
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

  const { partialObjectStream: analysisStream, object: finalAnalysis } = await streamObject({
    model,
    schema,
    prompt: 'Generate a SWOT analysis for a startup entering the AI market.',
  });

  console.log('Streaming SWOT analysis...\n');
  
  const expectedFields = Object.keys(schema.shape);
  const completedFields = new Set<string>();
  
  for await (const partialObject of analysisStream) {
    const currentFields = Object.keys(partialObject);
    
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
  const analysis = await finalAnalysis;
  console.log(JSON.stringify(analysis, null, 2));
  console.log();

  console.log('✅ All streaming object examples completed successfully!');
}

main().catch(console.error);