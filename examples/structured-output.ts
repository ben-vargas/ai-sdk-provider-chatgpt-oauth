import { generateText, streamText } from 'ai';
import { createChatGPTOAuth } from '../src';
import { z } from 'zod';

async function main() {
  const provider = createChatGPTOAuth();
  const model = provider('gpt-5');

  console.log('=== ChatGPT OAuth: Structured Output Examples ===\n');
  console.log('Demonstrating various structured output patterns and use cases.\n');

  // Example 1: API Response Schema
  console.log('1️⃣  API Response Schema\n');
  
  const apiResponseSchema = z.object({
    status: z.enum(['success', 'error', 'pending']),
    code: z.number().int().min(100).max(599),
    message: z.string(),
    data: z.object({
      id: z.string().uuid(),
      timestamp: z.string().datetime(),
      payload: z.any().optional(),
    }).optional(),
    errors: z.array(z.object({
      field: z.string(),
      message: z.string(),
      code: z.string(),
    })).optional(),
  });

  const apiResponse = await generateJson({
    model,
    schema: apiResponseSchema,
    task: 'Generate a successful API response for a user creation endpoint.',
    shape: '{ "status": "success"|"error"|"pending", "code": number, "message": string, "data"?: { "id": string(uuid), "timestamp": string(datetime), "payload"?: any }, "errors"?: { "field": string, "message": string, "code": string }[] }',
  });

  console.log('API Response:');
  console.log(JSON.stringify(apiResponse, null, 2));
  console.log();

  // Example 2: Configuration File Schema
  console.log('2️⃣  Configuration File Schema\n');
  
  const configSchema = z.object({
    app: z.object({
      name: z.string(),
      version: z.string().regex(/^\d+\.\d+\.\d+$/),
      environment: z.enum(['development', 'staging', 'production']),
      debug: z.boolean(),
    }),
    server: z.object({
      host: z.string(),
      port: z.number().int().min(1).max(65535),
      ssl: z.object({
        enabled: z.boolean(),
        cert: z.string().optional(),
        key: z.string().optional(),
      }),
    }),
    database: z.object({
      type: z.enum(['postgres', 'mysql', 'mongodb']),
      host: z.string(),
      port: z.number(),
      name: z.string(),
      poolSize: z.number().int().min(1).max(100),
    }),
    features: z.record(z.boolean()),
  });

  const config = await generateJson({
    model,
    schema: configSchema,
    task: 'Generate a production configuration for a Node.js web application.',
    shape: '{ "app": { "name": string, "version": string(semver), "environment": "development"|"staging"|"production", "debug": boolean }, "server": { "host": string, "port": number, "ssl": { "enabled": boolean, "cert"?: string, "key"?: string } }, "database": { "type": "postgres"|"mysql"|"mongodb", "host": string, "port": number, "name": string, "poolSize": number }, "features": Record<string, boolean> }',
  });

  console.log('Configuration:');
  console.log(JSON.stringify(config, null, 2));
  console.log();

  // Example 3: Data Extraction from Text
  console.log('3️⃣  Data Extraction from Text\n');
  
  const extractionSchema = z.object({
    entities: z.array(z.object({
      type: z.enum(['person', 'organization', 'location', 'date', 'product']),
      value: z.string(),
      context: z.string().optional(),
    })),
    sentiment: z.enum(['positive', 'negative', 'neutral']),
    keyPhrases: z.array(z.string()),
    summary: z.string().max(200),
  });

  const text = `
    Apple Inc. announced today that Tim Cook will be presenting the new iPhone 15 
    at their Cupertino headquarters on September 12, 2024. The event is expected 
    to showcase significant improvements in camera technology and battery life. 
    Industry analysts from Goldman Sachs predict strong sales in the holiday season.
  `;

  const extraction = await generateJson({
    model,
    schema: extractionSchema,
    task: `Extract structured data from this text: ${text}`,
    shape: '{ "entities": { "type": "person"|"organization"|"location"|"date"|"product", "value": string, "context"?: string }[], "sentiment": "positive"|"negative"|"neutral", "keyPhrases": string[], "summary": string }',
  });

  console.log('Extracted Data:');
  console.log(JSON.stringify(extraction, null, 2));
  console.log();

  // Example 4: Form Validation Schema
  console.log('4️⃣  Form Validation Schema\n');
  
  const formSchema = z.object({
    fields: z.array(z.object({
      name: z.string(),
      type: z.enum(['text', 'email', 'password', 'number', 'date', 'select', 'checkbox']),
      label: z.string(),
      placeholder: z.string().optional(),
      required: z.boolean(),
      validation: z.object({
        minLength: z.number().optional(),
        maxLength: z.number().optional(),
        pattern: z.string().optional(),
        min: z.number().optional(),
        max: z.number().optional(),
      }).optional(),
      options: z.array(z.object({
        value: z.string(),
        label: z.string(),
      })).optional(),
    })),
    submitButton: z.object({
      text: z.string(),
      action: z.string(),
    }),
  });

  const form = await generateJson({
    model,
    schema: formSchema,
    task: 'Generate a user registration form schema with proper validation rules.',
    shape: '{ "fields": { "name": string, "type": "text"|"email"|"password"|"number"|"date"|"select"|"checkbox", "label": string, "placeholder"?: string, "required": boolean, "validation"?: { "minLength"?: number, "maxLength"?: number, "pattern"?: string, "min"?: number, "max"?: number }, "options"?: { "value": string, "label": string }[] }[], "submitButton": { "text": string, "action": string } }',
  });

  console.log('Form Schema:');
  console.log(JSON.stringify(form, null, 2));
  console.log();

  // Example 5: Database Query Result
  console.log('5️⃣  Database Query Result\n');
  
  const queryResultSchema = z.object({
    query: z.string(),
    executionTime: z.number().describe('Execution time in milliseconds'),
    rowCount: z.number(),
    rows: z.array(z.record(z.any())),
    metadata: z.object({
      database: z.string(),
      table: z.string(),
      indexes: z.array(z.string()),
    }),
  });

  const queryResult = await generateJson({
    model,
    schema: queryResultSchema,
    task: 'Generate a sample database query result for fetching user orders.',
    shape: '{ "query": string, "executionTime": number, "rowCount": number, "rows": Record<string, any>[], "metadata": { "database": string, "table": string, "indexes": string[] } }',
  });

  console.log('Query Result:');
  console.log(JSON.stringify(queryResult, null, 2));
  console.log();

  // Example 6: Streaming Large Dataset
  console.log('6️⃣  Streaming Large Dataset\n');
  
  const datasetSchema = z.object({
    metadata: z.object({
      title: z.string(),
      description: z.string(),
      recordCount: z.number(),
      createdAt: z.string().datetime(),
    }),
    records: z.array(z.object({
      id: z.number(),
      timestamp: z.string().datetime(),
      value: z.number(),
      category: z.string(),
      tags: z.array(z.string()),
    })),
    statistics: z.object({
      mean: z.number(),
      median: z.number(),
      standardDeviation: z.number(),
      min: z.number(),
      max: z.number(),
    }),
  });
  console.log('Streaming dataset...');
  const stream = await streamText({
    model,
    prompt: [
      'You MUST output ONLY valid JSON and nothing else.',
      'Do not use code fences, markdown, or explanations.',
      'The first character must be { and the last must be }.',
      'Return JSON matching the required schema exactly.',
      'Expected JSON shape: { "metadata": { "title": string, "description": string, "recordCount": number, "createdAt": string(datetime) }, "records": { "id": number, "timestamp": string(datetime), "value": number, "category": string, "tags": string[] }[], "statistics": { "mean": number, "median": number, "standardDeviation": number, "min": number, "max": number } }',
      '',
      'Task: Generate a time series dataset with 10 records showing temperature readings.',
    ].join('\n'),
  });

  let buffer = '';
  let lastCount = 0;
  for await (const chunk of stream.textStream) {
    buffer += chunk;
    const partial = tryParseJson(buffer);
    if (partial && Array.isArray(partial.records)) {
      const n = partial.records.length;
      if (n > lastCount) {
        lastCount = n;
        console.log(`  Received ${n} records...`);
      }
    }
  }

  const finalText = await stream.text;
  const dataset = datasetSchema.parse(JSON.parse(extractJson(finalText || '')));
  console.log('\nFinal Dataset:');
  console.log(JSON.stringify(dataset, null, 2));
  console.log();

  console.log('✅ All structured output examples completed successfully!');
  console.log('\n💡 Tips for structured output:');
  console.log('- Use detailed descriptions in your schema for better results');
  console.log('- Break complex objects into smaller, nested structures');
  console.log('- Use enums for fields with known possible values');
  console.log('- Add validation constraints to ensure data quality');
  console.log('- Stream large objects to show progress to users');
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

async function generateJson<T>({
  model,
  schema,
  task,
  shape,
}: {
  model: any;
  schema: z.ZodType<T>;
  task: string;
  shape?: string;
}): Promise<T> {
  const prompt = [
    'You MUST output ONLY valid JSON and nothing else.',
    'Do not use code fences, markdown, or explanations.',
    'The first character must be { and the last must be }.',
    'Return JSON matching the required schema exactly.',
    shape ? `Expected JSON shape: ${shape}` : undefined,
    '',
    `Task: ${task}`,
  ].filter(Boolean).join('\n');

  const res = await generateText({ model, prompt });
  const jsonText = extractJson(res.text || '');
  const parsed = JSON.parse(jsonText);
  return schema.parse(parsed);
}
