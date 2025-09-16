#!/usr/bin/env bun
/**
 * Basic JSON Generation with GPT-5 Codex via ChatGPT OAuth
 *
 * Mirrors generate-json-basic.ts but targets the gpt-5-codex model.
 */

import { generateText } from 'ai';
import { createChatGPTOAuth } from '../src';
import { z } from 'zod';

const chatgptOAuth = createChatGPTOAuth();

console.log('🎯 GPT-5 Codex: Basic JSON Generation\n');
console.log('=' .repeat(60));

function parseJSON(text: string): any {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('No valid JSON found in response');
}

async function example1_simpleObject() {
  console.log('\n1️⃣  Simple Object with Primitives\n');

  const result = await generateText({
    model: chatgptOAuth('gpt-5-codex'),
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

    const schema = z.object({
      name: z.string(),
      age: z.number(),
      email: z.string().email(),
      isActive: z.boolean(),
    });
    schema.parse(profile);
    console.log('✅ Valid structure\n');
  } catch (e) {
    console.error('❌ Failed:', (e as Error).message, '\n');
  }
}

async function example2_arrays() {
  console.log('2️⃣  Object with Arrays\n');

  const result = await generateText({
    model: chatgptOAuth('gpt-5-codex'),
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
    console.error('❌ Failed:', (e as Error).message, '\n');
  }
}

async function example3_optionalFields() {
  console.log('3️⃣  Object with Optional Fields\n');

  const result = await generateText({
    model: chatgptOAuth('gpt-5-codex'),
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
    console.error('❌ Failed:', (e as Error).message, '\n');
  }
}

async function example4_dataTypes() {
  console.log('4️⃣  Various Data Types\n');

  const result = await generateText({
    model: chatgptOAuth('gpt-5-codex'),
    prompt: `Generate a user account with various field types.

JSON STRUCTURE:
{
  "id": "string (UUID)",
  "username": "string",
  "score": number,
  "price": number,
  "status": "active" | "inactive" | "pending",
  "role": "admin" | "moderator" | "user",
  "createdAt": "ISO timestamp",
  "website": "string (URL)"
}

JSON ONLY:`,
  });

  try {
    const account = parseJSON(result.text);
    console.log('Generated account:');
    console.log(JSON.stringify(account, null, 2));

    const schema = z.object({
      id: z.string(),
      username: z.string(),
      score: z.number(),
      price: z.number(),
      status: z.enum(['active', 'inactive', 'pending']),
      role: z.enum(['admin', 'moderator', 'user']),
      createdAt: z.string(),
      website: z.string().url(),
    });
    schema.parse(account);
    console.log('✅ Valid structure\n');
  } catch (e) {
    console.error('❌ Failed:', (e as Error).message, '\n');
  }
}

async function example5_bestPractices() {
  console.log('5️⃣  Best Practices\n');

  const result = await generateText({
    model: chatgptOAuth('gpt-5-codex'),
    prompt:
      'Generate a JSON object summarizing TypeScript best practices with fields: title (string), summary (string), readingTime (number minutes), tags (array of strings). OUTPUT ONLY JSON.',
  });

  try {
    const article = parseJSON(result.text);
    console.log('Well-structured generation:');
    console.log(JSON.stringify(article, null, 2));
  } catch (e) {
    console.error('❌ Failed:', (e as Error).message, '\n');
  }
}

async function main() {
  await example1_simpleObject();
  await example2_arrays();
  await example3_optionalFields();
  await example4_dataTypes();
  await example5_bestPractices();

  console.log('\n✨ Remember to validate and sanitize JSON in production!');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
