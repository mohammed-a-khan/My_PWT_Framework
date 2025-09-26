# API Testing Framework - Advanced Examples

## Table of Contents
1. [E-commerce API Complete Workflow](#e-commerce-api-complete-workflow)
2. [Microservices Integration Testing](#microservices-integration-testing)
3. [Real-time API Testing](#real-time-api-testing)
4. [Performance and Load Testing](#performance-and-load-testing)
5. [Security Testing Scenarios](#security-testing-scenarios)
6. [Error Handling and Resilience](#error-handling-and-resilience)
7. [Complex Data Transformations](#complex-data-transformations)
8. [API Contract Testing](#api-contract-testing)

## E-commerce API Complete Workflow

### Complete Shopping Cart Flow
```gherkin
Feature: E-commerce Shopping Cart Workflow
  Background:
    Given user is working with API context "ecommerce"
    And user sets base URL to "{{ECOMMERCE_BASE_URL}}"
    And user generates UUID and saves as "sessionId"
    And user sets request header "X-Session-ID" to "{{sessionId}}"

  Scenario: Complete purchase workflow with multiple payment methods
    # User Registration
    Given user sets request body to:
      """
      {
        "email": "customer@example.com",
        "password": "SecurePass123!",
        "firstName": "John",
        "lastName": "Doe",
        "phone": "+1-555-0123"
      }
      """
    When user sends POST request to "/auth/register" and saves response as "registration"
    Then response status should be 201
    And response JSON path "$.user.id" should exist
    And response JSON path "$.token" should exist
    And user saves response JSON path "$.token" as "userToken"
    And user saves response JSON path "$.user.id" as "userId"

    # Set authentication for subsequent requests
    Given user sets bearer token "{{userToken}}"

    # Browse products and add to cart
    When user sends GET request to "/products?category=electronics&limit=10" and saves response as "products"
    Then response status should be 200
    And response JSON path "$.products" array should have length greater than 0
    And user saves response JSON path "$.products[0].id" as "product1Id"
    And user saves response JSON path "$.products[0].price" as "product1Price"
    And user saves response JSON path "$.products[1].id" as "product2Id"
    And user saves response JSON path "$.products[1].price" as "product2Price"

    # Add first product to cart
    Given user sets request body to:
      """
      {
        "productId": "{{product1Id}}",
        "quantity": 2
      }
      """
    When user sends POST request to "/cart/items" and saves response as "addToCart1"
    Then response status should be 201
    And response JSON path "$.cartTotal" should exist

    # Add second product to cart
    Given user sets request body to:
      """
      {
        "productId": "{{product2Id}}",
        "quantity": 1
      }
      """
    When user sends POST request to "/cart/items" and saves response as "addToCart2"
    Then response status should be 201

    # Get cart contents
    When user sends GET request to "/cart" and saves response as "cartContents"
    Then response status should be 200
    And response JSON path "$.items" array should have length 2
    And response JSON path "$.totalAmount" should exist
    And user saves response JSON path "$.totalAmount" as "cartTotal"

    # Apply discount code
    Given user sets request body to:
      """
      {
        "discountCode": "SAVE10"
      }
      """
    When user sends POST request to "/cart/discount" and saves response as "applyDiscount"
    Then response status should be 200
    And response JSON path "$.discountApplied" should equal true
    And response JSON path "$.newTotal" should be less than "{{cartTotal}}"
    And user saves response JSON path "$.newTotal" as "discountedTotal"

    # Add shipping address
    Given user sets request body to:
      """
      {
        "street": "123 Main St",
        "city": "Anytown",
        "state": "CA",
        "zipCode": "90210",
        "country": "US"
      }
      """
    When user sends POST request to "/user/addresses" and saves response as "addAddress"
    Then response status should be 201
    And user saves response JSON path "$.address.id" as "addressId"

    # Calculate shipping
    When user sends GET request to "/shipping/calculate?addressId={{addressId}}&total={{discountedTotal}}" and saves response as "shipping"
    Then response status should be 200
    And response JSON path "$.shippingCost" should exist
    And user saves response JSON path "$.shippingCost" as "shippingCost"

    # Add payment method
    Given user sets request body to:
      """
      {
        "type": "credit_card",
        "cardNumber": "4111111111111111",
        "expiryMonth": "12",
        "expiryYear": "2025",
        "cvv": "123",
        "cardholderName": "John Doe"
      }
      """
    When user sends POST request to "/user/payment-methods" and saves response as "addPayment"
    Then response status should be 201
    And user saves response JSON path "$.paymentMethod.id" as "paymentMethodId"

    # Create order
    Given user sets request body to:
      """
      {
        "shippingAddressId": "{{addressId}}",
        "paymentMethodId": "{{paymentMethodId}}",
        "shippingMethod": "standard"
      }
      """
    When user sends POST request to "/orders" and saves response as "createOrder"
    Then response status should be 201
    And response JSON path "$.order.id" should exist
    And response JSON path "$.order.status" should equal "pending"
    And user saves response JSON path "$.order.id" as "orderId"

    # Process payment
    When user sends POST request to "/orders/{{orderId}}/pay" and saves response as "processPayment"
    Then response status should be 200
    And response JSON path "$.paymentStatus" should equal "completed"
    And response JSON path "$.order.status" should equal "confirmed"

    # Verify order status
    When user sends GET request to "/orders/{{orderId}}" and saves response as "orderStatus"
    Then response status should be 200
    And response JSON path "$.status" should equal "confirmed"
    And response JSON path "$.items" array should have length 2
    And response JSON path "$.totalAmount" should exist

    # Verify cart is empty after order
    When user sends GET request to "/cart"
    Then response status should be 200
    And response JSON path "$.items" array should have length 0
```

## Microservices Integration Testing

### Cross-Service Communication Testing
```gherkin
Feature: Microservices Integration
  Background:
    Given user is working with API context "microservices"
    And user generates UUID and saves as "correlationId"

  Scenario: User service integration with order and payment services
    # Create user in User Service
    Given user sets base URL to "{{USER_SERVICE_URL}}"
    And user sets request header "X-Correlation-ID" to "{{correlationId}}"
    And user sets request body to:
      """
      {
        "username": "integration_test_user",
        "email": "test@example.com",
        "profile": {
          "firstName": "Integration",
          "lastName": "Test"
        }
      }
      """
    When user sends POST request to "/users" and saves response as "createUser"
    Then response status should be 201
    And user saves response JSON path "$.id" as "userId"
    And user saves response JSON path "$.apiKey" as "userApiKey"

    # Verify user creation event in Event Bus
    Given user sets base URL to "{{EVENT_BUS_URL}}"
    When user polls "/events?type=user.created&correlationId={{correlationId}}" every 1 seconds until status is 200
    Then response JSON path "$.events[0].data.userId" should equal "{{userId}}"

    # Create product in Catalog Service
    Given user sets base URL to "{{CATALOG_SERVICE_URL}}"
    And user sets API key "{{CATALOG_API_KEY}}" in header "X-API-Key"
    And user sets request body to:
      """
      {
        "name": "Test Product",
        "price": 99.99,
        "category": "electronics",
        "inventory": 100
      }
      """
    When user sends POST request to "/products" and saves response as "createProduct"
    Then response status should be 201
    And user saves response JSON path "$.id" as "productId"

    # Create order in Order Service
    Given user sets base URL to "{{ORDER_SERVICE_URL}}"
    And user sets API key "{{userApiKey}}" in header "X-User-API-Key"
    And user sets request body to:
      """
      {
        "userId": "{{userId}}",
        "items": [
          {
            "productId": "{{productId}}",
            "quantity": 2,
            "price": 99.99
          }
        ]
      }
      """
    When user sends POST request to "/orders" and saves response as "createOrder"
    Then response status should be 201
    And user saves response JSON path "$.id" as "orderId"
    And user saves response JSON path "$.totalAmount" as "orderTotal"

    # Verify inventory update in Catalog Service
    Given user sets base URL to "{{CATALOG_SERVICE_URL}}"
    When user waits for 2 seconds
    And user sends GET request to "/products/{{productId}}" and saves response as "checkInventory"
    Then response status should be 200
    And response JSON path "$.inventory" should equal 98

    # Process payment in Payment Service
    Given user sets base URL to "{{PAYMENT_SERVICE_URL}}"
    And user sets request body to:
      """
      {
        "orderId": "{{orderId}}",
        "amount": {{orderTotal}},
        "paymentMethod": {
          "type": "credit_card",
          "token": "test_card_token"
        }
      }
      """
    When user sends POST request to "/payments" and saves response as "processPayment"
    Then response status should be 200
    And response JSON path "$.status" should equal "completed"
    And user saves response JSON path "$.transactionId" as "transactionId"

    # Verify order status update
    Given user sets base URL to "{{ORDER_SERVICE_URL}}"
    When user polls "/orders/{{orderId}}" every 1 seconds until JSON path "$.status" equals "paid"
    Then response JSON path "$.paymentTransactionId" should equal "{{transactionId}}"

    # Verify user order history
    When user sends GET request to "/users/{{userId}}/orders"
    Then response status should be 200
    And response JSON path "$.orders" array should have length 1
    And response JSON path "$.orders[0].id" should equal "{{orderId}}"
```

## Real-time API Testing

### WebSocket and Server-Sent Events
```gherkin
Feature: Real-time API Testing
  Scenario: Chat application with real-time messaging
    Given user is working with API context "realtime"
    And user sets base URL to "{{CHAT_API_URL}}"

    # Create chat room
    Given user sets request body to:
      """
      {
        "name": "Integration Test Room",
        "type": "public"
      }
      """
    When user sends POST request to "/rooms" and saves response as "createRoom"
    Then response status should be 201
    And user saves response JSON path "$.id" as "roomId"
    And user saves response JSON path "$.webhookUrl" as "webhookUrl"

    # Join room and get real-time connection info
    When user sends POST request to "/rooms/{{roomId}}/join" and saves response as "joinRoom"
    Then response status should be 200
    And response JSON path "$.wsUrl" should exist
    And user saves response JSON path "$.wsUrl" as "websocketUrl"

    # Send message via REST API
    Given user sets request body to:
      """
      {
        "message": "Hello from integration test!",
        "userId": "test-user-123"
      }
      """
    When user sends POST request to "/rooms/{{roomId}}/messages" and saves response as "sendMessage"
    Then response status should be 201
    And user saves response JSON path "$.messageId" as "messageId"

    # Verify message delivery via webhook
    When user waits for 2 seconds
    And user sends GET request to "/rooms/{{roomId}}/messages/recent"
    Then response status should be 200
    And response JSON path "$.messages[0].id" should equal "{{messageId}}"
    And response JSON path "$.messages[0].content" should equal "Hello from integration test!"

    # Test message broadcasting to multiple users
    When user executes parallel requests:
      | POST | /rooms/{{roomId}}/messages | broadcast1 |
      | POST | /rooms/{{roomId}}/messages | broadcast2 |
      | POST | /rooms/{{roomId}}/messages | broadcast3 |

    Then response from "broadcast1" status should be 201
    And response from "broadcast2" status should be 201
    And response from "broadcast3" status should be 201

    # Verify all messages are received
    When user waits for 3 seconds
    And user sends GET request to "/rooms/{{roomId}}/messages/recent?limit=10"
    Then response JSON path "$.messages" array should have length greater than 3
```

## Performance and Load Testing

### High-Load Scenario Testing
```gherkin
Feature: Performance Testing
  Scenario: Load test user registration endpoint
    Given user is working with API context "load-test"
    And user sets base URL to "{{LOAD_TEST_URL}}"
    And user sets request timeout to 30 seconds

    # Warm-up phase
    When user sends GET request to "/health"
    Then response status should be 200
    And response time should be less than 1000 ms

    # Generate test data
    Given user generates random number between 10000 and 99999 and saves as "testSuffix"
    And user saves "loadtest{{testSuffix}}@example.com" as "testEmail"

    # Single user baseline
    Given user sets request body to:
      """
      {
        "email": "{{testEmail}}",
        "username": "loadtest{{testSuffix}}",
        "password": "TestPass123!"
      }
      """
    When user sends POST request to "/users" and saves response as "baseline"
    Then response status should be 201
    And response time should be less than 2000 ms

    # Concurrent user creation (simulating load)
    When user executes parallel requests:
      | POST | /users | load1  |
      | POST | /users | load2  |
      | POST | /users | load3  |
      | POST | /users | load4  |
      | POST | /users | load5  |
      | POST | /users | load6  |
      | POST | /users | load7  |
      | POST | /users | load8  |
      | POST | /users | load9  |
      | POST | /users | load10 |

    # Verify all requests completed successfully
    Then response from "load1" status should be 201
    And response from "load2" status should be 201
    And response from "load3" status should be 201
    And response from "load4" status should be 201
    And response from "load5" status should be 201

    # Performance validation
    And response from "load1" time should be less than 5000 ms
    And response from "load2" time should be less than 5000 ms
    And response from "load3" time should be less than 5000 ms

  Scenario: Database connection pool stress test
    Given user is working with API context "db-stress"
    And user sets base URL to "{{API_URL}}"

    # Create multiple database-intensive requests
    When user executes parallel requests:
      | GET | /reports/heavy-query-1 | query1  |
      | GET | /reports/heavy-query-2 | query2  |
      | GET | /reports/heavy-query-3 | query3  |
      | GET | /analytics/dashboard   | dash1   |
      | GET | /analytics/metrics     | metrics |
      | GET | /search?q=complex      | search  |

    Then response from "query1" status should be 200
    And response from "query2" status should be 200
    And response from "query3" status should be 200
    And response from "dash1" status should be 200

    # Verify system remains stable
    When user waits for 2 seconds
    And user sends GET request to "/health/detailed"
    Then response status should be 200
    And response JSON path "$.database.connectionPool.active" should be less than "50"
    And response JSON path "$.database.connectionPool.idle" should be greater than "5"
```

## Security Testing Scenarios

### Authentication and Authorization Testing
```gherkin
Feature: Security Testing
  Background:
    Given user is working with API context "security-test"
    And user sets base URL to "{{SECURE_API_URL}}"

  Scenario: JWT token security validation
    # Valid authentication
    Given user sets bearer token "{{VALID_JWT_TOKEN}}"
    When user sends GET request to "/protected/profile"
    Then response status should be 200

    # Expired token
    Given user sets bearer token "{{EXPIRED_JWT_TOKEN}}"
    When user sends GET request to "/protected/profile"
    Then response status should be 401
    And response JSON path "$.error.code" should equal "TOKEN_EXPIRED"

    # Invalid signature
    Given user sets bearer token "{{INVALID_SIGNATURE_TOKEN}}"
    When user sends GET request to "/protected/profile"
    Then response status should be 401
    And response JSON path "$.error.code" should equal "INVALID_TOKEN"

    # Malformed token
    Given user sets bearer token "not.a.valid.jwt.token"
    When user sends GET request to "/protected/profile"
    Then response status should be 401

  Scenario: Role-based access control
    # Admin user
    Given user sets bearer token "{{ADMIN_JWT_TOKEN}}"
    When user sends GET request to "/admin/users"
    Then response status should be 200

    # Regular user trying admin endpoint
    Given user sets bearer token "{{USER_JWT_TOKEN}}"
    When user sends GET request to "/admin/users"
    Then response status should be 403
    And response JSON path "$.error.code" should equal "INSUFFICIENT_PERMISSIONS"

    # User accessing own data
    When user sends GET request to "/users/me"
    Then response status should be 200

  Scenario: Input validation and SQL injection prevention
    # Test SQL injection in query parameter
    When user sends GET request to "/users?id=1' OR '1'='1"
    Then response status should be 400
    And response JSON path "$.error.message" should contain "Invalid input"

    # Test XSS in request body
    Given user sets request body to:
      """
      {
        "name": "<script>alert('xss')</script>",
        "email": "test@example.com"
      }
      """
    When user sends POST request to "/users"
    Then response status should be 400
    And response JSON path "$.error.code" should equal "INVALID_INPUT"

  Scenario: Rate limiting validation
    Given user sets API key "{{TEST_API_KEY}}" in header "X-API-Key"

    # Make requests up to the limit
    When user executes sequential requests with delay 100 ms:
      | GET | /api/limited-endpoint | req1 |
      | GET | /api/limited-endpoint | req2 |
      | GET | /api/limited-endpoint | req3 |
      | GET | /api/limited-endpoint | req4 |
      | GET | /api/limited-endpoint | req5 |

    Then response from "req1" status should be 200
    And response from "req2" status should be 200
    And response from "req3" status should be 200

    # Request that should be rate limited
    When user sends GET request to "/api/limited-endpoint"
    Then response status should be 429
    And response header "Retry-After" should exist
    And response JSON path "$.error.code" should equal "RATE_LIMIT_EXCEEDED"
```

## Error Handling and Resilience

### Circuit Breaker and Fallback Testing
```gherkin
Feature: Error Handling and Resilience
  Scenario: Circuit breaker pattern validation
    Given user is working with API context "resilience"
    And user sets base URL to "{{UNRELIABLE_SERVICE_URL}}"
    And user sets circuit breaker threshold to 3
    And user sets circuit breaker timeout to 10000 milliseconds

    # Test normal operation
    When user sends GET request to "/stable-endpoint"
    Then response status should be 200

    # Simulate service failures
    When user executes request with circuit breaker
    And user sends GET request to "/failing-endpoint"
    # This might fail, but circuit breaker should handle it

    When user executes request with circuit breaker
    And user sends GET request to "/failing-endpoint"
    # Second failure

    When user executes request with circuit breaker
    And user sends GET request to "/failing-endpoint"
    # Third failure - circuit should open

    # Next request should fail fast (circuit open)
    When user executes request with circuit breaker
    And user sends GET request to "/failing-endpoint"
    Then circuit breaker should be in "OPEN" state

  Scenario: Retry logic with exponential backoff
    Given user is working with API context "retry-test"
    And user sets base URL to "{{FLAKY_SERVICE_URL}}"
    And user sets retry count to 5
    And user sets retry delay to 1000 milliseconds

    # Test with exponential backoff
    When user sends request with exponential backoff retry
    And user sends GET request to "/flaky-endpoint"
    Then response should eventually be successful within 30 seconds
    Or response should provide meaningful error after all retries

  Scenario: Graceful degradation testing
    Given user is working with API context "degradation"
    And user sets base URL to "{{MAIN_SERVICE_URL}}"

    # Test with dependency service down
    Given dependency service "{{USER_SERVICE_URL}}" is unavailable
    When user sends GET request to "/dashboard"
    Then response status should be 200
    And response JSON path "$.userInfo" should equal "unavailable"
    And response JSON path "$.fallbackMode" should equal true

    # Test with partial service degradation
    Given dependency service "{{ANALYTICS_SERVICE_URL}}" has high latency
    When user sends GET request to "/reports"
    Then response status should be 200
    And response JSON path "$.analytics" should equal "cached"
```

## Complex Data Transformations

### Multi-step Data Processing
```gherkin
Feature: Complex Data Transformations
  Scenario: Multi-API data aggregation and transformation
    Given user is working with API context "data-processing"

    # Fetch user data
    Given user sets base URL to "{{USER_API_URL}}"
    When user sends GET request to "/users/{{targetUserId}}" and saves response as "userData"
    Then response status should be 200
    And user saves response JSON path "$.profile.preferences.language" as "userLanguage"
    And user saves response JSON path "$.profile.location.timezone" as "userTimezone"

    # Fetch user's content based on preferences
    Given user sets base URL to "{{CONTENT_API_URL}}"
    When user sends GET request to "/content?lang={{userLanguage}}&tz={{userTimezone}}" and saves response as "content"
    Then response status should be 200
    And user saves response JSON path "$.articles" as "articlesList"

    # Process recommendations
    Given user sets base URL to "{{RECOMMENDATION_API_URL}}"
    And user sets request body to:
      """
      {
        "userId": "{{targetUserId}}",
        "userPreferences": {
          "language": "{{userLanguage}}",
          "timezone": "{{userTimezone}}"
        },
        "contentIds": {{articlesList}}
      }
      """
    When user sends POST request to "/recommendations/generate" and saves response as "recommendations"
    Then response status should be 200
    And response JSON path "$.recommendations" array should have length greater than 0

    # Transform and personalize content
    When user chains from "recommendations" to request body:
      | $.recommendations[0].id     | primaryRecommendation |
      | $.recommendations[1].id     | secondaryRecommendation |
      | $.personalizedContent.theme | contentTheme |

    Given user sets base URL to "{{PERSONALIZATION_API_URL}}"
    And user adds request body field "userId" with value "{{targetUserId}}"
    And user adds request body field "language" with value "{{userLanguage}}"

    When user sends POST request to "/personalize" and saves response as "personalizedContent"
    Then response status should be 200
    And response JSON path "$.personalizedContent.theme" should exist
    And response JSON path "$.personalizedContent.layout" should exist

    # Validate final aggregated response structure
    And response body should match JSON schema in "personalized-content-schema.json"
```

## API Contract Testing

### Schema Evolution and Backward Compatibility
```gherkin
Feature: API Contract Testing
  Scenario: API version compatibility testing
    Given user is working with API context "contract-test"

    # Test v1 API
    Given user sets base URL to "{{API_V1_URL}}"
    And user sets request header "Accept" to "application/vnd.api.v1+json"
    When user sends GET request to "/users/123" and saves response as "v1Response"
    Then response status should be 200
    And response body should match JSON schema in "user-v1-schema.json"

    # Test v2 API with backward compatibility
    Given user sets base URL to "{{API_V2_URL}}"
    And user sets request header "Accept" to "application/vnd.api.v2+json"
    When user sends GET request to "/users/123" and saves response as "v2Response"
    Then response status should be 200
    And response body should match JSON schema in "user-v2-schema.json"

    # Verify v1 fields still exist in v2 (backward compatibility)
    And response JSON path "$.id" should exist
    And response JSON path "$.name" should exist
    And response JSON path "$.email" should exist

    # Verify new v2 fields exist
    And response JSON path "$.profile.avatar" should exist
    And response JSON path "$.metadata.lastLogin" should exist

  Scenario: Contract-first development validation
    Given user is working with API context "contract-validation"
    And user loads API specification from "openapi-spec.yaml"

    # Test all endpoints defined in specification
    When user validates endpoint "GET /users" matches specification
    And user validates endpoint "POST /users" matches specification
    And user validates endpoint "PUT /users/{id}" matches specification
    And user validates endpoint "DELETE /users/{id}" matches specification

    Then all endpoints should conform to specification
    And response schemas should match defined schemas
    And error responses should match error schema

  Scenario: Consumer-driven contract testing
    Given user is working with API context "consumer-contracts"

    # Test contracts for mobile app consumer
    Given user loads consumer contract "mobile-app-contracts.json"
    When user validates contract "get-user-profile"
    Then response should satisfy consumer expectations for mobile app

    # Test contracts for web app consumer
    Given user loads consumer contract "web-app-contracts.json"
    When user validates contract "user-dashboard-data"
    Then response should satisfy consumer expectations for web app

    # Test contracts for third-party integration
    Given user loads consumer contract "partner-api-contracts.json"
    When user validates contract "sync-user-data"
    Then response should satisfy consumer expectations for partner API
```

## Advanced Validation Scenarios

### Multi-dimensional Data Validation
```gherkin
Feature: Advanced Validation
  Scenario: Complex business rule validation
    Given user is working with API context "business-rules"
    And user sets base URL to "{{BUSINESS_API_URL}}"

    # Create order with business rule validation
    Given user sets request body to:
      """
      {
        "customerId": "{{customerId}}",
        "items": [
          {
            "productId": "PROD001",
            "quantity": 5,
            "price": 100.00
          },
          {
            "productId": "PROD002",
            "quantity": 2,
            "price": 250.00
          }
        ],
        "shippingAddress": {
          "country": "US",
          "state": "CA"
        }
      }
      """
    When user sends POST request to "/orders/validate" and saves response as "orderValidation"
    Then response status should be 200

    # Validate business rules are applied
    And response JSON path "$.validations.inventory.PROD001.available" should equal true
    And response JSON path "$.validations.pricing.totalBeforeTax" should equal 1000.00
    And response JSON path "$.validations.shipping.eligible" should equal true
    And response JSON path "$.validations.tax.rate" should equal 0.08
    And response JSON path "$.validations.tax.amount" should equal 80.00

    # Validate discount rules
    And response JSON path "$.validations.discounts.volumeDiscount.applicable" should equal true
    And response JSON path "$.validations.discounts.volumeDiscount.percentage" should equal 5
    And response JSON path "$.finalTotal" should equal 1026.00

  Scenario: Cross-field validation and data integrity
    Given user is working with API context "data-integrity"

    # Test with valid cross-field relationships
    Given user sets request body to:
      """
      {
        "startDate": "2024-01-15T10:00:00Z",
        "endDate": "2024-01-20T18:00:00Z",
        "eventType": "conference",
        "capacity": 500,
        "registrations": [
          {"userId": "user1", "ticketType": "general"},
          {"userId": "user2", "ticketType": "vip"}
        ]
      }
      """
    When user sends POST request to "/events" and saves response as "validEvent"
    Then response status should be 201

    # Test with invalid cross-field relationships
    Given user sets request body to:
      """
      {
        "startDate": "2024-01-20T10:00:00Z",
        "endDate": "2024-01-15T18:00:00Z",
        "eventType": "conference",
        "capacity": 2,
        "registrations": [
          {"userId": "user1", "ticketType": "general"},
          {"userId": "user2", "ticketType": "vip"},
          {"userId": "user3", "ticketType": "general"}
        ]
      }
      """
    When user sends POST request to "/events" and saves response as "invalidEvent"
    Then response status should be 400
    And response JSON path "$.errors[0].field" should equal "endDate"
    And response JSON path "$.errors[0].code" should equal "DATE_RANGE_INVALID"
    And response JSON path "$.errors[1].field" should equal "registrations"
    And response JSON path "$.errors[1].code" should equal "CAPACITY_EXCEEDED"
```

These advanced examples demonstrate the full power and flexibility of the API Testing Framework, showing how to handle complex real-world scenarios including e-commerce workflows, microservices integration, performance testing, security validation, and sophisticated data transformations.