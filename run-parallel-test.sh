#!/bin/bash

echo "Running parallel test with your command..."

# Your exact command
npx ts-node --transpile-only src/index.ts \
  --project=orangehrm \
  --features=test/orangehrm/features/orangehrm-login-navigation.feature \
  --headless=false \
  --parallel=true \
  --workers=3