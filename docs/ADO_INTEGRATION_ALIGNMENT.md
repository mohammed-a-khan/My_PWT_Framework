# Azure DevOps Integration - Framework Alignment

## Overview
This document demonstrates how the PTF framework's ADO integration aligns with the Selenium Java framework's implementation, ensuring consistency and stability.

## 1. Configuration Hierarchy (7-Level)

The PTF framework follows the same **7-level configuration hierarchy** as the Selenium framework:

### Loading Order (Highest to Lowest Priority):
1. **Command line arguments** - Override everything
2. **Environment variables** - Override config files
3. **Project environment config** - `config/{project}/environments/{environment}.env`
4. **Project common config** - `config/{project}/common/common.env`
5. **Common environment config** - `config/common/environments/{environment}.env`
6. **Common config** - `config/common/common.env`
7. **Global defaults** - `config/global.env`

### Implementation:
```typescript
// CSADOConfiguration uses CSConfigurationManager for all config access
this.enabled = this.config.getBoolean('ADO_INTEGRATION_ENABLED', false);
this.organization = this.config.get('ADO_ORGANIZATION', '');
this.project = this.config.get('ADO_PROJECT', '');
```

## 2. Interpolation Support

### Variable Interpolation:
- `{project}` - Replaced with current project name
- `{environment}` - Replaced with current environment
- `{organization}` - Replaced with ADO organization
- `{date}` - Current date
- `{time}` - Current time
- `{datetime}` - ISO datetime
- `{timestamp}` - Unix timestamp

### Example Configuration:
```properties
ADO_ORGANIZATION={organization}
ADO_PROJECT={project}
ADO_BUG_AREA_PATH={project}
ADO_BUG_ITERATION_PATH={project}
ADO_RUN_NAME=PTF Automated Run - {date} {time}
```

## 3. No Hardcoded Values

All ADO-related values are configurable through the configuration hierarchy:

### Core Settings:
- Organization, project, PAT token
- API version, endpoints
- Test plan and suite IDs

### Upload Settings:
- Screenshots, videos, HAR files, traces, logs
- Selective upload based on configuration

### Bug Creation:
- Title template with placeholders
- Severity and priority from config
- Area and iteration paths
- Assignee configuration

### Status Mapping:
```properties
# Configurable status mapping
ADO_STATUS_PASSED=Passed
ADO_STATUS_FAILED=Failed
ADO_STATUS_SKIPPED=NotExecuted
ADO_STATUS_BLOCKED=Blocked
ADO_STATUS_NOT_APPLICABLE=NotApplicable
```

## 4. Multiple Test Case ID Support

### Tag Format Support:
```gherkin
# Single test case
@TestCaseId:419

# Multiple test cases
@TestCaseId:{419,420,421}

# Feature-level tags (inherited by all scenarios)
@TestPlanId:417 @TestSuiteId:418
```

### Implementation:
```typescript
// CSADOTagExtractor handles both formats
private static readonly PATTERNS = {
    TEST_CASE: /@TestCaseId:(?:\{([^}]+)\}|(\d+))/i,
    TEST_PLAN: /@TestPlanId:(\d+)/i,
    TEST_SUITE: /@TestSuiteId:(\d+)/i,
};
```

## 5. Execution Mode Support

### Sequential Mode:
- Results published immediately after each scenario
- Direct ADO API calls after scenario completion

### Parallel Mode:
- Results accumulated during execution
- Batch publishing after all tests complete
- Worker processes extract ADO metadata

### Implementation:
```typescript
// CSADOIntegration handles both modes
public async initialize(isParallel: boolean = false): Promise<void> {
    this.isParallelMode = isParallel;
    // ...
}

// Publishing based on mode
if (this.isParallelMode) {
    this.publisher.addScenarioResult(result); // Queue for batch
} else {
    await this.publisher.publishScenarioResult(result); // Immediate
}
```

## 6. API Integration

### Using Existing HTTP Client:
The ADO integration uses the framework's existing `CSHttpClient` for all API calls, maintaining consistency with other API operations:

```typescript
// CSADOClient uses existing HTTP client
private httpClient: CSHttpClient;

// All API calls use the same patterns
await this.httpClient.post(endpoint, data, {
    headers: this.getHeaders(),
    timeout: this.config.getTimeout(),
    retry: {
        count: this.config.getRetryCount(),
        delay: this.config.getRetryDelay()
    }
});
```

### Security Features:
- Encrypted PAT support with `ENCRYPTED:` prefix
- Proxy configuration with authentication
- Secure token handling

## 7. Comprehensive Configuration Properties

All properties follow the `ADO_` prefix convention and support the configuration hierarchy:

### Test Configuration:
- `ADO_INTEGRATION_ENABLED`
- `ADO_ORGANIZATION`
- `ADO_PROJECT`
- `ADO_TEST_PLAN_ID`
- `ADO_TEST_SUITE_ID`

### Upload Configuration:
- `ADO_UPLOAD_SCREENSHOTS`
- `ADO_UPLOAD_VIDEOS`
- `ADO_UPLOAD_HAR`
- `ADO_UPLOAD_TRACES`
- `ADO_UPLOAD_LOGS`

### Bug Template:
- `ADO_BUG_TITLE_TEMPLATE`
- `ADO_BUG_AREA_PATH`
- `ADO_BUG_ITERATION_PATH`
- `ADO_BUG_PRIORITY`
- `ADO_BUG_SEVERITY`

### API Settings:
- `ADO_API_TIMEOUT`
- `ADO_API_RETRY_COUNT`
- `ADO_API_RETRY_DELAY`

### Proxy Configuration:
- `ADO_PROXY_ENABLED`
- `ADO_PROXY_HOST`
- `ADO_PROXY_PORT`
- `ADO_PROXY_USERNAME`
- `ADO_PROXY_PASSWORD`

## 8. Artifact Management

### Supported Artifacts:
- Screenshots (failure and step-level)
- Videos (test execution recordings)
- HAR files (network traffic)
- Trace files (Playwright traces)
- Console logs

### Upload Control:
Each artifact type can be individually enabled/disabled through configuration.

## 9. Error Handling

### Robust Error Handling:
- ADO failures don't block test execution
- Retry logic with configurable attempts
- Detailed error logging for debugging
- Graceful degradation on ADO unavailability

## Summary

The PTF framework's ADO integration is fully aligned with the Selenium Java framework's implementation:

✅ **7-level configuration hierarchy** - All ADO properties use CSConfigurationManager
✅ **No hardcoded values** - Everything is configurable
✅ **Interpolation support** - `{project}`, `{environment}`, date/time placeholders
✅ **Multiple test case IDs** - `@TestCaseId:{419,420,421}` format supported
✅ **Both execution modes** - Sequential and parallel publishing
✅ **Existing HTTP client** - Uses framework's CSHttpClient
✅ **Comprehensive configuration** - All ADO properties configurable
✅ **Security features** - Encrypted tokens, proxy support
✅ **Artifact management** - Selective upload based on configuration
✅ **Error resilience** - ADO failures don't block tests

This implementation ensures that the ADO integration works as reliably as the stable Selenium Java framework while maintaining consistency with PTF's architecture.