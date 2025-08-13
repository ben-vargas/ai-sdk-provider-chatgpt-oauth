#!/usr/bin/env bun
/**
 * Advanced JSON Generation Patterns with ChatGPT OAuth
 * 
 * Production-ready patterns for generating JSON using prompt engineering,
 * including error handling, validation, retry logic, and real-world use cases.
 * 
 * Topics covered:
 * - Robust error handling and retry logic
 * - Data extraction from unstructured text
 * - Batch processing with validation
 * - Schema-driven generation
 * - Performance optimization
 */

import { generateText } from 'ai';
import { createChatGPTOAuth } from '../src';
import { z } from 'zod';

const chatgptOAuth = createChatGPTOAuth();

console.log('🚀 ChatGPT OAuth: Advanced JSON Generation Patterns\n');
console.log('=' .repeat(60));

// Robust JSON extraction with multiple strategies
function extractJSON(text: string): any {
  const trimmed = text.trim();
  
  // Strategy 1: Direct parse
  try {
    return JSON.parse(trimmed);
  } catch {}
  
  // Strategy 2: Find JSON patterns
  const patterns = [
    /```json\s*([\s\S]*?)\s*```/,  // Code blocks
    /\{[\s\S]*\}/,                  // Objects
    /\[[\s\S]*\]/,                  // Arrays
  ];
  
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      try {
        const jsonStr = match[1] || match[0];
        return JSON.parse(jsonStr);
      } catch {}
    }
  }
  
  throw new Error('No valid JSON found in response');
}

