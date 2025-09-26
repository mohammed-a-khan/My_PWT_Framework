# Azure DevOps Integration Guide

## Overview

The framework provides seamless integration with Azure DevOps for test management:
- Map BDD scenarios to ADO test cases
- Automatically update test results in ADO
- Upload test artifacts (screenshots, videos, logs)
- Support multiple test case IDs per scenario

## Configuration

### Enable ADO Integration

Add the following to your `global.env` or project-specific `.env` file:

```properties
# Enable Azure DevOps integration
ADO_INTEGRATION_ENABLED=true

# Organization and project settings
ADO_ORGANIZATION=your-organization
ADO_PROJECT=your-project

# Authentication (Personal Access Token)
ADO_PAT=your-personal-access-token

# Test configuration (optional - can use tags instead)
ADO_TEST_PLAN_ID=417
ADO_TEST_SUITE_ID=418
```

### Personal Access Token (PAT)

Create a PAT in Azure DevOps with the following permissions:
- **Test Management**: Read & Write
- **Work Items**: Read & Write

## Usage

### Feature File Tags

Add ADO tags to your feature files:

```gherkin
@TestPlanId:417 @TestSuiteId:418
Feature: Login Functionality

  @TestCaseId:419
  Scenario: Valid login
    Given I am on the login page
    When I enter valid credentials
    Then I should be logged in

  @TestCaseId:{420,421,422}
  Scenario: Invalid login attempts
    Given I am on the login page
    When I enter invalid credentials
    Then I should see an error message
```

### Tag Formats

- **Single test case**: `@TestCaseId:419`
- **Multiple test cases**: `@TestCaseId:{420,421,422}`
- **Test plan**: `@TestPlanId:417`
- **Test suite**: `@TestSuiteId:418`

## Test Execution

### Sequential Execution
```bash
npm test -- --project=myproject --features=test/features/login.feature
```

### Parallel Execution
```bash
npm test -- --project=myproject --parallel=true --workers=3
```

## Test Results in Azure DevOps

- A new test run is created for each execution
- Test results are updated for all mapped test cases
- Execution time and error details are captured
- Screenshots and other artifacts are uploaded (if configured)

## Configuration Properties

### Core Settings
- `ADO_INTEGRATION_ENABLED` - Enable/disable ADO integration
- `ADO_ORGANIZATION` - Your ADO organization
- `ADO_PROJECT` - Your ADO project
- `ADO_PAT` - Personal Access Token for authentication

### Test Settings
- `ADO_TEST_PLAN_ID` - Default test plan ID
- `ADO_TEST_SUITE_ID` - Default test suite ID
- `ADO_RUN_NAME` - Test run name template (supports {date}, {time})

### Upload Settings
- `ADO_UPLOAD_SCREENSHOTS` - Upload screenshots (default: true)
- `ADO_UPLOAD_VIDEOS` - Upload video recordings (default: true)
- `ADO_UPLOAD_LOGS` - Upload console logs (default: true)

### Bug Creation
- `ADO_CREATE_BUGS_ON_FAILURE` - Create bugs for failed tests (default: false)
- `ADO_BUG_TITLE_TEMPLATE` - Bug title template
- `DEFAULT_BUG_ASSIGNEE` - Default assignee for bugs

### API Settings
- `ADO_API_TIMEOUT` - API request timeout (default: 30000ms)
- `ADO_API_RETRY_COUNT` - Number of retries (default: 3)

### Proxy Settings (if behind corporate proxy)
- `ADO_PROXY_ENABLED` - Enable proxy
- `ADO_PROXY_HOST` - Proxy host
- `ADO_PROXY_PORT` - Proxy port
- `ADO_PROXY_USERNAME` - Proxy username
- `ADO_PROXY_PASSWORD` - Proxy password

## Configuration Hierarchy

The framework uses a 7-level configuration hierarchy. ADO properties can be configured at any level:

1. Command line arguments (highest priority)
2. Environment variables
3. `config/{project}/environments/{environment}.env`
4. `config/{project}/common/common.env`
5. `config/common/environments/{environment}.env`
6. `config/common/common.env`
7. `config/global.env` (lowest priority)

## Interpolation Support

Configuration values support interpolation:
- `{project}` - Current project name
- `{environment}` - Current environment
- `{date}` - Current date
- `{time}` - Current time

Example:
```properties
ADO_PROJECT={project}
ADO_RUN_NAME=Automated Test - {project} - {date} {time}
```

## Troubleshooting

### Authentication Failed
- Verify PAT has correct permissions
- Check PAT hasn't expired
- Ensure organization URL is correct

### Test Cases Not Found
- Verify test case IDs exist in ADO
- Check test plan and suite IDs are correct

### Proxy Issues
- Verify proxy settings are correct
- Check proxy authentication credentials

## Example Project Structure

```
test/
├── myproject/
│   ├── features/
│   │   ├── login.feature          # @TestCaseId:101
│   │   └── navigation.feature     # @TestCaseId:{102,103,104}
│   └── steps/
│       └── common.steps.ts
└── config/
    └── myproject.env              # ADO configuration
```