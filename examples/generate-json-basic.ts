#!/usr/bin/env bun
/**
 * Basic JSON Generation with ChatGPT OAuth
 * 
 * This example demonstrates fundamental JSON generation patterns using
 * prompt engineering, since generateObject is not supported by the backend.
 * 
 * Topics covered:
 * - Simple objects with primitive types
 * - Basic arrays
 * - Optional fields
 * - Clear prompt instructions for JSON output
 */

import { generateText } from 'ai';
import { createChatGPTOAuth } from '../src';
import { z } from 'zod';

const chatgptOAuth = createChatGPTOAuth();

console.log('🎯 ChatGPT OAuth: Basic JSON Generation\n');
console.log('=' .repeat(60));

// Helper function to extract and parse JSON from response
function parseJSON(text: string): any {
  const trimmed = text.trim();
  // Try to find JSON in the response
  const jsonMatch = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('No valid JSON found in response');
}

// Example 1: Simple object with primitives
async function example1_simpleObject() {
  console.log('\n1️⃣  Simple Object with Primitives\n');
  
  const result = await generateText({
    model: chatgptOAuth('gpt-5'),
    prompt: `Generate a profile for a software developer named Sarah.

OUTPUT ONLY JSON with these exact fields:
{
  "name": "string (full name)",
  "age": number (age in years),
  "email": "string (valid email)",
  "isActive": boolean (account status)
}

JSON OUTPUT:`,
  });

  try {
    const profile = parseJSON(result.text);
    console.log('Generated profile:');
    console.log(JSON.stringify(profile, null, 2));
    
    // Validate with Zod
    const schema = z.object({
      name: z.string(),
      age: z.number(),
      email: z.string().email(),
      isActive: z.boolean(),
    });
    schema.parse(profile);
    console.log('✅ Valid structure\n');
  } catch (e) {
    console.error('❌ Failed:', e.message, '\n');
  }
}

// Example 2: Object with arrays
async function example2_arrays() {
  console.log('2️⃣  Object with Arrays\n');
  
  const result = await generateText({
    model: chatgptOAuth('gpt-5'),
    prompt: `Generate data for a web development team working on e-commerce projects.

RETURN ONLY THIS JSON STRUCTURE:
{
  "teamName": "string",
  "members": ["name1", "name2", "name3"],
  "technologies": ["tech1", "tech2", ...],
  "projectCount": number
}

JSON:`,
  });

  try {
    const team = parseJSON(result.text);
    console.log('Generated team:');
    console.log(JSON.stringify(team, null, 2));
    
    const schema = z.object({
      teamName: z.string(),
      members: z.array(z.string()),
      technologies: z.array(z.string()),
      projectCount: z.number(),
    });
    schema.parse(team);
    console.log('✅ Valid structure\n');
  } catch (e) {
    console.error('❌ Failed:', e.message, '\n');
  }
}

// Example 3: Optional fields
async function example3_optionalFields() {
  console.log('3️⃣  Object with Optional Fields\n');
  
  const result = await generateText({
    model: chatgptOAuth('gpt-5'),
    prompt: `Generate a product listing for a wireless keyboard.

OUTPUT JSON MATCHING THIS SCHEMA:
{
  "productName": "string",
  "price": number (USD),
  "description": "string",
  "discount": number or null (percentage if on sale),
  "tags": ["tag1", "tag2"] or null,
  "inStock": boolean
}

Include discount only if product is on sale.
Include tags only if relevant.

JSON:`,
  });

  try {
    const product = parseJSON(result.text);
    console.log('Generated product:');
    console.log(JSON.stringify(product, null, 2));
    
    const schema = z.object({
      productName: z.string(),
      price: z.number(),
      description: z.string(),
      discount: z.number().nullable(),
      tags: z.array(z.string()).nullable(),
      inStock: z.boolean(),
    });
    schema.parse(product);
    console.log('✅ Valid structure\n');
  } catch (e) {
    console.error('❌ Failed:', e.message, '\n');
  }
}

// Example 4: Different data types
async function example4_dataTypes() {
  console.log('4️⃣  Various Data Types\n');
  
  const result = await generateText({
    model: chatgptOAuth('gpt-5'),
    prompt: `Generate a user account with various field types.

STRICT JSON FORMAT REQUIRED:
{
  "id": "string (UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)",
  "username": "string (3-20 characters)",
  "score": number (integer 0-100),
  "price": number (positive decimal),
  "status": "pending" | "active" | "suspended",
  "role": "user" | "admin" | "moderator",
  "createdAt": "string (ISO 8601 date)",
  "website": "string (URL)" or null
}

OUTPUT ONLY JSON:`,
  });

  try {
    const account = parseJSON(result.text);
    console.log('Generated account:');
    console.log(JSON.stringify(account, null, 2));
    
    const schema = z.object({
      id: z.string().uuid(),
      username: z.string().min(3).max(20),
      score: z.number().int().min(0).max(100),
      price: z.number().positive(),
      status: z.enum(['pending', 'active', 'suspended']),
      role: z.enum(['user', 'admin', 'moderator']),
      createdAt: z.string(),
      website: z.string().url().nullable(),
    });
    schema.parse(account);
    console.log('✅ Valid structure\n');
  } catch (e) {
    console.error('❌ Failed:', e.message, '\n');
  }
}

// Example 5: Best practices demonstration
async function example5_bestPractices() {
  console.log('5️⃣  Best Practices\n');
  
  // Good: Clear instructions, explicit format, examples
  const result = await generateText({
    model: chatgptOAuth('gpt-5'),
    prompt: `Generate metadata for a technical blog post about TypeScript best practices.

REQUIREMENTS:
- Title should be engaging (50-100 chars)
- Summary should be brief (max 200 chars)
- Include 3-5 relevant tags

EXACT JSON FORMAT:
{
  "title": "string",
  "summary": "string",
  "readingTime": number (minutes),
  "tags": ["tag1", "tag2", "tag3"]
}

EXAMPLE OUTPUT:
{
  "title": "Mastering TypeScript: Advanced Patterns",
  "summary": "Learn advanced TypeScript patterns including generics, conditional types, and decorators",
  "readingTime": 8,
  "tags": ["typescript", "programming", "web-development"]
}

NOW GENERATE NEW METADATA AS JSON:`,
  });

  try {
    const metadata = parseJSON(result.text);
    console.log('Well-structured generation:');
    console.log(JSON.stringify(metadata, null, 2));
    console.log('\n✨ Notice how clear instructions and examples lead to reliable JSON output!\n');
  } catch (e) {
    console.error('❌ Failed:', e.message, '\n');
  }
}

// Main execution
async function main() {
  try {
    await example1_simpleObject();
    await example2_arrays();
    await example3_optionalFields();
    await example4_dataTypes();
    await example5_bestPractices();
    
    console.log('=' .repeat(60));
    console.log('✅ All basic examples completed successfully!');
    console.log('\n📚 Key Takeaways:');
    console.log('- Always specify "OUTPUT ONLY JSON" or similar');
    console.log('- Provide exact schema structure in the prompt');
    console.log('- Use examples for complex structures');
    console.log('- Validate with Zod for type safety');
    console.log('- Extract JSON from response if needed');
    console.log('\n💡 Next steps:');
    console.log('- Try generate-json-nested.ts for complex structures');
    console.log('- See generate-json-advanced.ts for production patterns');
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n💡 Tip: Make sure you have valid ChatGPT OAuth credentials');
    console.log('Check ~/.codex/auth.json or run: codex login');
  }
}

main().catch(console.error);