# API Testing Framework - Quick Reference Guide

## Essential Step Definitions Cheat Sheet

### Context & Setup
```gherkin
Given user is working with API context "context-name"
Given user sets base URL to "https://api.example.com"
Given user sets request timeout to 30 seconds
```

### Authentication
```gherkin
Given user sets basic authentication with username "user" and password "pass"
Given user sets bearer token "your-jwt-token"
Given user sets API key "key123" in header "X-API-Key"
Given user configures OAuth2 with client ID "client" and secret "secret"
```

### Headers
```gherkin
Given user sets request header "Content-Type" to "application/json"
Given user sets Authorization header with Bearer token "{{token}}"
Given user loads headers from "headers.json" file
```

### Request Body
```gherkin
Given user sets request body to:
  """
  {"name": "John", "email": "john@example.com"}
  """
Given user adds form field "username" with value "john"
Given user adds file "image.jpg" as "avatar" to multipart
```

### Execution
```gherkin
When user sends GET request to "/users"
When user sends POST request to "/users" and saves response as "create-user"
When user executes parallel requests:
  | GET | /users | users |
  | GET | /posts | posts |
```

### Validation
```gherkin
Then response status should be 200
Then response JSON path "$.id" should exist
Then response JSON path "$.name" should equal "John"
Then response body should match JSON schema in "schema.json"
Then response time should be less than 1000 ms
```

### Chaining
```gherkin
When user uses response JSON path "$.id" from "create-user" as request body field "userId"
When user saves response JSON path "$.token" as "authToken"
```

### Utilities
```gherkin
Given user saves "value" as "variableName"
Given user generates UUID and saves as "requestId"
When user waits for 5 seconds
Then user prints variable "userId"
```

## Common Authentication Patterns

### JWT Bearer Token
```gherkin
Given user sets bearer token "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Basic Auth
```gherkin
Given user sets basic authentication with username "admin" and password "secret123"
```

### API Key in Header
```gherkin
Given user sets API key "abc123xyz" in header "X-API-Key"
```

### OAuth2 Flow
```gherkin
Given user configures OAuth2 with client ID "myapp" and secret "mysecret"
When user authenticates with OAuth2 using scope "read write"
Then user saves OAuth2 token as "accessToken"
```

## Request Body Patterns

### JSON Body
```gherkin
Given user sets request body to:
  """
  {
    "name": "{{userName}}",
    "email": "{{userEmail}}",
    "active": true
  }
  """
```

### Form Data
```gherkin
Given user sets content type to "application/x-www-form-urlencoded"
And user adds form field "username" with value "john"
And user adds form field "password" with value "secret"
```

### Multipart Form
```gherkin
Given user adds form field "title" with value "Profile Picture"
And user adds file "avatar.jpg" as "image" to multipart
And user adds form field "description" with value "User avatar"
```

### GraphQL
```gherkin
Given user sets GraphQL query:
  """
  query GetUser($id: ID!) {
    user(id: $id) {
      name
      email
      posts {
        title
        content
      }
    }
  }
  """
And user sets GraphQL variable "id" to "{{userId}}"
```

## Validation Patterns

### Status Code Validation
```gherkin
Then response status should be 200
Then response status should be between 200 and 299
```

### Header Validation
```gherkin
Then response header "Content-Type" should contain "application/json"
Then response header "X-Rate-Limit" should exist
```

### JSON Path Validation
```gherkin
Then response JSON path "$.users[0].id" should exist
Then response JSON path "$.users" array should have length 5
Then response JSON path "$.user.email" should equal "{{expectedEmail}}"
Then response JSON path "$.status" should be of type "string"
```

### Schema Validation
```gherkin
Then response body should match JSON schema in "user-schema.json"
```

### Performance Validation
```gherkin
Then response time should be less than 2000 ms
Then response size should be less than 1024 bytes
```

## Variable Management

### Saving Variables
```gherkin
Given user saves "12345" as "userId"
Given user saves response JSON path "$.token" as "authToken"
Given user saves response header "Location" as "resourceUrl"
```

### Using Variables
```gherkin
When user sends GET request to "/users/{{userId}}"
Given user sets request header "Authorization" to "Bearer {{authToken}}"
```

### Generating Data
```gherkin
Given user generates UUID and saves as "correlationId"
Given user generates timestamp and saves as "requestTime"
Given user generates random number between 1 and 100 and saves as "randomId"
```

## Advanced Execution Patterns

### Parallel Requests
```gherkin
When user executes parallel requests:
  | GET  | /users    | users-response    |
  | GET  | /products | products-response |
  | POST | /logs     | logs-response     |
