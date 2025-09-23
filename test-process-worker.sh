#!/bin/bash

# Test the process worker
TASK='{
  "id": "test-task-1",
  "type": "scenario",
  "featureFile": "test/orangehrm/features/orangehrm-login-navigation.feature",
  "featureName": "Orange HRM Demo Site - Login and Navigation",
  "scenarioName": "Standard user login with valid credentials"
}'

CONFIG='{
  "project": "orangehrm"
}'

WORKER_ID=1

echo "Testing process worker..."
npx ts-node --transpile-only src/parallel/CSProcessWorker.ts "$TASK" "$CONFIG" "$WORKER_ID"