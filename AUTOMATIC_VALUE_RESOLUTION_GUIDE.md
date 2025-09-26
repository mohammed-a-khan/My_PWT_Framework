# Automatic Value Resolution Guide

## Overview

The CS Test Automation Framework provides **automatic value resolution** that transparently handles:
- **Encrypted value decryption** - Automatically decrypts values with `ENCRYPTED:` prefix
- **Variable substitution** - Resolves `{{variableName}}` and `$variableName` patterns
- **Configuration value injection** - Replaces configuration placeholders

This happens automatically at the framework level - **you never need to manually decrypt or resolve values** in your step definitions or test code.

## Table of Contents
- [How It Works](#how-it-works)
- [Encrypted Values in Feature Files](#encrypted-values-in-feature-files)
- [Encrypted Values in Test Data](#encrypted-values-in-test-data)
- [Variable Substitution](#variable-substitution)
- [Configuration Files](#configuration-files)
- [Encrypting Values](#encrypting-values)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## How It Works

The framework automatically resolves values at three levels:

1. **BDD Step Parameters** - Before passing to step definitions
2. **Test Data Loading** - When loading CSV, JSON, Excel, XML files
3. **Configuration Loading** - When reading .env files

### Variable Substitution Patterns

| Pattern | Source | Example | Usage |
|---------|--------|---------|--------|
| `{{variableName}}` | Test context variables | `{{userId}}` | Variables saved during test |
| `$variableName` | Test context variables | `$userId` | Alternative syntax for test variables |
| `{{config:KEY}}` | Configuration (.env files) | `{{config:API_TOKEN}}` | Explicitly reference config values |
| `{{env:VAR}}` | Environment variables | `{{env:PATH}}` | OS environment variables |
| `ENCRYPTED:...` | Any source | `ENCRYPTED:U2FsdGVkX1+...` | Automatically decrypted |

### Resolution Order
1. First checks if value is encrypted (`ENCRYPTED:` prefix) and decrypts it
2. Then performs variable substitution based on pattern:
   - `{{var}}` or `$var` → Test context
   - `{{config:KEY}}` → Configuration files
   - `{{env:VAR}}` → Environment variables
3. Finally returns the fully resolved value

## Encrypted Values in Feature Files

### Basic Authentication Example

```gherkin
Feature: Secure API Testing

  Scenario: Login with encrypted credentials
    Given user sets basic auth username "admin" and password "ENCRYPTED:U2FsdGVkX1+abc123..."
    When user sends POST request to "/login"
    Then response status should be 200
```

**Step Definition (No decryption needed!):**
```typescript
@CSBDDStepDef("user sets basic auth username {string} and password {string}")
async setBasicAuth(username: string, password: string): Promise<void> {
    // password is already decrypted - just use it directly!
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    this.setHeader('Authorization', `Basic ${auth}`);
}
```

### API Token Example

```gherkin
Scenario: Use encrypted API token
  Given user sets bearer token "ENCRYPTED:U2FsdGVkX1+xyz789..."
  When user sends GET request to "/api/users"
  Then response status should be 200
```

**Step Definition:**
```typescript
@CSBDDStepDef("user sets bearer token {string}")
async setBearerToken(token: string): Promise<void> {
    // token is already decrypted!
    this.setHeader('Authorization', `Bearer ${token}`);
}
```

### Certificate Authentication Example

```gherkin
Scenario: Certificate with encrypted password
  Given user loads certificate from "certs/client.pfx" with password "ENCRYPTED:U2FsdGVkX1+cert456..."
  When user sends GET request to "/secure/endpoint"
  Then response status should be 200
```

### Database Connection Example

```gherkin
Scenario: Connect to database with encrypted password
  Given user connects to database with:
    | host     | localhost                          |
    | username | dbuser                             |
    | password | ENCRYPTED:U2FsdGVkX1+dbpass789... |
    | database | testdb                             |
```

## Encrypted Values in Test Data

### CSV File Example

**test-users.csv:**
```csv
username,password,email,apiKey
john.doe,ENCRYPTED:U2FsdGVkX1+pass123...,john@example.com,ENCRYPTED:U2FsdGVkX1+key456...
jane.smith,ENCRYPTED:U2FsdGVkX1+pass789...,jane@example.com,ENCRYPTED:U2FsdGVkX1+key012...
```

**Usage in Feature File:**
```gherkin
Scenario Outline: Login with test users
  Given user loads test data from "test-users.csv"
  When user logs in with username "<username>" and password "<password>"
  Then user should be authenticated

  Examples:
    | username   |
    | john.doe   |
    | jane.smith |
```

**In Your Code:**
```typescript
const testData = await CSDataProvider.getInstance().loadData('test-users.csv');
// testData[0].password is already decrypted!
// testData[0].apiKey is already decrypted!
```

### JSON File Example

**test-config.json:**
```json
{
  "environments": [
    {
      "name": "staging",
      "apiUrl": "https://staging.example.com",
      "apiKey": "ENCRYPTED:U2FsdGVkX1+staging123...",
      "dbPassword": "ENCRYPTED:U2FsdGVkX1+dbstaging456..."
    },
    {
      "name": "production",
      "apiUrl": "https://api.example.com",
      "apiKey": "ENCRYPTED:U2FsdGVkX1+prod789...",
      "dbPassword": "ENCRYPTED:U2FsdGVkX1+dbprod012..."
    }
  ]
}
```

**Usage:**
```typescript
const config = await CSDataProvider.getInstance().loadData('test-config.json');
// All encrypted values are automatically decrypted!
const stagingKey = config.environments[0].apiKey; // Already decrypted
```

### Excel File Example

**test-accounts.xlsx:**
| AccountType | Username | Password | SecretKey |
|-------------|----------|----------|-----------|
| Admin | admin | ENCRYPTED:U2FsdGVkX1+admin123... | ENCRYPTED:U2FsdGVkX1+secret456... |
| User | user1 | ENCRYPTED:U2FsdGVkX1+user789... | ENCRYPTED:U2FsdGVkX1+secret012... |

**Usage:**
```typescript
const accounts = await CSDataProvider.getInstance().loadData({
    source: 'test-accounts.xlsx',
    sheet: 'Accounts'
});
// All passwords and secret keys are automatically decrypted!
```

### XML File Example

**test-services.xml:**
```xml
<services>
  <service>
    <name>PaymentAPI</name>
    <endpoint>https://payment.example.com</endpoint>
    <apiKey>ENCRYPTED:U2FsdGVkX1+payment123...</apiKey>
    <secret>ENCRYPTED:U2FsdGVkX1+secret456...</secret>
  </service>
  <service>
    <name>NotificationAPI</name>
    <endpoint>https://notify.example.com</endpoint>
    <apiKey>ENCRYPTED:U2FsdGVkX1+notify789...</apiKey>
    <secret>ENCRYPTED:U2FsdGVkX1+secret012...</secret>
  </service>
</services>
```

## Variable Substitution

The framework supports multiple variable resolution patterns with **clear distinction** between different sources:

### 1. Context Variables (Test Data)
Use `{{variableName}}` or `$variableName` for variables saved during test execution:

```gherkin
Background:
  Given user saves "12345" as "userId"
  And user saves "john.doe" as "username"
  And user saves "ENCRYPTED:U2FsdGVkX1+token789..." as "authToken"

Scenario: Use test variables
  # Variable substitution with {{variableName}}
  Given user sets header "X-User-ID" to "{{userId}}"
  And user enters username "{{username}}"
  And user sets bearer token "{{authToken}}"  # This gets decrypted too!
  When user sends GET request to "/users/{{userId}}/profile"

  # Alternative syntax with $variableName
  Given user sets header "X-Request-ID" to "$userId"
```

### 2. Configuration Values (.env files)
Use `{{config:KEY}}` to explicitly reference configuration values:

```gherkin
# With .env file containing:
# API_TOKEN=my-secret-token
# BASE_URL=https://api.example.com
# DB_PASSWORD=ENCRYPTED:U2FsdGVkX1+encrypted...

Scenario: Use configuration values
  Given user sets base URL to "{{config:BASE_URL}}"
  And user sets bearer token "{{config:API_TOKEN}}"
  And user connects to database with password "{{config:DB_PASSWORD}}"  # Auto-decrypted!
  When user sends GET request to "/api/users"
  Then response status should be 200
```

### 3. Environment Variables
Use `{{env:VAR}}` to reference OS environment variables:

```gherkin
Scenario: Use environment variables
  Given user sets proxy to "{{env:HTTP_PROXY}}"
  And user sets home directory to "{{env:HOME}}"
  And user uses CI token "{{env:GITHUB_TOKEN}}"
  When user executes build
  Then build should succeed
```

### 4. Clear Separation - No Conflicts

```gherkin
Scenario: No naming conflicts example
  # Create a test variable named API_TOKEN
  Given user saves "test-token-123" as "API_TOKEN"

  # Use test variable (from context)
  When user uses token "{{API_TOKEN}}"           # -> "test-token-123"

  # Use configuration value explicitly
  And user uses config token "{{config:API_TOKEN}}"  # -> value from .env file

  # Both can coexist without conflicts!
```

### Nested Variable Resolution

```gherkin
Scenario: Chain variable resolution
  Given user saves "ENCRYPTED:U2FsdGVkX1+secret123..." as "encryptedValue"
  And user saves "encryptedValue" as "reference"
  # Double resolution: first gets "encryptedValue", then decrypts it
  When user uses password "{{reference}}"
  Then password should be decrypted
```

## Configuration Files

### Environment Variables (.env)

**.env file:**
```bash
# Encrypted database password
DB_PASSWORD=ENCRYPTED:U2FsdGVkX1+dbpass123...

# Encrypted API keys
STRIPE_API_KEY=ENCRYPTED:U2FsdGVkX1+stripe456...
SENDGRID_API_KEY=ENCRYPTED:U2FsdGVkX1+sendgrid789...

# Encrypted JWT secret
JWT_SECRET=ENCRYPTED:U2FsdGVkX1+jwtsecret012...
```

**Usage in Code:**
```typescript
// Automatically decrypted when accessed
const dbPassword = CSConfigurationManager.getInstance().get('DB_PASSWORD');
const stripeKey = CSConfigurationManager.getInstance().get('STRIPE_API_KEY');
```

### Environment-Specific Configs

**.env.staging:**
```bash
API_URL=https://staging.example.com
API_KEY=ENCRYPTED:U2FsdGVkX1+stagingkey123...
DB_PASSWORD=ENCRYPTED:U2FsdGVkX1+stagingdb456...
```

**.env.production:**
```bash
API_URL=https://api.example.com
API_KEY=ENCRYPTED:U2FsdGVkX1+prodkey789...
DB_PASSWORD=ENCRYPTED:U2FsdGVkX1+proddb012...
```

## Encrypting Values

### Using the CLI Tool

```bash
# Encrypt a value
npx cs-encrypt "mySecretPassword"
# Output: ENCRYPTED:U2FsdGVkX1+abc123xyz...

# Encrypt with custom key
npx cs-encrypt "mySecretPassword" --key "myCustomKey"

# Encrypt from file
npx cs-encrypt --file secrets.txt

# Batch encrypt JSON file
npx cs-encrypt-json config.json --fields password,apiKey,secret
```

### Programmatic Encryption

```typescript
import { CSEncryptionUtil } from './utils/CSEncryptionUtil';

const encryptionUtil = CSEncryptionUtil.getInstance();

// Encrypt a value
const encrypted = encryptionUtil.encrypt('mySecretPassword');
console.log(encrypted); // ENCRYPTED:U2FsdGVkX1+...

// Check if a value is encrypted
if (encryptionUtil.isEncrypted(someValue)) {
    console.log('Value is encrypted');
}

// Decrypt a value (usually not needed - framework does this)
const decrypted = encryptionUtil.decrypt(encrypted);
```

## Best Practices

### 1. Never Commit Unencrypted Secrets

```gherkin
# ❌ BAD - Plain text password
Given user sets password to "myPassword123"

# ✅ GOOD - Encrypted password
Given user sets password to "ENCRYPTED:U2FsdGVkX1+abc123..."
```

### 2. Use Configuration for Shared Secrets

```gherkin
# ❌ BAD - Hardcoded encrypted value in multiple places
Scenario: Test 1
  Given user sets API key to "ENCRYPTED:U2FsdGVkX1+key123..."

Scenario: Test 2
  Given user sets API key to "ENCRYPTED:U2FsdGVkX1+key123..."

# ✅ GOOD - Use configuration
# In .env: API_KEY=ENCRYPTED:U2FsdGVkX1+key123...
Scenario: Test 1
  Given user sets API key from config "API_KEY"

Scenario: Test 2
  Given user sets API key from config "API_KEY"
```

### 3. Encrypt Sensitive Test Data Files

```bash
# Encrypt all sensitive fields in test data
npx cs-encrypt-csv users.csv --fields password,ssn,creditCard
npx cs-encrypt-json config.json --fields apiKey,secret,password
npx cs-encrypt-excel accounts.xlsx --fields password --sheet Users
```

### 4. Use Variables for Dynamic Values

```gherkin
# ✅ GOOD - Generate once, use multiple times
Background:
  Given user generates UUID and saves as "sessionId"
  And user saves "ENCRYPTED:U2FsdGVkX1+token..." as "authToken"

Scenario: Multiple API calls
  Given user sets header "X-Session-ID" to "{{sessionId}}"
  And user sets bearer token "{{authToken}}"
  When user sends GET request to "/api/data"
  And user sends POST request to "/api/update"
```

### 5. Document Encryption Keys

```yaml
# test-config.yml
encryption:
  description: "Uses default framework key for development"
  production:
    key_location: "AWS Secrets Manager"
    key_name: "test-automation-encryption-key"
  staging:
    key_location: "Environment variable"
    key_name: "CS_ENCRYPTION_KEY"
```

## Troubleshooting

### Value Not Being Decrypted

**Problem:** Encrypted value appears in test output
```
Expected: "myPassword"
Actual: "ENCRYPTED:U2FsdGVkX1+..."
```

**Solutions:**
1. Ensure value starts with exact prefix `ENCRYPTED:`
2. Check encryption key is configured correctly
3. Verify step is using framework resolution (not custom)

### Decryption Failed

**Error:** `Failed to decrypt value`

**Solutions:**
1. Verify encryption key matches:
   ```bash
   echo $CS_ENCRYPTION_KEY
   ```
2. Re-encrypt with current key:
   ```bash
   npx cs-encrypt "myValue"
   ```
3. Check for value corruption (copy-paste issues)

### Variable Not Resolving

**Problem:** `{{variable}}` appears literally in output

**Solutions:**
1. Ensure variable is set before use:
   ```gherkin
   Given user saves "value" as "myVar"
   Then user can use "{{myVar}}"
   ```
2. Check variable name spelling
3. Verify context is available in step

### Performance Issues

**Problem:** Slow test execution with many encrypted values

**Solutions:**
1. Use configuration files for shared encrypted values
2. Cache decrypted values in Background section:
   ```gherkin
   Background:
     Given user loads and caches encrypted config
   ```
3. Batch load encrypted test data

## Security Considerations

### Key Management

1. **Development:** Use default framework key (built-in)
2. **CI/CD:** Set via environment variable:
   ```bash
   export CS_ENCRYPTION_KEY="your-ci-key"
   ```
3. **Production:** Use secret management service:
   - AWS Secrets Manager
   - Azure Key Vault
   - HashiCorp Vault

### Rotation Strategy

```bash
# 1. Generate new key
npx cs-generate-key > new-key.txt

# 2. Re-encrypt all values with new key
npx cs-rotate-encryption --old-key old.txt --new-key new.txt --dir ./test-data

# 3. Update key in environment
export CS_ENCRYPTION_KEY=$(cat new-key.txt)

# 4. Verify tests pass
npm test

# 5. Securely delete old key
shred -vfz old.txt
```

### Audit Trail

```typescript
// Enable encryption audit logging
CSEncryptionUtil.getInstance().enableAudit({
    logDecryption: true,
    logFile: 'encryption-audit.log',
    includeStackTrace: false
});
```

## Advanced Examples

### Multi-Environment Testing

```gherkin
Feature: Multi-environment API testing

  Background:
    Given user loads environment config from "env-{{ENV}}.json"
    # env-staging.json has ENCRYPTED values that auto-decrypt

  Scenario: Test across environments
    Given user sets base URL to "{{apiUrl}}"
    And user sets bearer token "{{apiKey}}"  # Automatically decrypted
    When user sends GET request to "/health"
    Then response status should be 200
```

### Conditional Encryption

```gherkin
Scenario: Use encryption based on environment
  Given user sets password to "{{password}}"
  # In dev: password = "testpass"
  # In prod: password = "ENCRYPTED:U2FsdGVkX1+..."
  When user logs in
  Then user should be authenticated
```

### Bulk Data Testing

```typescript
// Load test data with mixed encrypted/plain values
const users = await CSDataProvider.getInstance().loadData({
    source: 'users.csv',
    transform: (row) => {
        // All encrypted fields already decrypted by framework
        return {
            ...row,
            fullName: `${row.firstName} ${row.lastName}`,
            // password is already decrypted if it was encrypted
            hashedPassword: hash(row.password)
        };
    }
});
```

## Summary

The automatic value resolution feature ensures:
- **Security** - Sensitive values stay encrypted in files
- **Simplicity** - No manual decryption needed in code
- **Consistency** - Same resolution everywhere
- **Transparency** - Works invisibly in the background

Just prefix sensitive values with `ENCRYPTED:` and the framework handles the rest!