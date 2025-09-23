@echo off
REM CS Test Automation Framework - Test Runner for Windows
REM Usage: run-test.bat --project=orangehrm --features=path/to/feature --headless=true

npx cross-env TS_NODE_TRANSPILE_ONLY=true node -r ts-node/register/transpile-only src/index.ts %*