# Parallel Execution Guide

## Overview

The CS Test Automation Framework now supports advanced parallel execution using Node.js Worker Threads. This feature significantly reduces test execution time by running tests concurrently across multiple worker processes.

## Features

- **Worker Thread Based**: Uses Node.js Worker Threads for true parallel execution
- **Intelligent Load Balancing**: Distributes tests across workers using configurable strategies
- **Thread-Safe Browser Management**: Each worker gets its own browser instance
- **Automatic Retry on Failure**: Failed tests can be automatically retried
- **Real-time Progress Tracking**: Monitor execution progress across all workers
- **Result Aggregation**: Seamlessly combines results from all parallel executions
- **Isolated Media Capture**: Each worker has separate directories for screenshots, videos, traces, HAR files
- **Data Source Locking**: Thread-safe access to external data sources (Excel, CSV, databases)
- **Console Log Capture**: Per-worker console log collection and aggregation
- **Comprehensive Reporting**: Unified reports from all parallel executions

## Configuration

### Basic Usage

Run tests in parallel with default settings (4 workers):

```bash
npm run test:parallel
```

Run with specific number of workers:

```bash
npm run test -- --parallel=8 --workers=8
```

### Environment Variables

Configure parallel execution behavior through environment variables:

```bash
# Enable/disable worker threads (default: true)
USE_WORKER_THREADS=true

# Maximum number of parallel workers (default: CPU cores - 1, max 4)
MAX_PARALLEL_WORKERS=4

# Task execution timeout in ms (default: 120000)
TASK_TIMEOUT=120000

# Worker timeout in ms (default: 300000)
WORKER_TIMEOUT=300000

# Enable retry on failure (default: true)
RETRY_ON_FAILURE=true

# Maximum retry attempts (default: 2)
MAX_RETRIES=2

# Fail fast - stop on first failure (default: false)
FAIL_FAST=false

# Parallel granularity: 'feature' or 'scenario' (default: scenario)
PARALLEL_GRANULARITY=scenario

# Browser instance strategy for parallel execution
BROWSER_INSTANCE_STRATEGY=new-per-scenario
```

## Execution Strategies

### 1. Scenario-Level Parallelism (Recommended)

Each scenario runs in its own worker for maximum parallelism:

```bash
PARALLEL_GRANULARITY=scenario npm run test:parallel
```

**Benefits:**
- Best load distribution
- Faster overall execution
- Isolated scenario execution

### 2. Feature-Level Parallelism

Each feature file runs in its own worker:

```bash
PARALLEL_GRANULARITY=feature npm run test:parallel
```

**Benefits:**
- Maintains feature context
- Less overhead
- Good for feature-dependent tests

## Load Balancing Strategies

### Least Busy (Default)
Assigns tasks to the worker with the least completed tasks:

```javascript
// In your config
loadBalancing: 'leastBusy'
```

### Round Robin
Distributes tasks evenly in circular order:

```javascript
loadBalancing: 'roundRobin'
```

### Random
Randomly assigns tasks to available workers:

```javascript
loadBalancing: 'random'
```

## Priority-Based Execution

Tests are executed based on priority tags:

- `@critical` or `@smoke` - Highest priority
- `@high` - High priority
- `@medium` - Medium priority (default)
- `@low` - Low priority

Example:
```gherkin
@critical
Feature: Login
  Critical login functionality

@high
Scenario: Valid login
  Given I am on login page
  ...
```

## Example Commands

### Run smoke tests in parallel
```bash
npm run test -- --tags=@smoke --parallel=4
```

### Run specific project tests in parallel
```bash
npm run test:akhan -- --parallel=8
npm run test:orangehrm -- --parallel=4
```

### Run with fail-fast in parallel
```bash
FAIL_FAST=true npm run test:parallel
```

### Run with custom timeout
```bash
TASK_TIMEOUT=180000 npm run test:parallel
```

## Performance Optimization Tips

1. **Optimal Worker Count**: Use CPU cores - 1 for best performance
   ```bash
   # For 8-core machine
   npm run test -- --parallel=7
   ```

2. **Memory Management**: Set resource limits for heavy tests
   ```javascript
   resourceLimits: {
     maxOldGenerationSizeMb: 4096,
     maxYoungGenerationSizeMb: 2048
   }
   ```

3. **Browser Reuse**: For API/unit tests, reuse browser instances
   ```bash
   BROWSER_INSTANCE_STRATEGY=reuse-across-scenarios npm run test:parallel
   ```

4. **Disable Screenshots**: For faster execution in CI
   ```bash
   SCREENSHOT_ON_FAILURE=false npm run test:parallel
   ```

## Monitoring and Debugging

### Enable Debug Logging
```bash
DEBUG=true npm run test:parallel
```

