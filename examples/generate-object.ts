import { generateObject } from 'ai';
import { createChatGPTOAuth } from '../src';
import { z } from 'zod';

async function main() {
  const provider = createChatGPTOAuth();
  const model = provider('gpt-5');

  console.log('=== ChatGPT OAuth: Object Generation Examples ===\n');

  // Example 1: Simple object generation
  console.log('1️⃣  Simple Object Generation\n');
  
  const { object: recipe } = await generateObject({
    model,
    schema: z.object({
      name: z.string().describe('Name of the recipe'),
      ingredients: z.array(z.string()).describe('List of ingredients'),
      cookingTime: z.number().describe('Cooking time in minutes'),
      difficulty: z.enum(['easy', 'medium', 'hard']).describe('Difficulty level'),
    }),
    prompt: 'Generate a simple pasta recipe.',
  });

  console.log('Generated recipe:');
  console.log(JSON.stringify(recipe, null, 2));
  console.log();

  // Example 2: Nested object structure
  console.log('2️⃣  Nested Object Structure\n');
  
  const { object: user } = await generateObject({
    model,
    schema: z.object({
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
    }),
    prompt: 'Generate a complete user profile for a software developer.',
  });

  console.log('Generated user profile:');
  console.log(JSON.stringify(user, null, 2));
  console.log();

  // Example 3: Array of objects
  console.log('3️⃣  Array of Objects\n');
  
  const { object: todoList } = await generateObject({
    model,
    schema: z.object({
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
    }),
    prompt: 'Generate a todo list for a web development project with 5 tasks.',
  });

  console.log('Generated todo list:');
  console.log(JSON.stringify(todoList, null, 2));
  console.log();

  // Example 4: Optional fields and validation
  console.log('4️⃣  Optional Fields and Validation\n');
  
  const { object: product } = await generateObject({
    model,
    schema: z.object({
      name: z.string().min(3).max(100).describe('Product name'),
      price: z.number().positive().describe('Price in USD'),
      description: z.string().describe('Product description'),
      category: z.string().describe('Product category'),
      tags: z.array(z.string()).min(1).max(5).describe('Product tags'),
      discount: z.number().min(0).max(100).optional().describe('Discount percentage'),
      inStock: z.boolean().describe('Stock availability'),
      specifications: z.record(z.string()).optional().describe('Technical specifications'),
    }),
    prompt: 'Generate a product listing for a high-end mechanical keyboard.',
  });

  console.log('Generated product:');
  console.log(JSON.stringify(product, null, 2));
  console.log();

  // Example 5: Complex business object
  console.log('5️⃣  Complex Business Object\n');
  
  const { object: invoice } = await generateObject({
    model,
    schema: z.object({
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
    }),
    prompt: 'Generate an invoice for web development services with 3 line items.',
  });

  console.log('Generated invoice:');
  console.log(JSON.stringify(invoice, null, 2));
  console.log();

  console.log('✅ All object generation examples completed successfully!');
}

main().catch(console.error);