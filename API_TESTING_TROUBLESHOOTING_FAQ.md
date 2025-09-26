# API Testing Framework - Troubleshooting & FAQ

## Table of Contents
1. [Common Issues and Solutions](#common-issues-and-solutions)
2. [Error Messages and Meanings](#error-messages-and-meanings)
3. [Performance Troubleshooting](#performance-troubleshooting)
4. [Authentication Issues](#authentication-issues)
5. [Configuration Problems](#configuration-problems)
6. [Debugging Tips](#debugging-tips)
7. [Frequently Asked Questions](#frequently-asked-questions)

## Common Issues and Solutions

### 1. Context Not Found Errors

**Error:** `No API context set. Please use "user is working with" step first`

**Solution:**
```gherkin
# Always start with context setup
Given user is working with API context "my-test-context"
# Then proceed with other steps
```

**Root Cause:** Attempting to use API operations without first establishing a context.

### 2. Variable Not Found

**Error:** `Variable 'userId' not found`

**Solution:**
```gherkin
# Save variable first
Given user saves "12345" as "userId"
# Or extract from response
When user saves response JSON path "$.id" as "userId"
# Then use it
When user sends GET request to "/users/{{userId}}"
```

### 3. Response Alias Issues

**Error:** `No response found with alias 'user-response'`

**Solution:**
```gherkin
# Save response with alias
When user sends POST request to "/users" and saves response as "user-response"
# Then reference it
When user uses response JSON path "$.id" from "user-response" as request body field "userId"
```

### 4. JSONPath Validation Failures

**Error:** `JSONPath '$.users[0].id' not found`

**Common Causes:**
- Empty response body
- Incorrect path syntax
- Response structure different than expected

**Solutions:**
```gherkin
# First, print the response to understand structure
Then user prints response body

# Use correct path syntax
Then response JSON path "$.data.users[0].id" should exist

# Check if array is empty first
Then response JSON path "$.users" array should have length greater than 0
```

### 5. Authentication Token Expiry

**Error:** `401 Unauthorized` after token was working

**Solution:**
```gherkin
# Implement token refresh pattern
Given user checks if token is expired
When token is expired
Then user refreshes authentication token
And user saves new token as "authToken"
```

### 6. Connection Timeout Issues

**Error:** `Request timeout after 30000ms`

**Solutions:**
```gherkin
# Increase timeout for slow endpoints
Given user sets request timeout to 60 seconds

# Or implement retry logic
Given user sets retry count to 3
When user executes request with retry count 3
```

## Error Messages and Meanings

### Framework-Specific Errors

| Error Message | Meaning | Solution |
|---------------|---------|----------|
| `Template engine data imported` | Template processing completed | Normal operation |
| `Circuit breaker is OPEN` | Too many failures detected | Wait for reset timeout or fix upstream |
| `Header 'X-Custom' not found in response` | Expected header missing | Check API documentation |
| `Schema validation failed` | Response doesn't match schema | Update schema or fix API |
| `JSONPath validation failed` | Path not found or value mismatch | Verify response structure |

### HTTP Status Code Handling

```gherkin
# Handle expected error responses
When user sends GET request to "/nonexistent"
Then response status should be 404
And response JSON path "$.error.message" should contain "not found"

# Validate error response structure
And response body should match JSON schema in "error-schema.json"
```

### Authentication Errors

| Status | Meaning | Common Fix |
|--------|---------|------------|
| 401 | Unauthorized | Check token/credentials |
| 403 | Forbidden | Verify user permissions |
| 429 | Rate Limited | Implement backoff/retry |

## Performance Troubleshooting

### 1. Slow Response Times

**Symptoms:**
- Tests timing out
- Responses taking longer than expected
- Connection pool exhaustion

**Debugging Steps:**
```gherkin
# Enable performance monitoring
When user executes request and measures performance
Then response time should be less than 5000 ms

# Check detailed timing
Then user prints variable "lastRequestDuration"
```

**Solutions:**
- Increase timeouts appropriately
- Implement connection pooling
- Use parallel execution where possible
- Add retry logic with exponential backoff

### 2. Memory Issues

**Symptoms:**
- Tests failing with out-of-memory errors
- Increasing response times over test duration

**Solutions:**
```gherkin
# Clear context periodically
When user clears all variables
And user clears response cache

# Export context for debugging
When user exports context to file "debug-context.json"
```

### 3. Connection Pool Exhaustion

**Debugging:**
```typescript
// Check connection stats
const stats = apiClient.getConnectionStats();
console.log('Active connections:', stats.activeConnections);
console.log('Idle connections:', stats.idleConnections);
```

**Solutions:**
- Increase pool size in configuration
- Implement connection cleanup
- Use proper context isolation

## Authentication Issues

### 1. OAuth2 Token Problems

**Common Issues:**
- Invalid client credentials
- Wrong token endpoint
- Expired tokens

**Debugging Steps:**
```gherkin
# Test OAuth2 flow step by step
Given user configures OAuth2 with client ID "{{clientId}}" and secret "{{clientSecret}}"
When user authenticates with OAuth2 using scope "read"
Then authentication should be successful
And user prints variable "accessToken"

# Validate token format
Then variable "accessToken" should match regex "^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$"
```

### 2. JWT Token Validation

**Debugging JWT Issues:**
```gherkin
# Check token structure
Then user base64 decodes "{{jwtToken}}" and saves as "decodedToken"
And user prints variable "decodedToken"

# Validate expiry
Then JWT token "{{jwtToken}}" should not be expired
```

### 3. API Key Problems

**Common Issues:**
```gherkin
# Wrong header name
Given user sets API key "{{apiKey}}" in header "X-API-Key"
# vs
Given user sets API key "{{apiKey}}" in header "Authorization"

# Missing API key
Given user sets request header "X-API-Key" to "{{apiKey}}"
When user sends GET request to "/protected"
Then response status should not be 401
```

## Configuration Problems

### 1. Base URL Issues

**Problem:** Requests failing with connection refused

**Check:**
```gherkin
# Verify base URL is accessible
Given user sets base URL to "{{API_BASE_URL}}"
When user sends GET request to "/health"
Then response status should be 200

# Test connectivity
When user tests connection to "{{API_BASE_URL}}"
Then connection should be successful
```

### 2. Environment Configuration

**Problem:** Tests pass in one environment but fail in another

**Solution:**
```gherkin
# Use environment-specific contexts
Given user is working with API context "{{ENVIRONMENT}}"
And user sets base URL to "{{ENVIRONMENT_BASE_URL}}"
And user sets bearer token "{{ENVIRONMENT_TOKEN}}"
```

### 3. Proxy Configuration

**Problem:** Requests hanging or failing behind corporate proxy

**Solution:**
```gherkin
Given user sets proxy to "{{PROXY_URL}}"
And user disables SSL certificate validation  # If using test proxy
```

## Debugging Tips

### 1. Enable Detailed Logging

```gherkin
# Print all variables
Then user prints all variables

# Print response details
Then user prints response body
And user prints response headers

# Export context for analysis
When user exports context to file "debug-{{timestamp}}.json"
```

### 2. Step-by-Step Debugging

```gherkin
# Break down complex scenarios
Scenario: Debug user creation
  Given user is working with API context "debug"

  # Step 1: Verify connectivity
  When user sends GET request to "/health"
  Then response status should be 200
  And user prints response body

  # Step 2: Test authentication
  Given user sets bearer token "{{debugToken}}"
  When user sends GET request to "/me"
  Then response status should be 200

  # Step 3: Create user with minimal data
  Given user sets request body to:
    """
    {"name": "Debug User", "email": "debug@test.com"}
    """
  When user sends POST request to "/users"
  Then user prints response body
```

### 3. Response Validation Debugging

```gherkin
# Validate response structure step by step
When user sends GET request to "/users/1"
Then response status should be 200
And user prints response body

# Check specific fields
Then response JSON path "$.id" should exist
And user prints JSON path "$.id" from response

# Validate data types
Then response JSON path "$.id" should be of type "string"
Then response JSON path "$.active" should be of type "boolean"
```

### 4. Performance Debugging

```gherkin
# Measure individual operations
When user executes request and measures performance
And user sends GET request to "/slow-endpoint"
Then user prints variable "lastRequestDuration"

# Test with different timeouts
Given user sets request timeout to 10 seconds
When user sends GET request to "/slow-endpoint"
# If this fails, increase timeout and retry
```

## Frequently Asked Questions

### Q: How do I handle dynamic data in tests?

**A:** Use variables and data generation:
```gherkin
# Generate dynamic data
Given user generates UUID and saves as "testId"
And user generates timestamp and saves as "testTime"

# Use in requests
Given user sets request body to:
  """
  {
    "id": "{{testId}}",
    "timestamp": {{testTime}},
    "name": "Test User {{testId}}"
  }
  """
```

### Q: How do I test file uploads?

**A:** Use multipart form data:
```gherkin
Given user adds form field "description" with value "Test file upload"
And user adds file "test-image.jpg" as "image" to multipart
When user sends POST request to "/uploads"
Then response status should be 201
```

### Q: How do I handle rate limiting in tests?

**A:** Implement delays and retry logic:
```gherkin
Given user sets retry count to 5
And user sets retry delay to 2000 milliseconds
When user executes request with retry count 5
# Or add explicit delays
When user waits for 1 seconds
```

### Q: How do I validate nested JSON structures?

**A:** Use JSONPath expressions:
```gherkin
# Deep nesting
Then response JSON path "$.data.user.profile.address.street" should exist

# Array elements
Then response JSON path "$.users[0].permissions[1]" should equal "write"

# Array length validation
Then response JSON path "$.items" array should have length 5
```

### Q: How do I test error conditions?

**A:** Explicitly test for expected errors:
```gherkin
# Test validation errors
When user sends POST request to "/users" # with invalid data
Then response status should be 400
And response JSON path "$.errors[0].field" should equal "email"
And response JSON path "$.errors[0].code" should equal "INVALID_FORMAT"

# Test not found errors
When user sends GET request to "/users/nonexistent"
Then response status should be 404
```

### Q: How do I run tests in parallel?

**A:** Use parallel execution steps:
```gherkin
When user executes parallel requests:
  | GET | /endpoint1 | result1 |
  | GET | /endpoint2 | result2 |
  | GET | /endpoint3 | result3 |

Then response from "result1" status should be 200
And response from "result2" status should be 200
And response from "result3" status should be 200
```

### Q: How do I handle environment-specific configuration?

**A:** Use environment variables and contexts:
```gherkin
Given user is working with API context "{{TEST_ENVIRONMENT}}"
And user sets base URL to "{{API_BASE_URL}}"
And user sets bearer token "{{API_TOKEN}}"

# In environment config:
# TEST_ENVIRONMENT=staging
# API_BASE_URL=https://api.staging.example.com
# API_TOKEN=staging-token-123
```

### Q: How do I debug intermittent test failures?

**A:** Add logging and retry mechanisms:
```gherkin
# Add detailed logging
When user sends GET request to "/flaky-endpoint"
Then user prints response body
And user prints variable "lastRequestDuration"

# Add retry for flaky endpoints
Given user sets retry count to 3
When user executes request with retry count 3
```

### Q: How do I validate API schemas?

**A:** Use schema validation:
```gherkin
# Create schema files in test-data/api/schemas/
Then response body should match JSON schema in "user-schema.json"

# Schema file example (user-schema.json):
{
  "type": "object",
  "properties": {
    "id": {"type": "string"},
    "name": {"type": "string"},
    "email": {"type": "string", "format": "email"}
  },
  "required": ["id", "name", "email"]
}
```

### Q: How do I handle cookies in tests?

**A:** Cookies are automatically managed by the framework:
```gherkin
# Cookies from responses are automatically saved
When user sends POST request to "/login"
# Set-Cookie headers are captured

# Cookies are automatically sent with subsequent requests
When user sends GET request to "/dashboard"
# Saved cookies are included
```

### Q: How do I test GraphQL APIs?

**A:** Use GraphQL-specific steps:
```gherkin
Given user sets GraphQL query:
  """
  query GetUser($id: ID!) {
    user(id: $id) {
      name
      email
      posts {
        title
        publishedAt
      }
    }
  }
  """
And user sets GraphQL variable "id" to "{{userId}}"
When user sends GraphQL query to "/graphql"
Then response status should be 200
And response JSON path "$.data.user.name" should exist
```

This troubleshooting guide should help you resolve common issues and understand how to effectively debug problems when using the API Testing Framework.