### View Worker Status
The framework automatically logs:
- Worker initialization
- Task assignment
- Progress updates
- Completion status

### Troubleshooting

**Issue**: Workers timing out
```bash
# Increase worker timeout
WORKER_TIMEOUT=600000 npm run test:parallel
```

**Issue**: Out of memory errors
```bash
# Reduce worker count
npm run test -- --parallel=2
```

**Issue**: Browser connection errors
```bash
# Use new browser per scenario
BROWSER_INSTANCE_STRATEGY=new-per-scenario npm run test:parallel
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run Parallel Tests
  run: |
    npm run test:parallel
  env:
    MAX_PARALLEL_WORKERS: 4
    FAIL_FAST: true
    HEADLESS: true
```

### Jenkins Pipeline Example
```groovy
stage('Parallel Tests') {
    environment {
        MAX_PARALLEL_WORKERS = '8'
        PARALLEL_GRANULARITY = 'scenario'
    }
    steps {
        sh 'npm run test:parallel'
    }
}
```

## Best Practices

1. **Start Small**: Begin with 2-4 workers and increase gradually
2. **Monitor Resources**: Watch CPU and memory usage
3. **Tag Appropriately**: Use priority tags for critical tests
4. **Isolate Tests**: Ensure tests don't share state
5. **Handle Cleanup**: Each test should clean up after itself
6. **Use Retries Wisely**: Set appropriate retry counts for flaky tests

## Media and Artifacts

### Isolated Worker Directories

Each worker gets its own isolated directory structure:

```
reports/
├── parallel-run-2024-01-15/
│   ├── worker-1/
│   │   ├── screenshots/
│   │   ├── videos/
│   │   ├── traces/
│   │   ├── har/
│   │   └── logs/
│   ├── worker-2/
│   │   └── ...
│   └── aggregated/
│       └── final-report.html
```

### Data-Driven Test Support

The framework handles data-driven scenarios safely in parallel:

```gherkin
Scenario Outline: Login with different users
  Given I have test data from "users.xlsx"
  When I login as <username>
  Then I should see <dashboard>

  Examples:
    | username | dashboard |
    | @data    | @data     |
```

The framework automatically:
- Locks data sources during access
- Queues workers for shared resources
- Releases locks after use
- Handles Excel, CSV, JSON, Database sources

### Console Log Aggregation

Console logs are captured per worker and aggregated:

```javascript
// Automatically captured per worker:
- Console messages (log, warn, error)
- Page errors
- Network failures
- Response errors (4xx, 5xx)
```

### Video Recording

Videos are recorded per scenario per worker:

```bash
# Enable video for all scenarios
BROWSER_VIDEO=on npm run test:parallel

# Enable video only for failures
BROWSER_VIDEO=retain-on-failure npm run test:parallel
```

### HAR File Generation

Network activity is captured per worker:

```bash
# Enable HAR recording
BROWSER_HAR_ENABLED=true npm run test:parallel

# Omit response content for smaller files
BROWSER_HAR_OMIT_CONTENT=true npm run test:parallel
```

## Report Generation

Reports are automatically aggregated from all workers:

1. **Individual Worker Reports**: Each worker generates its own report
2. **Aggregation Phase**: All reports are combined
3. **Final Report**: Unified report with:
   - Combined test results
   - All screenshots organized by worker/scenario
   - All videos linked properly
   - Console logs per scenario
   - Network traces (HAR files)
   - Execution timeline across workers

## Limitations

- Browser state is not shared between workers
- Tests must be independent and isolated
- Database transactions should be properly managed
- File system operations need careful handling
- Shared test data requires proper synchronization

## Migration from Sequential to Parallel

1. **Identify Dependencies**: Find tests that depend on each other
2. **Isolate State**: Ensure each test manages its own state
3. **Add Tags**: Tag tests with appropriate priorities
4. **Test Gradually**: Start with a subset of tests
5. **Monitor Results**: Compare sequential vs parallel results
6. **Optimize**: Fine-tune worker count and strategies

## Advanced Configuration

For complex scenarios, you can programmatically configure parallel execution:

```javascript
// In your test setup
const parallelOptions = {
    maxWorkers: os.cpus().length - 1,
    taskTimeout: 180000,
    retryOnFailure: true,
    maxRetries: 3,
    failFast: false,
    loadBalancing: 'leastBusy',
    schedulingStrategy: 'priority',
    resourceLimits: {
        maxOldGenerationSizeMb: 4096
    }
};
```

## Support

For issues or questions about parallel execution:
- Check the logs in `./logs` directory
- Enable debug mode for detailed information
- Review worker-specific logs for failures
- Ensure all dependencies support parallel execution