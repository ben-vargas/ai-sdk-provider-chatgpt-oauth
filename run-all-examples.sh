#!/bin/bash

# Build once
echo "Building project..."
npm run build

# List of all examples
examples=(
  "check-auth"
  "basic-usage"
  "model-support"
  "streaming"
  "generate-object"
  "generate-json-basic"
  "generate-json-nested"
  "generate-json-advanced"
  "stream-object"
  "structured-output"
  "reasoning-effort"
  "tool-calling-basic"
  "tool-calling-stateless"
  "tool-calling-limitations"
)

# Run each example with timeout
for example in "${examples[@]}"; do
  echo ""
  echo "========================================="
  echo "Running: $example.ts"
  echo "========================================="
  timeout 30s npx tsx "examples/$example.ts"
  
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Success: $example.ts"
  elif [ $EXIT_CODE -eq 124 ]; then
    echo "⏱️  Timeout: $example.ts (30s limit)"
  else
    echo "❌ Failed: $example.ts (exit code: $EXIT_CODE)"
  fi
done

echo ""
echo "✅ All examples completed!"