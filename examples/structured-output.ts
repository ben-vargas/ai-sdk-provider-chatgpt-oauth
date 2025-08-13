import { generateObject, streamObject } from 'ai';
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

  const { object: apiResponse } = await generateObject({
    model,
    schema: apiResponseSchema,
    prompt: 'Generate a successful API response for a user creation endpoint.',
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

  const { object: config } = await generateObject({
    model,
    schema: configSchema,
    prompt: 'Generate a production configuration for a Node.js web application.',
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

  const { object: extraction } = await generateObject({
    model,
    schema: extractionSchema,
    prompt: `Extract structured data from this text: ${text}`,
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

  const { object: form } = await generateObject({
    model,
    schema: formSchema,
    prompt: 'Generate a user registration form schema with proper validation rules.',
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

  const { object: queryResult } = await generateObject({
    model,
    schema: queryResultSchema,
    prompt: 'Generate a sample database query result for fetching user orders.',
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

  const { partialObjectStream, object: dataset } = await streamObject({
    model,
    schema: datasetSchema,
    prompt: 'Generate a time series dataset with 10 records showing temperature readings.',
  });

  console.log('Streaming dataset...');
  let recordCount = 0;
  
  for await (const partial of partialObjectStream) {
    if (partial.records && partial.records.length > recordCount) {
      recordCount = partial.records.length;
      console.log(`  Received ${recordCount} records...`);
    }
  }

  const finalDataset = await dataset;
  console.log('\nFinal Dataset:');
  console.log(JSON.stringify(finalDataset, null, 2));
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