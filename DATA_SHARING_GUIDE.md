# Data Sharing Guide - Complete Documentation

## Overview

The framework provides powerful data sharing capabilities that allow you to:
- Share data between steps within a scenario
- Share data between scenarios within a feature
- Share data globally across features
- Work with any data type (strings, numbers, objects, arrays, maps)
- Automatically resolve variables using `{{variableName}}` pattern
- Combine with encryption for secure data handling

## Table of Contents
- [Context Levels](#context-levels)
- [Saving Data](#saving-data)
- [Using Saved Data](#using-saved-data)
- [UI Testing Examples](#ui-testing-examples)
- [Database Testing Examples](#database-testing-examples)
- [API Testing Examples](#api-testing-examples)
- [Complex Data Types](#complex-data-types)
- [Best Practices](#best-practices)

## Context Levels

The framework provides three levels of data context:

| Level | Scope | Use Case | Step Syntax |
|-------|-------|----------|-------------|
| **Scenario Context** | Current scenario only | Default for most data | `Given user saves "value" as "key"` |
| **Feature Context** | All scenarios in feature | Share between scenarios | `Given user saves "value" as "key" in feature context` |
| **World/Global Context** | Entire test run | Cross-feature sharing | `Given user saves "value" as "key" globally` |

### Data Resolution Order
When you use `{{variableName}}`, the framework searches in this order:
1. Scenario Context (highest priority)
2. Feature Context
3. World/Global Context
4. Configuration (with `{{config:KEY}}`)
5. Environment Variables (with `{{env:VAR}}`)

## Saving Data

### Basic String Values

```gherkin
# Save to scenario context (default)
Given user saves "john.doe" as "username"
And user saves "test@example.com" as "email"
And user saves "ENCRYPTED:U2FsdGVkX1+..." as "password"

# Save to feature context (available across scenarios)
Given user saves "shared-token-123" as "authToken" in feature context

# Save globally (available across features)
Given user saves "global-session-id" as "sessionId" globally
```

### Capturing from UI Elements

```gherkin
# Capture text from element
Given user captures text from "#order-id" and saves as "orderId"

# Capture input value
Given user captures value from "#email-input" and saves as "enteredEmail"

# Capture attribute
Given user captures "href" attribute from "#link" and saves as "linkUrl"

# Capture current URL
Given user captures current URL and saves as "currentPage"

# Capture multiple elements (returns array)
Given user captures all text from ".product-name" and saves as "productNames"
```

### Database Query Results

```gherkin
# Save entire query result
When user executes query "SELECT * FROM users WHERE id = 123"
And user saves query result as "userData"

# Save specific column value
And user saves column "email" from result as "userEmail"
```

### Generated Values

```gherkin
# Generate UUID
Given user generates UUID and saves as "transactionId"

# Generate timestamp
Given user generates timestamp and saves as "createdAt"

# Generate random number
Given user generates random number between 1000 and 9999 and saves as "orderId"

# Generate random string
Given user generates random string of length 10 and saves as "password"
```

## Using Saved Data

### Automatic Resolution with {{variableName}}

The framework **automatically** resolves `{{variableName}}` patterns everywhere:

```gherkin
# In UI interactions
Given user saves "john.doe" as "username"
When user enters "{{username}}" in "#username-field"

# In API calls
Given user saves "AUTH-TOKEN-123" as "token"
When user sets header "Authorization" to "Bearer {{token}}"

# In database queries
Given user saves "123" as "userId"
When user executes query "SELECT * FROM orders WHERE user_id = {{userId}}"

# In assertions
Given user saves "Expected Title" as "pageTitle"
Then page title should be "{{pageTitle}}"
```

### Alternative Syntax: $variableName

You can also use `$variableName` syntax:

```gherkin
Given user saves "test-value" as "myVar"
When user enters "$myVar" in field
```

## UI Testing Examples

### Complete UI Flow with Data Capture

```gherkin
Scenario: Create order and verify
  # Navigate and capture initial data
  Given user navigates to products page
  When user captures text from ".product-price:first" and saves as "firstPrice"
  And user clicks on first product

  # Capture product details
  And user captures text from "#product-name" and saves as "productName"
  And user captures text from "#product-sku" and saves as "productSku"

  # Add to cart and checkout
  When user adds product to cart
  And user navigates to checkout

  # Generate order data
  And user generates random number between 10000 and 99999 and saves as "orderId"
  And user enters "Order-{{orderId}}" in "#order-reference"

  # Complete order
  When user completes checkout

  # Capture confirmation details
  And user captures text from "#confirmation-number" and saves as "confirmationNum"

  # Verify in order history
  When user navigates to order history
  Then user should see order "{{confirmationNum}}"
  And order should contain product "{{productName}}"
  And order should have SKU "{{productSku}}"
```

## Database Testing Examples

### Query Result Chaining

```gherkin
Scenario: Database data flow
  # Get user from database
  Given user connects to database
  When user executes query "SELECT * FROM users WHERE email = 'test@example.com'"
  And user saves column "user_id" from result as "userId"
  And user saves column "username" from result as "username"

  # Use in another query
  When user executes query "SELECT COUNT(*) as order_count FROM orders WHERE user_id = {{userId}}"
  And user saves column "order_count" from result as "orderCount"

  # Use in UI verification
  When user navigates to "/users/{{userId}}/profile"
  Then user should see "{{username}}"
  And order count should display "{{orderCount}}"
```

## API Testing Examples

### API Response Chaining

```gherkin
Scenario: API test with response chaining
  # Create a resource
  Given user sends POST request to "/api/users" with:
    """
    {
      "name": "John Doe",
      "email": "john@example.com"
    }
    """
  And user saves response JSON path "$.id" as "userId"
  And user saves response header "X-Auth-Token" as "authToken"

  # Use captured data in next request
  When user sets header "Authorization" to "Bearer {{authToken}}"
  And user sends GET request to "/api/users/{{userId}}"
  Then response should contain "John Doe"

  # Update using captured ID
  When user sends PUT request to "/api/users/{{userId}}" with:
    """
    {
      "name": "Jane Doe"
    }
    """
  Then response status should be 200
```

## Complex Data Types

### Working with Data Tables

#### Two-Column Tables (Key-Value Pairs)

When you have a 2-column table, it's automatically saved as a Map:

```gherkin
# Saves as Map with key-value pairs
Given user saves the following data as "userConfig":
  | firstName | John           |
  | lastName  | Doe            |
  | role      | Administrator  |
  | level     | 5              |
```

**Result:** `Map { 'firstName' => 'John', 'lastName' => 'Doe', ... }`

**Usage in step definitions:**
```typescript
const userConfig = this.scenarioContext.get('userConfig'); // Returns Map
const firstName = userConfig.get('firstName'); // 'John'
const role = userConfig.get('role'); // 'Administrator'
```

#### Multi-Column Tables (With Headers)

Tables with more than 2 columns are automatically saved as an array of objects:

```gherkin
# Automatically detects multi-column and treats first row as headers
Given user saves the following data as "products":
  | productId | productName | price | quantity | category    |
  | PROD-001  | Laptop      | 999   | 5        | Electronics |
  | PROD-002  | Mouse       | 25    | 10       | Accessories |
  | PROD-003  | Keyboard    | 75    | 8        | Accessories |
```

**Result:** Array of objects:
```javascript
[
  { productId: 'PROD-001', productName: 'Laptop', price: '999', quantity: '5', category: 'Electronics' },
  { productId: 'PROD-002', productName: 'Mouse', price: '25', quantity: '10', category: 'Accessories' },
  { productId: 'PROD-003', productName: 'Keyboard', price: '75', quantity: '8', category: 'Accessories' }
]
```

**Usage in step definitions:**
```typescript
const products = this.scenarioContext.get('products'); // Returns array

// Access specific product
const laptop = products[0];
console.log(laptop.productName); // 'Laptop'
console.log(laptop.price); // '999'

// Loop through products
products.forEach(product => {
    console.log(`${product.productName}: $${product.price}`);
});

// Filter products
const accessories = products.filter(p => p.category === 'Accessories');
```

#### Explicit Table Method

Use when you want to be explicit about multi-column tables:

```gherkin
# Explicitly save as table with headers
Given user saves the following table as "orders":
  | orderId | customerName | amount  | status    | date       |
  | ORD-001 | John Doe     | 250.00  | pending   | 2024-01-01 |
  | ORD-002 | Jane Smith   | 180.50  | completed | 2024-01-02 |
  | ORD-003 | Bob Johnson  | 425.75  | shipped   | 2024-01-03 |
```

#### Single Record as Object

For saving a single record with multiple fields:

```gherkin
# Save single record as object
Given user saves the following record as "currentUser":
  | firstName | lastName | email            | role  | level | department  |
  | John      | Doe      | john@example.com | admin | 5     | Engineering |
```

**Result:** Single object:
```javascript
{
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  role: 'admin',
  level: '5',
  department: 'Engineering'
}
```

**Usage:**
```typescript
const currentUser = this.scenarioContext.get('currentUser');
console.log(currentUser.email); // 'john@example.com'
console.log(currentUser.department); // 'Engineering'
```

### Working with JSON Objects

```gherkin
# Save JSON object
Given user saves the following JSON as "apiSettings":
  """
  {
    "baseUrl": "https://api.example.com",
    "timeout": 30000,
    "retries": 3,
    "headers": {
      "Content-Type": "application/json",
      "X-API-Version": "v2"
    }
  }
  """
```

### Working with Lists/Arrays

```gherkin
# Save a simple list
Given user saves the following list as "allowedRoles":
  | admin     |
  | editor    |
  | viewer    |
  | moderator |

# Result: ['admin', 'editor', 'viewer', 'moderator']

# Capture multiple elements (creates array)
Given user captures all text from ".menu-item" and saves as "menuItems"
```

## Best Practices

### 1. Choose the Right Context Level

```gherkin
# Scenario-specific data (default)
Given user saves "temp-123" as "tempId"

# Data needed across scenarios
Given user saves "shared-session" as "session" in feature context

# Global test configuration
Given user saves "test-run-001" as "testRunId" globally
```

### 2. Use Descriptive Variable Names

```gherkin
# Good - Clear and descriptive
Given user saves "ORD-12345" as "customerOrderId"
Given user saves "john@example.com" as "customerEmail"

# Bad - Too generic
Given user saves "ORD-12345" as "id"
Given user saves "john@example.com" as "email"
```

### 3. Generate Dynamic Data for Uniqueness

```gherkin
# Ensure unique test data
Given user generates UUID and saves as "uniqueUserId"
And user saves "user_{{uniqueUserId}}@test.com" as "testEmail"
```

### 4. Clean Up When Needed

```gherkin
# Clear scenario variables when needed
Given user clears all scenario variables

# Feature and global contexts persist - plan accordingly
```

### 5. Combine with Encryption

```gherkin
# Save encrypted values - they're auto-decrypted when used
Given user saves "ENCRYPTED:U2FsdGVkX1+..." as "apiKey"
When user sets API key to "{{apiKey}}"  # Automatically decrypted!
```

### 6. Debug When Needed

```gherkin
# Print all variables for debugging
Then user prints all saved variables

# Verify variable exists
Then user verifies variable "orderId" exists
```

## Common Patterns

### Pattern 1: Test Data Setup

```gherkin
Background:
  Given user generates UUID and saves as "testRunId"
  And user saves "test_run_{{testRunId}}" as "testPrefix"
  And user saves "{{testPrefix}}@example.com" as "testEmail"
```

### Pattern 2: Multi-Step Transaction

```gherkin
Scenario: Complete purchase flow
  # Step 1: Product selection
  When user selects product "PROD-001"
  And user captures text from "#price" and saves as "productPrice"

  # Step 2: Cart
  And user adds to cart
  And user captures text from "#cart-total" and saves as "cartTotal"

  # Step 3: Checkout
  And user proceeds to checkout
  And user generates random number between 10000 and 99999 and saves as "orderId"

  # Step 4: Confirmation
  And user completes purchase
  And user captures text from "#confirmation" and saves as "confirmationCode"

  # Step 5: Verification
  Then order "{{orderId}}" should have confirmation "{{confirmationCode}}"
  And total should be "{{cartTotal}}"
```

### Pattern 3: Cross-System Validation

```gherkin
Scenario: Validate across UI, API, and Database
  # Create via API
  Given user sends POST request to "/api/products" with:
    """
    {"name": "Test Product", "sku": "SKU-123"}
    """
  And user saves response JSON path "$.id" as "productId"

  # Verify in database
  When user executes query "SELECT * FROM products WHERE id = {{productId}}"
  And user saves column "created_at" from result as "createdTime"

  # Verify in UI
  When user navigates to "/products/{{productId}}"
  Then product should display "Test Product"
  And creation time should show "{{createdTime}}"
```

## Troubleshooting

### Variable Not Found

**Error**: `Variable 'myVar' not found in any context`

**Solution**: Ensure variable is saved before use:
```gherkin
Given user saves "value" as "myVar"  # Save first
When user uses "{{myVar}}"           # Then use
```

### Wrong Context Level

**Problem**: Variable not available in next scenario

**Solution**: Use feature context:
```gherkin
# Scenario 1
Given user saves "shared" as "data" in feature context

# Scenario 2
When user uses "{{data}}"  # Now available
```

### Complex Object Access

**Problem**: Need to access property of saved object

**Solution**: In step definition, retrieve and access:
```typescript
const config = this.context.get('apiSettings');
const baseUrl = config.baseUrl;
```

## Summary

The data sharing system provides:
- **Three context levels** for different scopes
- **Automatic resolution** of `{{variableName}}` patterns
- **Support for any data type** (primitives, objects, arrays)
- **UI element capture** capabilities
- **Database result storage**
- **Dynamic value generation**
- **Seamless encryption integration**

This enables you to write maintainable, data-driven tests that can share information across steps, scenarios, and even features, regardless of whether you're doing UI testing, API testing, or database testing.