```

### Sequential with Delays
```gherkin
When user executes sequential requests with delay 1000 ms:
  | GET | /status | status-check-1 |
  | GET | /status | status-check-2 |
  | GET | /status | status-check-3 |
```

### Polling
```gherkin
When user polls "/job/{{jobId}}/status" every 2 seconds until status is 200
```

### Retry Logic
```gherkin
When user executes request with retry count 5
When user sends request with exponential backoff retry
```

### Conditional Execution
```gherkin
When user executes conditional request if "environment" equals "staging"
```

## File Operations

### Upload File
```gherkin
When user uploads file "document.pdf" to "/documents"
```

### Download File
```gherkin
When user downloads file from "/documents/123" to "downloaded-doc.pdf"
```

### Load Data from File
```gherkin
Given user loads variables from file "test-data.json"
Given user loads request from "create-user-request.json" file
```

## Error Handling

### Expected Errors
```gherkin
When user sends GET request to "/nonexistent"
Then response status should be 404
And response JSON path "$.error.message" should contain "not found"
```

### Timeout Handling
```gherkin
Given user sets request timeout to 5 seconds
When user sends GET request to "/slow-endpoint"
Then request should handle timeout appropriately
```

## Common Test Patterns

### CRUD Operations
```gherkin
# Create
When user sends POST request to "/users" and saves response as "create"
Then response status should be 201
And user saves response JSON path "$.id" as "userId"

# Read
When user sends GET request to "/users/{{userId}}" and saves response as "read"
Then response status should be 200

# Update
When user sends PUT request to "/users/{{userId}}" and saves response as "update"
Then response status should be 200

# Delete
When user sends DELETE request to "/users/{{userId}}"
Then response status should be 204
```

### Authentication Flow
```gherkin
# Login
Given user sets request body to:
  """
  {"username": "{{username}}", "password": "{{password}}"}
  """
When user sends POST request to "/auth/login" and saves response as "login"
Then response status should be 200
And user saves response JSON path "$.token" as "authToken"

# Use authenticated endpoint
Given user sets bearer token "{{authToken}}"
When user sends GET request to "/protected/resource"
Then response status should be 200
```

### Data Validation
```gherkin
When user sends GET request to "/users"
Then response status should be 200
And response JSON path "$.users" should exist
And response JSON path "$.users" should be of type "array"
And response JSON path "$.users[0].id" should exist
And response body should match JSON schema in "users-list-schema.json"
```

## Environment-Specific Testing

### Development Environment
```gherkin
Given user is working with API context "development"
And user sets base URL to "{{DEV_BASE_URL}}"
And user sets API key "{{DEV_API_KEY}}" in header "X-API-Key"
```

### Staging Environment
```gherkin
Given user is working with API context "staging"
And user sets base URL to "{{STAGING_BASE_URL}}"
And user sets bearer token "{{STAGING_TOKEN}}"
```

### Production Environment
```gherkin
Given user is working with API context "production"
And user sets base URL to "{{PROD_BASE_URL}}"
And user enables SSL certificate validation
And user sets request timeout to 60 seconds
```

This quick reference provides immediate access to the most commonly used patterns and step definitions in the API Testing Framework.