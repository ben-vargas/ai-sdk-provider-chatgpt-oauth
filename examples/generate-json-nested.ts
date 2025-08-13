#!/usr/bin/env bun
/**
 * Nested JSON Generation with ChatGPT OAuth
 * 
 * Demonstrates complex nested JSON generation using prompt engineering.
 * Since generateObject is not supported, we use explicit prompts to
 * achieve structured output.
 * 
 * Topics covered:
 * - Multi-level nested structures
 * - Arrays of objects
 * - Complex business logic structures
 * - Real-world use cases
 */

import { generateText } from 'ai';
import { createChatGPTOAuth } from '../src';
import { z } from 'zod';

const chatgptOAuth = createChatGPTOAuth();

console.log('🏗️  ChatGPT OAuth: Nested JSON Generation\n');
console.log('=' .repeat(60));

// Helper to extract and validate JSON
async function generateJSON<T>(
  prompt: string,
  schema: z.ZodType<T>
): Promise<T> {
  const result = await generateText({
    model: chatgptOAuth('gpt-5'),
    prompt,
  });
  
  const text = result.text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }
  
  const parsed = JSON.parse(jsonMatch[0]);
  return schema.parse(parsed);
}

// Example 1: Multi-level nested structure
async function example1_deepNesting() {
  console.log('\n1️⃣  Deep Nested Structure\n');
  
  const CompanySchema = z.object({
    company: z.object({
      name: z.string(),
      founded: z.number(),
      headquarters: z.object({
        address: z.object({
          street: z.string(),
          city: z.string(),
          state: z.string(),
          zipCode: z.string(),
          country: z.string(),
        }),
        coordinates: z.object({
          latitude: z.number(),
          longitude: z.number(),
        }),
      }),
      departments: z.array(z.object({
        name: z.string(),
        headCount: z.number(),
        manager: z.object({
          name: z.string(),
          email: z.string().email(),
          yearsExperience: z.number(),
        }),
        teams: z.array(z.object({
          name: z.string(),
          members: z.number(),
          focus: z.string(),
        })),
      })),
    }),
  });

  const prompt = `Generate a tech company structure with exactly 2 departments, each having 2 teams.

OUTPUT ONLY THIS EXACT JSON STRUCTURE:
{
  "company": {
    "name": "string",
    "founded": number (year),
    "headquarters": {
      "address": {
        "street": "string",
        "city": "string",
        "state": "string",
        "zipCode": "string",
        "country": "string"
      },
      "coordinates": {
        "latitude": number,
        "longitude": number
      }
    },
    "departments": [
      {
        "name": "string",
        "headCount": number,
        "manager": {
          "name": "string",
          "email": "valid@email.com",
          "yearsExperience": number
        },
        "teams": [
          {
            "name": "string",
            "members": number,
            "focus": "string"
          }
        ]
      }
    ]
  }
}

IMPORTANT: Generate exactly 2 departments with 2 teams each.
JSON OUTPUT:`;

  try {
    const company = await generateJSON(prompt, CompanySchema);
    console.log('Generated company structure:');
    console.log(JSON.stringify(company, null, 2));
    console.log('✅ Valid nested structure\n');
  } catch (e) {
    console.error('❌ Failed:', e.message, '\n');
  }
}

// Example 2: E-commerce order structure
async function example2_ecommerceOrder() {
  console.log('2️⃣  E-commerce Order Structure\n');
  
  const OrderSchema = z.object({
    orderId: z.string(),
    orderDate: z.string(),
    status: z.enum(['pending', 'processing', 'shipped', 'delivered']),
    customer: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().email(),
      shippingAddress: z.object({
        street: z.string(),
        city: z.string(),
        state: z.string(),
        zipCode: z.string(),
        country: z.string(),
      }),
    }),
    items: z.array(z.object({
      productId: z.string(),
      productName: z.string(),
      quantity: z.number().int().positive(),
      unitPrice: z.number().positive(),
      subtotal: z.number().positive(),
    })),
    totals: z.object({
      subtotal: z.number(),
      tax: z.number(),
      shipping: z.number(),
      total: z.number(),
    }),
  });

  const prompt = `Generate an e-commerce order with 3 items and customer details.

STRICT JSON FORMAT:
{
  "orderId": "string (ORD-XXXXXX format)",
  "orderDate": "string (ISO 8601)",
  "status": "pending" | "processing" | "shipped" | "delivered",
  "customer": {
    "id": "string",
    "name": "string",
    "email": "valid@email.com",
    "shippingAddress": {
      "street": "string",
      "city": "string",
      "state": "string",
      "zipCode": "string",
      "country": "string"
    }
  },
  "items": [
    {
      "productId": "string",
      "productName": "string",
      "quantity": number,
      "unitPrice": number,
      "subtotal": number
    }
  ],
  "totals": {
    "subtotal": number,
    "tax": number,
    "shipping": number,
    "total": number
  }
}

Generate with exactly 3 items. Calculate totals correctly.
OUTPUT ONLY JSON:`;

  try {
    const order = await generateJSON(prompt, OrderSchema);
    console.log('Generated order:');
    console.log(JSON.stringify(order, null, 2));
    console.log('✅ Valid order structure\n');
  } catch (e) {
    console.error('❌ Failed:', e.message, '\n');
  }
}