// Advanced generation with retry and validation
async function generateWithRetry<T>(
  prompt: string,
  schema: z.ZodType<T>,
  options: {
    maxRetries?: number;
    backoff?: boolean;
    enhancePrompt?: (attempt: number) => string;
  } = {}
): Promise<T> {
  const { maxRetries = 3, backoff = true, enhancePrompt } = options;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const enhancedPrompt = enhancePrompt 
        ? enhancePrompt(attempt)
        : prompt;
      
      const result = await generateText({
        model: chatgptOAuth('gpt-5'),
        prompt: enhancedPrompt,
      });
      
      const json = extractJSON(result.text);
      return schema.parse(json);
    } catch (error) {
      console.log(`  Attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      
      if (attempt === maxRetries) {
        throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
      }
      
      if (backoff) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`  Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error('Unexpected error in retry logic');
}

// Example 1: Data extraction from unstructured text
async function example1_dataExtraction() {
  console.log('\n1️⃣  Extract Structured Data from Text\n');
  
  const emailText = `
    Subject: Q4 Project Update - Critical Issues
    From: sarah.chen@techcorp.com
    To: team-leads@techcorp.com
    Date: December 15, 2024, 3:45 PM EST
    Priority: High
    
    Team,
    
    The mobile app redesign is now 75% complete, but we're facing some challenges.
    We need 3 additional developers to meet the January 31st deadline.
    Current burn rate is $125,000 per month, with $375,000 remaining in budget.
    
    Key metrics:
    - User engagement: up 23%
    - Performance score: 92/100
    - Bug count: decreased from 47 to 12
    
    Please review and respond by EOD tomorrow.
    
    Best,
    Sarah
  `;
  
  const ExtractionSchema = z.object({
    email: z.object({
      subject: z.string(),
      from: z.string().email(),
      to: z.string(),
      date: z.string(),
      priority: z.enum(['low', 'medium', 'high', 'critical']),
    }),
    project: z.object({
      name: z.string(),
      completionPercentage: z.number(),
      deadline: z.string(),
      additionalResourcesNeeded: z.object({
        developers: z.number(),
      }),
    }),
    financials: z.object({
      burnRate: z.number(),
      budgetRemaining: z.number(),
    }),
    metrics: z.array(z.object({
      name: z.string(),
      value: z.union([z.string(), z.number()]),
      trend: z.enum(['up', 'down', 'stable']).optional(),
    })),
  });

  const prompt = `Extract all information from this email into structured JSON:

${emailText}

OUTPUT EXACT JSON MATCHING THIS STRUCTURE:
{
  "email": {
    "subject": "string",
    "from": "email@address",
    "to": "string",
    "date": "string",
    "priority": "low" | "medium" | "high" | "critical"
  },
  "project": {
    "name": "string",
    "completionPercentage": number,
    "deadline": "string",
    "additionalResourcesNeeded": {
      "developers": number
    }
  },
  "financials": {
    "burnRate": number,
    "budgetRemaining": number
  },
  "metrics": [
    {
      "name": "string",
      "value": string or number,
      "trend": "up" | "down" | "stable" (optional)
    }
  ]
}

IMPORTANT: Extract exact values from the email. Output only JSON:`;

  try {
    const extracted = await generateWithRetry(prompt, ExtractionSchema);
    console.log('Extracted data:');
    console.log(JSON.stringify(extracted, null, 2));
    console.log('✅ Successfully extracted structured data\n');
  } catch (e) {
    console.error('❌ Extraction failed:', e.message, '\n');
  }
}

// Example 2: API response generation with constraints
async function example2_apiResponse() {
  console.log('2️⃣  Generate API Response with Business Logic\n');
  
  const ApiResponseSchema = z.object({
    status: z.literal('success'),
    data: z.object({
      search: z.object({
        query: z.string(),
        filters: z.object({
          category: z.string(),
          priceRange: z.object({
            min: z.number(),
            max: z.number(),
          }),
          inStock: z.boolean(),
        }),
      }),
      results: z.array(z.object({
        id: z.string().uuid(),
        name: z.string(),
        description: z.string(),
        price: z.number(),
        category: z.string(),
        stock: z.number().int().min(0),
        rating: z.number().min(0).max(5),
        discount: z.object({
          percentage: z.number().min(0).max(100),
          validUntil: z.string(),
        }).optional(),
      })),
      pagination: z.object({
        page: z.number().int().positive(),
        pageSize: z.number().int().positive(),
        totalItems: z.number().int().min(0),
        totalPages: z.number().int().positive(),
      }),
    }),
    metadata: z.object({
      timestamp: z.string(),
      requestId: z.string().uuid(),
      processingTime: z.number(),
    }),
  });

  const enhancePrompt = (attempt: number) => {
    const base = `Generate a product search API response for electronics under $500.

STRICT REQUIREMENTS:
- Exactly 3 products in results
- All products must be electronics category
- All prices must be under $500
- At least one product should have a discount
- Stock levels should be realistic (0-100)
- Ratings should be between 3.5 and 5.0`;

    const jsonFormat = `
EXACT JSON STRUCTURE (NO DEVIATIONS):
{
  "status": "success",
  "data": {
    "search": {
      "query": "string",
      "filters": {
        "category": "string",
        "priceRange": {"min": number, "max": number},
        "inStock": boolean
      }
    },
    "results": [
      {
        "id": "uuid-format",
        "name": "string",
        "description": "string",
        "price": number,
        "category": "string",
        "stock": number,
        "rating": number,
        "discount": {
          "percentage": number,
          "validUntil": "ISO-date"
        } (optional)
      }
    ],
    "pagination": {
      "page": number,
      "pageSize": number,
      "totalItems": number,
      "totalPages": number
    }
  },
  "metadata": {
    "timestamp": "ISO-8601",
    "requestId": "uuid-format",
    "processingTime": number
  }
}`;

    if (attempt === 1) {
      return base + jsonFormat + '\n\nOUTPUT JSON:';
    } else if (attempt === 2) {
      return base + jsonFormat + '\n\nIMPORTANT: Output ONLY valid JSON, no explanations:';
    } else {
      return base + jsonFormat + '\n\nCRITICAL: Return EXACTLY the JSON structure shown above. Start with { and end with }:';
    }
  };

  try {
    const response = await generateWithRetry(
      '', 
      ApiResponseSchema,
      { enhancePrompt }
    );
    console.log('Generated API response:');
    console.log(JSON.stringify(response, null, 2));
    console.log('✅ Valid API response with constraints\n');
  } catch (e) {
    console.error('❌ Generation failed:', e.message, '\n');
  }
}

// Example 3: Batch processing with validation
async function example3_batchProcessing() {
  console.log('3️⃣  Batch Processing with Parallel Generation\n');
  
  const ProductSchema = z.object({
    name: z.string(),
    brand: z.string(),
    category: z.string(),
    features: z.array(z.string()).min(2).max(5),
    priceEstimate: z.object({
      min: z.number(),
      max: z.number(),
      currency: z.string(),
    }),
  });
  
  const products = [
    'Apple MacBook Pro 14" with M3 Pro chip',
    'Sony WH-1000XM5 Wireless Noise Canceling Headphones',
    'Samsung 65" OLED 4K Smart TV',
  ];
  
  const results = await Promise.all(
    products.map(async (product, index) => {
      const prompt = `Analyze this product and return detailed information:
"${product}"

OUTPUT THIS EXACT JSON FORMAT:
{
  "name": "string (product name)",
  "brand": "string (manufacturer)",
  "category": "string (product category)",
  "features": ["feature1", "feature2", ...] (2-5 key features),
  "priceEstimate": {
    "min": number,
    "max": number,
    "currency": "USD"
  }
}

ONLY JSON OUTPUT:`;
      
      try {
        const result = await generateWithRetry(prompt, ProductSchema, {
          maxRetries: 2,
          backoff: false,
        });
        console.log(`✅ Processed ${index + 1}/${products.length}: ${result.name}`);
        return { success: true, data: result };
      } catch (error) {
        console.log(`❌ Failed ${index + 1}/${products.length}: ${product}`);
        return { success: false, error: error.message };
      }
    })
  );
  
  const successful = results.filter(r => r.success);
  console.log(`\nBatch complete: ${successful.length}/${products.length} successful`);
  console.log('Results:', JSON.stringify(successful, null, 2));
  console.log();
}

// Example 4: Schema-driven form generation
async function example4_dynamicForms() {
  console.log('4️⃣  Dynamic Form Generation from Requirements\n');
  
  const FormSchema = z.object({
    form: z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      sections: z.array(z.object({
        name: z.string(),
        fields: z.array(z.object({
          id: z.string(),
          label: z.string(),
          type: z.enum(['text', 'email', 'number', 'date', 'select', 'checkbox', 'textarea', 'file']),
          required: z.boolean(),
          validation: z.object({
            pattern: z.string().optional(),
            minLength: z.number().optional(),
            maxLength: z.number().optional(),
            min: z.number().optional(),
            max: z.number().optional(),
          }).optional(),
          options: z.array(z.object({
            value: z.string(),
            label: z.string(),
          })).optional(),
          placeholder: z.string().optional(),
        })),
      })),
      submitButton: z.object({
        text: z.string(),
        confirmRequired: z.boolean(),
      }),
    }),
  });

  const requirements = `
    Create a job application form with:
    - Personal information section (name, email, phone)
    - Experience section (years of experience, current role, resume upload)
    - Availability section (start date, full-time/part-time preference, salary expectation)
  `;

  const prompt = `Generate a complete form configuration based on these requirements:
${requirements}

OUTPUT EXACT JSON STRUCTURE:
{
  "form": {
    "id": "string",
    "title": "string",
    "description": "string",
    "sections": [
      {
        "name": "string",
        "fields": [
          {
            "id": "string",
            "label": "string",
            "type": "text" | "email" | "number" | "date" | "select" | "checkbox" | "textarea" | "file",
            "required": boolean,
            "validation": {
              "pattern": "regex string" (optional),
              "minLength": number (optional),
              "maxLength": number (optional)
            } (optional),
            "options": [
              {"value": "string", "label": "string"}
            ] (only for select type),
            "placeholder": "string" (optional)
          }
        ]
      }
    ],
    "submitButton": {
      "text": "string",
      "confirmRequired": boolean
    }
  }
}

Generate exactly 3 sections as specified.
Include appropriate validation rules.
OUTPUT ONLY JSON:`;

  try {
    const form = await generateWithRetry(prompt, FormSchema);
    console.log('Generated form configuration:');
    console.log(JSON.stringify(form, null, 2));
    console.log('✅ Dynamic form generated from requirements\n');
  } catch (e) {
    console.error('❌ Form generation failed:', e.message, '\n');
  }
}

