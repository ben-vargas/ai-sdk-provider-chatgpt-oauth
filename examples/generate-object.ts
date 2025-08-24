import { generateText } from 'ai';
import { createChatGPTOAuth } from '../src';
import { z } from 'zod';

async function main() {
  const provider = createChatGPTOAuth();
  const model = provider('gpt-5');

  console.log('=== ChatGPT OAuth: Object Generation Examples ===\n');

  // Example 1: Simple object generation
  console.log('1️⃣  Simple Object Generation\n');
  
  const recipeSchema = z.object({
    name: z.string().describe('Name of the recipe'),
    ingredients: z.array(z.string()).describe('List of ingredients'),
    cookingTime: z.number().describe('Cooking time in minutes'),
    difficulty: z.enum(['easy', 'medium', 'hard']).describe('Difficulty level'),
  });
  const recipe = await generateJson({
    model,
    schema: recipeSchema,
    task: 'Generate a simple pasta recipe.',
    shape: '{ "name": string, "ingredients": string[], "cookingTime": number, "difficulty": "easy"|"medium"|"hard" }',
  });

  console.log('Generated recipe:');
  console.log(JSON.stringify(recipe, null, 2));
  console.log();

  // Example 2: Nested object structure
  console.log('2️⃣  Nested Object Structure\n');
  
  const userSchema = z.object({
    id: z.string().describe('Unique user ID'),
    name: z.string().describe('Full name'),
    email: z.string().email().describe('Email address'),
    profile: z.object({
      bio: z.string().describe('User biography'),
      avatar: z.string().url().describe('Avatar URL'),
      socialLinks: z.object({
        twitter: z.string().url().optional(),
        github: z.string().url().optional(),
        linkedin: z.string().url().optional(),
      }).describe('Social media links'),
    }),
    preferences: z.object({
      theme: z.enum(['light', 'dark', 'auto']),
      language: z.string(),
      notifications: z.boolean(),
    }),
  });
  const user = await generateJson({
    model,
    schema: userSchema,
    task: 'Generate a complete user profile for a software developer.',
    shape: '{ "id": string, "name": string, "email": string, "profile": { "bio": string, "avatar": string(url), "socialLinks": { "twitter"?: string(url), "github"?: string(url), "linkedin"?: string(url) } }, "preferences": { "theme": "light"|"dark"|"auto", "language": string, "notifications": boolean } }',
  });

  console.log('Generated user profile:');
  console.log(JSON.stringify(user, null, 2));
  console.log();

  // Example 3: Array of objects
  console.log('3️⃣  Array of Objects\n');
  
  const todoSchema = z.object({
    title: z.string().describe('Todo list title'),
    tasks: z.array(z.object({
      id: z.number().describe('Task ID'),
      title: z.string().describe('Task title'),
      description: z.string().describe('Task description'),
      priority: z.enum(['low', 'medium', 'high']),
      completed: z.boolean(),
      dueDate: z.string().describe('Due date in ISO format'),
    })).describe('List of tasks'),
    createdAt: z.string().describe('Creation timestamp'),
  });
  const todoList = await generateJson({
    model,
    schema: todoSchema,
    task: 'Generate a todo list for a web development project with 5 tasks.',
    shape: '{ "title": string, "tasks": { "id": number, "title": string, "description": string, "priority": "low"|"medium"|"high", "completed": boolean, "dueDate": string }[], "createdAt": string }',
  });

  console.log('Generated todo list:');
  console.log(JSON.stringify(todoList, null, 2));
  console.log();

  // Example 4: Optional fields and validation
  console.log('4️⃣  Optional Fields and Validation\n');
  
  const productSchema = z.object({
    name: z.string().min(3).max(100).describe('Product name'),
    price: z.number().positive().describe('Price in USD'),
    description: z.string().describe('Product description'),
    category: z.string().describe('Product category'),
    tags: z.array(z.string()).min(1).max(5).describe('Product tags'),
    discount: z.number().min(0).max(100).optional().describe('Discount percentage'),
    inStock: z.boolean().describe('Stock availability'),
    specifications: z.record(z.string()).optional().describe('Technical specifications'),
  });
  const product = await generateJson({
    model,
    schema: productSchema,
    task: 'Generate a product listing for a high-end mechanical keyboard.',
    shape: '{ "name": string, "price": number, "description": string, "category": string, "tags": string[] (length 1-5, no more than 5), "discount"?: number, "inStock": boolean, "specifications"?: Record<string,string> }',
  });

  console.log('Generated product:');
  console.log(JSON.stringify(product, null, 2));
  console.log();

  // Example 5: Complex business object
  console.log('5️⃣  Complex Business Object\n');
  
  const invoiceSchema = z.object({
    invoiceNumber: z.string().describe('Unique invoice number'),
    date: z.string().describe('Invoice date in ISO format'),
    dueDate: z.string().describe('Payment due date in ISO format'),
    client: z.object({
      name: z.string(),
      email: z.string().email(),
      address: z.object({
        street: z.string(),
        city: z.string(),
        state: z.string(),
        zipCode: z.string(),
        country: z.string(),
      }),
    }),
    items: z.array(z.object({
      description: z.string(),
      quantity: z.number().positive(),
      unitPrice: z.number().positive(),
      total: z.number().positive(),
    })).min(1),
    subtotal: z.number().positive(),
    tax: z.number().min(0),
    total: z.number().positive(),
    status: z.enum(['draft', 'sent', 'paid', 'overdue']),
    notes: z.string().optional(),
  });
  const invoice = await generateJson({
    model,
    schema: invoiceSchema,
    task: 'Generate an invoice for web development services with 3 line items.',
    shape: '{ "invoiceNumber": string, "date": string, "dueDate": string, "client": { "name": string, "email": string, "address": { "street": string, "city": string, "state": string, "zipCode": string, "country": string } }, "items": { "description": string, "quantity": number, "unitPrice": number, "total": number }[], "subtotal": number, "tax": number, "total": number, "status": "draft"|"sent"|"paid"|"overdue", "notes"?: string }',
  });

  console.log('Generated invoice:');
  console.log(JSON.stringify(invoice, null, 2));
  console.log();

  console.log('✅ All object generation examples completed successfully!');
}

main().catch(console.error);

// Helpers
function extractJson(text: string): string {
  const match = text.match(/[\{\[][\s\S]*[\}\]]/);
  if (!match) throw new Error('No JSON found in model output');
  return match[0];
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