// Example 3: Blog post with metadata
async function example3_blogPost() {
  console.log('3️⃣  Blog Post with Rich Metadata\n');
  
  const BlogPostSchema = z.object({
    post: z.object({
      id: z.string(),
      title: z.string(),
      slug: z.string(),
      author: z.object({
        id: z.string(),
        name: z.string(),
        bio: z.string(),
        social: z.object({
          twitter: z.string().optional(),
          github: z.string().optional(),
        }),
      }),
      content: z.object({
        summary: z.string(),
        sections: z.array(z.object({
          heading: z.string(),
          body: z.string(),
        })),
      }),
      metadata: z.object({
        readingTime: z.number(),
        wordCount: z.number(),
        category: z.string(),
        tags: z.array(z.string()),
      }),
    }),
  });

  const prompt = `Generate a technical blog post about TypeScript generics with 2 sections.

EXACT JSON STRUCTURE REQUIRED:
{
  "post": {
    "id": "string",
    "title": "string",
    "slug": "string (URL-friendly)",
    "author": {
      "id": "string",
      "name": "string",
      "bio": "string (one sentence)",
      "social": {
        "twitter": "string (optional, include if present)",
        "github": "string (optional, include if present)"
      }
    },
    "content": {
      "summary": "string (2-3 sentences)",
      "sections": [
        {
          "heading": "string",
          "body": "string (paragraph)"
        }
      ]
    },
    "metadata": {
      "readingTime": number (minutes),
      "wordCount": number,
      "category": "string",
      "tags": ["tag1", "tag2", "tag3"]
    }
  }
}

Create exactly 2 sections about TypeScript generics.
OUTPUT ONLY JSON:`;

  try {
    const post = await generateJSON(prompt, BlogPostSchema);
    console.log('Generated blog post:');
    console.log(JSON.stringify(post, null, 2));
    console.log('✅ Valid blog structure\n');
  } catch (e) {
    console.error('❌ Failed:', e.message, '\n');
  }
}

// Example 4: Configuration file structure
async function example4_configFile() {
  console.log('4️⃣  Application Configuration\n');
  
  const ConfigSchema = z.object({
    application: z.object({
      name: z.string(),
      version: z.string(),
      environment: z.enum(['development', 'staging', 'production']),
    }),
    server: z.object({
      host: z.string(),
      port: z.number(),
      ssl: z.object({
        enabled: z.boolean(),
        certificate: z.string().optional(),
        key: z.string().optional(),
      }),
    }),
    database: z.object({
      primary: z.object({
        type: z.enum(['postgresql', 'mysql', 'mongodb']),
        host: z.string(),
        port: z.number(),
        name: z.string(),
        pool: z.object({
          min: z.number(),
          max: z.number(),
        }),
      }),
    }),
    features: z.object({
      authentication: z.object({
        enabled: z.boolean(),
        providers: z.array(z.enum(['local', 'google', 'github'])),
      }),
    }),
  });

  const prompt = `Generate a production application configuration with PostgreSQL database.

REQUIRED JSON FORMAT:
{
  "application": {
    "name": "string",
    "version": "string (semver)",
    "environment": "development" | "staging" | "production"
  },
  "server": {
    "host": "string",
    "port": number,
    "ssl": {
      "enabled": boolean,
      "certificate": "string (optional, only if enabled)",
      "key": "string (optional, only if enabled)"
    }
  },
  "database": {
    "primary": {
      "type": "postgresql" | "mysql" | "mongodb",
      "host": "string",
      "port": number,
      "name": "string",
      "pool": {
        "min": number,
        "max": number
      }
    }
  },
  "features": {
    "authentication": {
      "enabled": boolean,
      "providers": ["local", "google", "github"]
    }
  }
}

Use PostgreSQL on port 5432, production environment.
OUTPUT ONLY JSON:`;

  try {
    const config = await generateJSON(prompt, ConfigSchema);
    console.log('Generated configuration:');
    console.log(JSON.stringify(config, null, 2));
    console.log('✅ Valid config structure\n');
  } catch (e) {
    console.error('❌ Failed:', e.message, '\n');
  }
}

// Main execution
async function main() {
  try {
    console.log('\n🚀 Demonstrating complex nested JSON generation');
    console.log('   using prompt engineering with ChatGPT OAuth...\n');

    await example1_deepNesting();
    await example2_ecommerceOrder();
    await example3_blogPost();
    await example4_configFile();
    
    console.log('=' .repeat(60));
    console.log('✅ All nested examples completed successfully!');
    console.log('\n🎯 Key Insights:');
    console.log('- Deep nesting works with clear prompt structure');
    console.log('- Arrays of objects need explicit formatting');
    console.log('- Complex schemas require detailed prompts');
    console.log('- Validation with Zod ensures type safety');
    console.log('\n💡 Important: While we can\'t use generateObject,');
    console.log('   prompt engineering achieves similar results!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
  }
}

main().catch(console.error);