// Example 5: Performance monitoring
async function example5_performanceTracking() {
  console.log('5️⃣  Performance Tracking\n');
  
  const MetricsSchema = z.object({
    endpoint: z.string(),
    method: z.string(),
    timestamp: z.string(),
    metrics: z.object({
      responseTime: z.number(),
      statusCode: z.number(),
      requestSize: z.number(),
      responseSize: z.number(),
    }),
  });
  
  console.log('Generating 3 performance metrics...');
  const startTime = Date.now();
  
  const endpoints = ['/api/users', '/api/products', '/api/orders'];
  const metrics = [];
  
  for (const endpoint of endpoints) {
    const metricStart = Date.now();
    
    const prompt = `Generate API performance metrics for ${endpoint} endpoint.

OUTPUT EXACTLY THIS JSON:
{
  "endpoint": "${endpoint}",
  "method": "GET" or "POST",
  "timestamp": "ISO-8601 current time",
  "metrics": {
    "responseTime": number (50-500 ms),
    "statusCode": 200,
    "requestSize": number (100-1000 bytes),
    "responseSize": number (1000-10000 bytes)
  }
}

JSON ONLY:`;
    
    try {
      const metric = await generateWithRetry(prompt, MetricsSchema, {
        maxRetries: 1,
        backoff: false,
      });
      const elapsed = Date.now() - metricStart;
      metrics.push({ ...metric, generationTime: elapsed });
      console.log(`  ✓ ${endpoint}: ${elapsed}ms`);
    } catch (e) {
      console.log(`  ✗ ${endpoint}: failed`);
    }
  }
  
  const totalTime = Date.now() - startTime;
  console.log(`\nTotal generation time: ${totalTime}ms`);
  console.log('Average per request: ' + Math.round(totalTime / endpoints.length) + 'ms');
  console.log('Metrics:', JSON.stringify(metrics, null, 2));
  console.log();
}

// Main execution
async function main() {
  try {
    console.log('\n🎯 Advanced patterns for production JSON generation\n');

    await example1_dataExtraction();
    await example2_apiResponse();
    await example3_batchProcessing();
    await example4_dynamicForms();
    await example5_performanceTracking();
    
    console.log('=' .repeat(60));
    console.log('✅ All advanced examples completed!');
    console.log('\n🏆 Key Takeaways:');
    console.log('- Retry logic improves reliability');
    console.log('- Progressive prompt enhancement helps difficult cases');
    console.log('- Batch processing with Promise.all improves performance');
    console.log('- Schema validation ensures type safety');
    console.log('- Performance tracking helps optimize prompts');
    console.log('\n💎 Production tips:');
    console.log('- Cache successful prompts for similar requests');
    console.log('- Use smaller models for simple JSON tasks');
    console.log('- Implement circuit breakers for high-volume scenarios');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
  }
}

main().catch(console.error);