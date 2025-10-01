# Database Testing Framework - Comprehensive Technical Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [Database Adapters](#database-adapters)
5. [Connection Management](#connection-management)
6. [Query Execution](#query-execution)
7. [Transaction Management](#transaction-management)
8. [Result Set Handling](#result-set-handling)
9. [BDD Step Definitions](#bdd-step-definitions)
10. [Configuration](#configuration)
11. [Advanced Features](#advanced-features)
12. [Complete Examples](#complete-examples)

---

## Overview

The Database Testing Framework is a comprehensive, enterprise-grade testing solution built to support multiple database systems with a unified API. It provides BDD-style step definitions powered by a robust underlying architecture that handles connections, transactions, query execution, and result validation.

### Supported Databases
- **SQL Server** (MSSQL)
- **MySQL**
- **PostgreSQL**
- **Oracle**
- **MongoDB**
- **Redis**

### Key Features
- Multi-database support with unified API
- Connection pooling and health monitoring
- Transaction management with savepoints
- Parameterized queries and prepared statements
- Result set export/import (CSV, JSON, XML, Excel)
- BDD-style step definitions for Cucumber
- Comprehensive error handling and reporting
- Query performance monitoring
- Execution plan analysis

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BDD Layer (Cucumber)                      │
│  Connection Steps │ Query Steps │ Transaction Steps │ etc.  │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  Database Context Layer                      │
│         (DatabaseContext, QueryContext)                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   CSDatabase (Facade)                        │
│  ┌──────────────┬──────────────┬────────────────────────┐  │
│  │ Connection   │ Query        │ Transaction  │ Result  │  │
│  │ Manager      │ Executor     │ Manager      │ Parser  │  │
│  └──────────────┴──────────────┴────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              Database Adapter Layer                          │
│  ┌───────────┬─────────┬─────────────┬─────────┬─────────┐ │
│  │ SQL Server│  MySQL  │ PostgreSQL  │ Oracle  │ MongoDB │ │
│  └───────────┴─────────┴─────────────┴─────────┴─────────┘ │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              Native Database Drivers                         │
│     (mssql, mysql2, pg, oracledb, mongodb, redis)           │
└─────────────────────────────────────────────────────────────┘
```

### Design Patterns Used

1. **Adapter Pattern**: Provides a unified interface across different database systems
2. **Facade Pattern**: CSDatabase provides a simplified interface to complex subsystems
3. **Singleton Pattern**: CSDatabaseManager ensures single instance management
4. **Factory Pattern**: Dynamic adapter creation based on database type
5. **Strategy Pattern**: Different query execution strategies per database type
6. **Object Pool Pattern**: Connection pooling for resource efficiency

---

## Core Components

### 1. CSDatabase (Facade Class)

**Location**: `src/database/client/CSDatabase.ts`

The main entry point for all database operations. It orchestrates interactions between connection management, query execution, transactions, and result parsing.

#### Key Responsibilities:
- Database connection lifecycle management
- Query execution coordination
- Transaction management
- Result set processing
- Error handling and reporting

#### Core Methods:

```typescript
class CSDatabase {
  // Connection Management
  async connect(): Promise<DatabaseConnection>
  async disconnect(): Promise<void>
  isConnected(): boolean

  // Query Execution
  async query<T>(sql: string, params?: any[], options?: QueryOptions): Promise<ResultSet>
  async executeWithPlan(sql: string, params?: any[]): Promise<ResultSet>
  async queryByName(queryName: string, params?: any[]): Promise<ResultSet>
  async queryFromFile(filePath: string, params?: any[]): Promise<ResultSet>

  // Stored Procedures & Functions
  async executeStoredProcedure(procedureName: string, params?: any[]): Promise<ResultSet>
  async executeFunction(functionName: string, params?: any[]): Promise<any>

  // Transaction Management
  async beginTransaction(options?: TransactionOptions): Promise<void>
  async commitTransaction(): Promise<void>
  async rollbackTransaction(savepoint?: string): Promise<void>
  async createSavepoint(name: string): Promise<void>

  // Bulk Operations
  async executeBatch(operations: BulkOperation[]): Promise<ResultSet[]>
  async bulkInsert(table: string, data: any[], options?: { batchSize?: number }): Promise<number>

  // Metadata & Info
  async getMetadata(): Promise<DatabaseMetadata>
  async getTableInfo(tableName: string): Promise<TableInfo>
  getPoolStats(): ConnectionStats | null

  // Import/Export
  async exportResult(result: ResultSet, format: string, filePath: string): Promise<void>
  async importData(table: string, filePath: string, format: string): Promise<number>

  // Prepared Statements
  async prepare(sql: string): Promise<PreparedStatement>
}
```

#### Usage Example:

```typescript
// Create and connect to database
const db = await CSDatabase.create({
  type: 'mysql',
  host: '10.255.255.254',
  port: 3306,
  database: 'corporate_db',
  username: 'dbuser',
  password: 'SecurePassword123!',
  poolSize: 10
}, 'PRACTICE_MYSQL');

// Execute query
const result = await db.query('SELECT * FROM employees WHERE department_id = ?', [1]);
console.log(`Found ${result.rowCount} employees`);

// Clean up
await db.disconnect();
```

### 2. CSDatabaseManager (Singleton)

**Location**: `src/database/CSDatabaseManager.ts`

Manages multiple database connections globally across the framework. Provides centralized control for creating, retrieving, and closing connections.

#### Key Responsibilities:
- Maintain registry of all active database connections
- Load configuration from environment variables
- Provide global access to database instances
- Coordinate graceful shutdown

#### Core Methods:

```typescript
class CSDatabaseManager {
  static getInstance(): CSDatabaseManager

  async createConnection(alias: string, config?: DatabaseConfig): Promise<CSDatabase>
  getConnection(alias: string): CSDatabase
  async closeConnection(alias: string): Promise<void>
  async closeAllConnections(): Promise<void>

  // Transaction Shortcuts
  async beginTransaction(alias?: string): Promise<void>
  async rollbackTransaction(alias?: string): Promise<void>
}
```

#### Usage Example:

```typescript
const dbManager = CSDatabaseManager.getInstance();

// Create connection from config (reads DB_PRACTICE_MYSQL_* env variables)
const db = await dbManager.createConnection('PRACTICE_MYSQL');

// Access existing connection
const sameDb = dbManager.getConnection('PRACTICE_MYSQL');

// Close specific connection
await dbManager.closeConnection('PRACTICE_MYSQL');

// Close all connections (e.g., during cleanup)
await dbManager.closeAllConnections();
```

---

## Database Adapters

### Base Adapter Class

**Location**: `src/database/adapters/DatabaseAdapter.ts`

All database-specific adapters inherit from `CSDatabaseAdapter`, which defines the contract that all implementations must follow.

#### Abstract Methods (Must be implemented by each adapter):

```typescript
abstract class CSDatabaseAdapter {
  // Connection
  abstract connect(config: DatabaseConfig): Promise<DatabaseConnection>
  abstract disconnect(connection: DatabaseConnection): Promise<void>
  abstract ping(connection: DatabaseConnection): Promise<void>

  // Query Execution
  abstract query(connection: DatabaseConnection, sql: string, params?: any[], options?: QueryOptions): Promise<QueryResult>
  abstract executeStoredProcedure(connection: DatabaseConnection, procedureName: string, params?: any[]): Promise<QueryResult>
  abstract executeFunction(connection: DatabaseConnection, functionName: string, params?: any[]): Promise<any>

  // Transactions
  abstract beginTransaction(connection: DatabaseConnection, options?: TransactionOptions): Promise<void>
  abstract commitTransaction(connection: DatabaseConnection): Promise<void>
  abstract rollbackTransaction(connection: DatabaseConnection): Promise<void>
  abstract createSavepoint(connection: DatabaseConnection, name: string): Promise<void>
  abstract releaseSavepoint(connection: DatabaseConnection, name: string): Promise<void>
  abstract rollbackToSavepoint(connection: DatabaseConnection, name: string): Promise<void>

  // Prepared Statements
  abstract prepare(connection: DatabaseConnection, sql: string): Promise<PreparedStatement>
  abstract executePrepared(statement: PreparedStatement, params?: any[]): Promise<QueryResult>

  // Metadata
  abstract getMetadata(connection: DatabaseConnection): Promise<DatabaseMetadata>
  abstract getTableInfo(connection: DatabaseConnection, tableName: string): Promise<TableInfo>

  // Bulk Operations
  abstract bulkInsert(connection: DatabaseConnection, table: string, data: any[]): Promise<number>
}
```

#### Common Helper Methods (Provided by base class):

```typescript
// SQL Escaping
escapeIdentifier(identifier: string): string
escapeValue(value: any): string

// Date Formatting
formatDate(date: Date): string

// Transaction Helpers
getIsolationLevelSQL(level?: string): string

// Error Handling
parseConnectionError(error: any): DatabaseError

// Session Management
async setSessionParameter(connection: DatabaseConnection, parameter: string, value: any): Promise<void>
```

### MySQL Adapter

**Location**: `src/database/adapters/MySQLAdapter.ts`

Implements MySQL-specific functionality using the `mysql2/promise` driver.

#### Key Features:
- Connection pooling support
- Prepared statement caching
- Streaming query results
- Transaction isolation levels
- Savepoint support
- Bulk insert optimization

#### MySQL-Specific Implementation Details:

```typescript
class CSMySQLAdapter extends CSDatabaseAdapter {
  private mysql2: any;
  readonly capabilities: DatabaseCapabilities = {
    transactions: true,
    preparedStatements: true,
    storedProcedures: true,
    bulkInsert: true,
    streaming: true,
    savepoints: true,
    schemas: true,
    json: true,
    arrays: false
  };

  async connect(config: DatabaseConfig): Promise<DatabaseConnection> {
    // Load driver dynamically
    this.mysql2 = await import('mysql2/promise');

    // Create connection config
    const connectionConfig = {
      host: config.host,
      port: config.port || 3306,
      database: config.database,
      user: config.username,
      password: config.password,
      connectTimeout: config.connectionTimeout || 30000,
      ssl: config.ssl ? { ...config.sslOptions } : undefined
    };

    // Create pool or single connection
    if (config.poolSize && config.poolSize > 1) {
      return await this.mysql2.createPool({
        ...connectionConfig,
        connectionLimit: config.poolSize,
        waitForConnections: true
      });
    } else {
      return await this.mysql2.createConnection(connectionConfig);
    }
  }

  async query(connection: DatabaseConnection, sql: string, params?: any[], options?: QueryOptions): Promise<QueryResult> {
    // Handle pool vs direct connection
    const conn = connection as any;
    const isPool = conn.getConnection !== undefined;
    const queryConn = isPool ? await conn.getConnection() : conn;

    try {
      // Set timeout if specified
      if (options?.timeout) {
        await queryConn.query(`SET SESSION max_execution_time=${options.timeout}`);
      }

      // Execute query
      const startTime = Date.now();
      const [rows, fields] = await queryConn.execute(sql, params || []);
      const executionTime = Date.now() - startTime;

      // Process result
      if (Array.isArray(rows)) {
        return {
          rows: rows as any[],
          rowCount: rows.length,
          fields: this.parseFields(fields) || [],
          duration: executionTime,
          command: sql.trim().split(' ')[0]?.toUpperCase() || 'UNKNOWN'
        };
      } else {
        return {
          rows: [],
          rowCount: (rows as any).affectedRows || 0,
          fields: [],
          duration: executionTime,
          affectedRows: (rows as any).affectedRows || 0,
          insertId: (rows as any).insertId,
          command: sql.trim().split(' ')[0]?.toUpperCase() || 'UNKNOWN'
        };
      }
    } finally {
      // Release connection back to pool
      if (isPool) {
        queryConn.release();
      }
    }
  }

  override escapeIdentifier(identifier: string): string {
    return `\`${identifier.replace(/`/g, '``')}\``;
  }

  async *stream(connection: DatabaseConnection, sql: string, params?: any[]): AsyncGenerator<any, void, unknown> {
    const conn = connection as any;
    const streamConn = conn.getConnection ? await conn.getConnection() : conn;

    try {
      const stream = streamConn.execute(sql, params || []).stream();
      for await (const row of stream) {
        yield row;
      }
    } finally {
      if (conn.getConnection) {
        streamConn.release();
      }
    }
  }
}
```

#### MySQL-Specific Examples:

**Stored Procedure Execution**:
```typescript
const result = await db.executeStoredProcedure('calculate_employee_bonus', [employeeId, year]);
```

**Bulk Insert with Batching**:
```typescript
const employees = [
  { name: 'John Doe', dept_id: 1, salary: 50000 },
  { name: 'Jane Smith', dept_id: 2, salary: 55000 },
  // ... 1000 more records
];

const inserted = await db.bulkInsert('employees', employees, { batchSize: 500 });
console.log(`Inserted ${inserted} employees`);
```

**Streaming Large Result Sets**:
```typescript
const queryExecutor = new QueryExecutor(adapter);
const connection = await db.getConnection();

for await (const row of queryExecutor.stream(connection, 'SELECT * FROM large_table')) {
  // Process row-by-row without loading entire result into memory
  console.log(row);
}
```

---

## Connection Management

### ConnectionManager

**Location**: `src/database/client/ConnectionManager.ts`

Manages individual database connections with health monitoring, auto-reconnection, and connection pooling.

#### Key Features:
- Automatic health checks every 10 seconds
- Auto-reconnection with exponential backoff
- Connection pool integration
- Health status tracking

#### Architecture:

```
ConnectionManager
  ├── Connection Pool (if poolSize > 1)
  │     ├── Active Connections
  │     ├── Available Connections
  │     └── Waiting Queue
  ├── Health Monitor
  │     ├── Periodic Health Checks
  │     └── Auto-Reconnect Logic
  └── Adapter Integration
```

#### Core Methods:

```typescript
class ConnectionManager {
  async connect(config: DatabaseConfig): Promise<DatabaseConnection>
  async getConnection(): Promise<DatabaseConnection>
  async releaseConnection(connection: DatabaseConnection): Promise<void>
  async disconnect(): Promise<void>
  async checkHealth(): Promise<boolean>
  isHealthy(): boolean
  getPoolStats(): ConnectionStats | null

  // Execute with auto connection management
  async executeWithConnection<T>(operation: (conn: DatabaseConnection) => Promise<T>): Promise<T>
}
```

#### Health Monitoring Implementation:

```typescript
private startHealthMonitoring(): void {
  this.healthCheckInterval = setInterval(async () => {
    const healthy = await this.checkHealth();

    if (!healthy && this.config) {
      CSReporter.warn('Health check failed for database connection');

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        await this.attemptReconnect();
      }
    }
  }, 10000); // Every 10 seconds
}

private async attemptReconnect(): Promise<void> {
  this.reconnectAttempts++;
  CSReporter.info(`Attempting to reconnect (attempt ${this.reconnectAttempts})`);

  try {
    // Close existing connection
    if (this.connection) {
      await this.adapter.disconnect(this.connection);
    }

    // Reconnect
    if (this.pool) {
      await this.pool.reconnect();
      this.connection = await this.pool.acquire();
    } else {
      this.connection = await this.adapter.connect(this.config);
    }

    this.healthy = true;
    this.reconnectAttempts = 0;
    CSReporter.info('Database reconnection successful');
  } catch (error) {
    // Exponential backoff
    const waitTime = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
}
```

### ConnectionPool

**Location**: `src/database/client/ConnectionPool.ts`

Implements connection pooling for efficient resource management, especially under high load.

#### Key Features:
- Dynamic pool sizing (min/max connections)
- Connection validation before use
- Idle connection cleanup
- Waiting queue for connection requests
- Graceful draining

#### Pool Configuration:

```typescript
interface ConnectionPoolConfig {
  min: number;                 // Minimum connections (default: 2)
  max: number;                 // Maximum connections (default: 10)
  acquireTimeout: number;      // Max wait time for connection (default: 30000ms)
  idleTimeout: number;         // Idle connection timeout (default: 10000ms)
  connectionTimeout: number;   // Connection creation timeout (default: 30000ms)
  validateOnBorrow: boolean;   // Validate before returning (default: true)
  testOnBorrow: boolean;       // Test connection health (default: true)
}
```

#### Pool Lifecycle:

```typescript
class ConnectionPool {
  async initialize(): Promise<void> {
    // Create minimum number of connections
    for (let i = 0; i < this.poolConfig.min; i++) {
      await this.createConnection();
    }

    // Start idle connection cleanup
    this.startIdleConnectionCleanup();
  }

  async acquire(): Promise<DatabaseConnection> {
    // 1. Try to get available connection
    let connection = await this.getAvailableConnection();
    if (connection) return connection;

    // 2. Try to create new connection if under max
    if (this.connections.length < this.poolConfig.max) {
      await this.createConnection();
      connection = await this.getAvailableConnection();
      if (connection) return connection;
    }

    // 3. Wait for connection to become available
    return this.waitForConnection();
  }

  async release(connection: DatabaseConnection): Promise<void> {
    // Validate connection before releasing back to pool
    if (this.poolConfig.validateOnBorrow) {
      const isValid = await this.validateConnection(connection);
      if (!isValid) {
        await this.replaceConnection(connection);
        return;
      }
    }

    // Return to available pool
    this.availableConnections.push(connection);
    this.activeCount--;

    // Process any waiting requests
    this.processWaitingQueue();
  }

  getStats(): ConnectionStats {
    return {
      total: this.connections.length,
      active: this.activeCount,
      idle: this.availableConnections.length,
      waiting: this.waitingQueue.length,
      min: this.poolConfig.min,
      max: this.poolConfig.max
    };
  }
}
```

#### Pool Usage Example:

```typescript
// Create database with pooling
const db = await CSDatabase.create({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  database: 'mydb',
  username: 'user',
  password: 'pass',
  poolSize: 10,           // Enable pooling with max 10 connections
  poolMin: 2,             // Keep at least 2 connections alive
  poolAcquireTimeout: 5000,
  poolIdleTimeout: 60000
}, 'my_db');

// Check pool stats
const stats = db.getPoolStats();
console.log(`Pool: ${stats.active} active, ${stats.idle} idle, ${stats.waiting} waiting`);

// All queries automatically use pool
const result1 = await db.query('SELECT * FROM table1'); // Uses connection from pool
const result2 = await db.query('SELECT * FROM table2'); // Reuses or gets another connection
```

---

## Query Execution

### QueryExecutor

**Location**: `src/database/client/QueryExecutor.ts`

Handles all query execution with timeout management, retry logic, and performance monitoring.

#### Key Features:
- Query timeout enforcement
- Automatic retry on transient errors
- Slow query detection and logging
- Batch query execution
- Streaming support
- Scalar value extraction

#### Core Methods:

```typescript
class QueryExecutor {
  async execute(connection: DatabaseConnection, sql: string, params?: any[], options?: QueryOptions): Promise<QueryResult>
  async executeStoredProcedure(connection: DatabaseConnection, procedureName: string, params?: any[]): Promise<QueryResult>
  async executeFunction(connection: DatabaseConnection, functionName: string, params?: any[]): Promise<any>
  async executeBatch(connection: DatabaseConnection, queries: Array<{ sql: string; params?: any[] }>): Promise<QueryResult[]>

  // Streaming
  async *stream(connection: DatabaseConnection, sql: string, params?: any[]): AsyncGenerator<any, void, unknown>

  // Convenience Methods
  async scalar<T>(connection: DatabaseConnection, sql: string, params?: any[]): Promise<T | null>
  async single<T>(connection: DatabaseConnection, sql: string, params?: any[]): Promise<T | null>
  async column<T>(connection: DatabaseConnection, sql: string, params?: any[], columnIndex?: number): Promise<T[]>
}
```

#### Query Timeout Implementation:

```typescript
private async executeQuery(connection: DatabaseConnection, sql: string, params?: any[], options?: QueryOptions): Promise<QueryResult> {
  const timeout = options?.timeout || this.defaultTimeout;

  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Query timeout after ${timeout}ms`));
    }, timeout);
  });

  try {
    // Race between query and timeout
    return await Promise.race([
      this.adapter.query(connection, sql, params, options),
      timeoutPromise
    ]);
  } catch (error) {
    // Try to cancel query if timeout
    if ((error as Error).message.includes('timeout')) {
      if (this.adapter.cancelQuery) {
        await this.adapter.cancelQuery(connection);
      }
    }
    throw error;
  }
}
```

#### Retry Logic:

```typescript
private async executeWithRetry<T>(operation: () => Promise<T>, options: QueryOptions): Promise<T> {
  const maxRetries = options.retry?.count || this.defaultRetryCount;
  const retryDelay = options.retry?.delay || this.defaultRetryDelay;
  const retryableErrors = options.retry?.retryableErrors || [
    'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'EPIPE'
  ];

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      const isRetryable = retryableErrors.some(code =>
        lastError.message.includes(code) || (lastError as any).code === code
      );

      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }

      CSReporter.warn(`Query failed (attempt ${attempt + 1}/${maxRetries + 1}): ${lastError.message}`);

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
    }
  }

  throw lastError!;
}
```

#### Usage Examples:

**Basic Query Execution**:
```typescript
const executor = new QueryExecutor(adapter);
const connection = await db.getConnection();

const result = await executor.execute(
  connection,
  'SELECT * FROM employees WHERE department_id = ?',
  [1]
);
```

**Query with Timeout and Retry**:
```typescript
const result = await executor.execute(
  connection,
  'SELECT * FROM large_table',
  [],
  {
    timeout: 60000,  // 60 seconds
    retry: {
      count: 3,
      delay: 1000,
      retryableErrors: ['ETIMEDOUT', 'ECONNRESET']
    }
  }
);
```

**Scalar Value Extraction**:
```typescript
// Get single value
const count = await executor.scalar<number>(
  connection,
  'SELECT COUNT(*) FROM employees'
);
console.log(`Total employees: ${count}`);
```

**Single Row Retrieval**:
```typescript
const employee = await executor.single<Employee>(
  connection,
  'SELECT * FROM employees WHERE id = ?',
  [123]
);
```

**Column Values**:
```typescript
const names = await executor.column<string>(
  connection,
  'SELECT first_name FROM employees',
  [],
  0  // Column index
);
console.log(names); // ['John', 'Jane', 'Bob', ...]
```

---

## Transaction Management

### TransactionManager

**Location**: `src/database/client/TransactionManager.ts`

Manages database transactions with support for nested transactions via savepoints.

#### Key Features:
- Nested transaction support
- Savepoint management
- Transaction isolation levels
- Automatic rollback on errors
- Transaction statistics and monitoring

#### Transaction Stack Architecture:

```
Transaction Stack (per connection)
┌────────────────────────────────────┐
│ Level 3: Savepoint sp_003         │
│ Level 2: Savepoint sp_002         │
│ Level 1: Database Transaction     │
└────────────────────────────────────┘
```

#### Core Methods:

```typescript
class TransactionManager {
  async begin(connection: DatabaseConnection, options?: TransactionOptions): Promise<void>
  async commit(connection: DatabaseConnection): Promise<void>
  async rollback(connection: DatabaseConnection, savepoint?: string): Promise<void>
  async savepoint(connection: DatabaseConnection, name: string): Promise<void>

  isInTransaction(connection: DatabaseConnection): boolean
  getTransactionLevel(connection: DatabaseConnection): number
  getActiveTransactions(): Map<DatabaseConnection, TransactionState[]>

  async executeInTransaction<T>(connection: DatabaseConnection, operation: () => Promise<T>, options?: TransactionOptions): Promise<T>

  getTransactionStats(): {
    activeTransactions: number;
    totalSavepoints: number;
    longestTransaction: number | null;
  }
}
```

#### Nested Transaction Implementation:

```typescript
async begin(connection: DatabaseConnection, options?: TransactionOptions): Promise<void> {
  let stack = this.transactionStack.get(connection);
  if (!stack) {
    stack = [];
    this.transactionStack.set(connection, stack);
  }

  if (stack.length > 0) {
    // Nested transaction - use savepoint
    const savepointName = this.generateSavepointName();
    await this.savepoint(connection, savepointName);

    stack.push({
      level: stack.length + 1,
      savepoint: savepointName,
      startTime: Date.now()
    });
  } else {
    // First transaction - start database transaction
    await this.adapter.beginTransaction(connection, options);

    stack.push({
      level: 1,
      startTime: Date.now(),
      isolationLevel: options?.isolationLevel
    });
  }

  CSReporter.info(`Transaction started at level ${stack.length}`);
}

async commit(connection: DatabaseConnection): Promise<void> {
  const stack = this.transactionStack.get(connection);
  if (!stack || stack.length === 0) {
    throw new Error('No active transaction to commit');
  }

  const current = stack.pop()!;
  const duration = Date.now() - current.startTime;

  if (stack.length === 0) {
    // Last transaction - commit to database
    await this.adapter.commitTransaction(connection);
    this.transactionStack.delete(connection);
    CSReporter.info(`Transaction committed (duration: ${duration}ms)`);
  } else {
    // Nested transaction - release savepoint
    if (current.savepoint) {
      await this.releaseSavepoint(connection, current.savepoint);
    }
    CSReporter.info(`Savepoint released: ${current.savepoint} (duration: ${duration}ms)`);
  }
}

async rollback(connection: DatabaseConnection, savepoint?: string): Promise<void> {
  const stack = this.transactionStack.get(connection);
  if (!stack || stack.length === 0) {
    throw new Error('No active transaction to rollback');
  }

  if (savepoint) {
    // Rollback to specific savepoint
    await this.rollbackToSavepoint(connection, savepoint);
    const index = stack.findIndex(state => state.savepoint === savepoint);
    if (index !== -1) {
      stack.splice(index);
    }
  } else {
    // Rollback current level
    const current = stack[stack.length - 1];

    if (stack.length === 1) {
      // Rollback entire transaction
      await this.adapter.rollbackTransaction(connection);
      this.transactionStack.delete(connection);
      CSReporter.info(`Transaction rolled back`);
    } else {
      // Rollback to previous savepoint
      stack.pop();
      const previous = stack[stack.length - 1];
      if (previous?.savepoint) {
        await this.rollbackToSavepoint(connection, previous.savepoint);
      }
    }
  }
}
```

#### Usage Examples:

**Simple Transaction**:
```typescript
const db = await CSDatabase.getInstance('PRACTICE_MYSQL');

await db.beginTransaction();
try {
  await db.query('UPDATE accounts SET balance = balance - 100 WHERE id = 1');
  await db.query('UPDATE accounts SET balance = balance + 100 WHERE id = 2');
  await db.commitTransaction();
  console.log('Transfer completed');
} catch (error) {
  await db.rollbackTransaction();
  console.error('Transfer failed, rolled back');
}
```

**Nested Transactions with Savepoints**:
```typescript
await db.beginTransaction({ isolationLevel: 'SERIALIZABLE' });
try {
  // Level 1
  await db.query('INSERT INTO orders (customer_id, total) VALUES (?, ?)', [1, 100]);

  await db.beginTransaction(); // Creates savepoint
  try {
    // Level 2
    await db.query('INSERT INTO order_items (order_id, product_id) VALUES (?, ?)', [1, 10]);
    await db.query('INSERT INTO order_items (order_id, product_id) VALUES (?, ?)', [1, 20]);
    await db.commitTransaction(); // Releases savepoint
  } catch (error) {
    await db.rollbackTransaction(); // Rolls back to savepoint
    throw error;
  }

  await db.commitTransaction(); // Commits database transaction
} catch (error) {
  await db.rollbackTransaction(); // Rolls back entire transaction
}
```

**Using executeInTransaction Helper**:
```typescript
const result = await transactionManager.executeInTransaction(
  connection,
  async () => {
    const orderId = await db.query('INSERT INTO orders ...');
    await db.query('INSERT INTO order_items ...');
    await db.query('UPDATE inventory ...');
    return orderId;
  },
  { isolationLevel: 'REPEATABLE READ' }
);
```

#### Transaction Isolation Levels:

```typescript
interface TransactionOptions {
  isolationLevel?: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE' | 'SNAPSHOT';
  timeout?: number;
  retryOnDeadlock?: boolean;
  maxRetries?: number;
}
```

**Isolation Level Characteristics**:

| Level | Dirty Read | Non-Repeatable Read | Phantom Read |
|-------|------------|---------------------|--------------|
| READ UNCOMMITTED | Yes | Yes | Yes |
| READ COMMITTED | No | Yes | Yes |
| REPEATABLE READ | No | No | Yes |
| SERIALIZABLE | No | No | No |

**Example with Isolation Level**:
```typescript
await db.beginTransaction({
  isolationLevel: 'SERIALIZABLE',
  timeout: 30000
});
```

---

## Result Set Handling

### ResultSetParser

**Location**: `src/database/client/ResultSetParser.ts`

Processes query results and provides import/export capabilities.

#### Key Features:
- Result set transformation
- Pagination support
- Export to multiple formats (CSV, JSON, XML, Excel, Text)
- Import from multiple formats
- Data type inference
- Column mapping

#### Core Methods:

```typescript
class ResultSetParser {
  parse<T>(rawResult: QueryResult, options?: QueryOptions): ResultSet

  // Export Methods
  async export(resultSet: ResultSet, format: 'csv' | 'json' | 'xml' | 'excel' | 'text', filePath: string): Promise<void>

  // Import Methods
  async import(filePath: string, format: 'csv' | 'json' | 'xml' | 'excel', options?: any): Promise<any[]>

  // Transformation Methods
  toObjects<T>(resultSet: ResultSet): T[]
  toArray(resultSet: ResultSet, includeHeaders?: boolean): any[][]
  toMap<K, V>(resultSet: ResultSet, keyColumn: string, valueColumn?: string): Map<K, V>
  groupBy<T>(resultSet: ResultSet, column: string): Map<any, T[]>
}
```

#### Result Transformation:

```typescript
parse<T>(rawResult: QueryResult, options?: QueryOptions): ResultSet {
  // Extract rows
  const rows = this.extractRows<T>(rawResult);

  // Extract metadata
  const columns = this.extractColumns(rawResult);
  const metadata = this.extractMetadata(rawResult);
  const rowCount = this.extractRowCount(rawResult, rows);

  // Apply transformations if specified
  const transformedRows = options?.transform
    ? this.applyTransformations(rows, options.transform)
    : rows;

  // Apply pagination if specified
  const paginatedRows = options?.pagination
    ? this.applyPagination(transformedRows, options.pagination)
    : transformedRows;

  return {
    rows: paginatedRows,
    fields: rawResult.fields || [],
    rowCount,
    metadata,
    columns,
    executionTime: rawResult.duration,
    affectedRows: rawResult.affectedRows
  };
}
```

#### Export Implementations:

**CSV Export**:
```typescript
private async exportToCSV(resultSet: ResultSet, filePath: string): Promise<void> {
  const csv: string[] = [];
  const columns = resultSet.columns || [];

  // Write headers
  if (columns.length > 0) {
    csv.push(columns.map(col => this.escapeCSV(col.name)).join(','));
  }

  // Write rows
  resultSet.rows.forEach(row => {
    const values = columns.map(col => {
      const value = row[col.name];
      return this.escapeCSV(this.formatValue(value));
    });
    csv.push(values.join(','));
  });

  await fs.writeFile(filePath, csv.join('\n'), 'utf8');
}
```

**Excel Export**:
```typescript
private async exportToExcel(resultSet: ResultSet, filePath: string): Promise<void> {
  const workbook = XLSX.utils.book_new();

  // Convert result set to 2D array
  const data = this.toArray(resultSet, true);
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Auto-size columns
  const columns = resultSet.columns || [];
  worksheet['!cols'] = columns.map((col, index) => {
    let maxWidth = col.name.length;
    resultSet.rows.forEach(row => {
      const value = String(row[col.name] || '');
      maxWidth = Math.max(maxWidth, value.length);
    });
    return { wch: Math.min(maxWidth + 2, 50) };
  });

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Query Result');

  // Add metadata sheet
  const metadataSheet = XLSX.utils.aoa_to_sheet([
    ['Property', 'Value'],
    ['Row Count', resultSet.rowCount],
    ['Execution Time (ms)', resultSet.executionTime || 0],
    ['Exported At', new Date().toISOString()]
  ]);
  XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata');

  XLSX.writeFile(workbook, filePath);
}
```

#### Usage Examples:

**Export to CSV**:
```typescript
const result = await db.query('SELECT * FROM employees');
await db.exportResult(result, 'csv', 'reports/employees.csv');
```

**Export to Excel with Multiple Sheets**:
```typescript
const result = await db.query('SELECT * FROM sales_2024');
await db.exportResult(result, 'excel', 'reports/sales_report.xlsx');
// Creates Excel file with:
// - Sheet 1: Query Result (data)
// - Sheet 2: Metadata (stats)
```

**Import and Bulk Insert**:
```typescript
const inserted = await db.importData(
  'employees',
  'data/new_employees.csv',
  'csv',
  { batchSize: 1000 }
);
console.log(`Imported ${inserted} employees`);
```

**Transform Result Set**:
```typescript
const result = await db.query('SELECT * FROM products', [], {
  transform: {
    price: (value) => parseFloat(value).toFixed(2),
    created_at: (value) => new Date(value).toLocaleDateString()
  }
});
```

**Pagination**:
```typescript
const result = await db.query('SELECT * FROM orders', [], {
  pagination: {
    page: 2,
    pageSize: 50
  }
});
// Returns rows 51-100
```

**Group By**:
```typescript
const parser = new ResultSetParser(adapter);
const result = await db.query('SELECT * FROM sales');
const groupedByRegion = parser.groupBy(result, 'region');

groupedByRegion.forEach((sales, region) => {
  console.log(`${region}: ${sales.length} sales`);
});
```

---

## BDD Step Definitions

The framework provides comprehensive BDD step definitions for Cucumber/Gherkin feature files.

### Connection Steps

**Location**: `src/steps/database/ConnectionSteps.ts`

#### Available Steps:

```gherkin
# Connect to named database (from config)
When user connects to "PRACTICE_MYSQL" database

# Connect with connection string
When user connects with connection string "mysql://user:pass@host:3306/dbname"

# Connect with detailed options
When user connects to database with options:
  | option   | value         |
  | type     | mysql         |
  | host     | localhost     |
  | port     | 3306          |
  | database | corporate_db  |
  | username | dbuser        |
  | password | SecurePass123!|

# Disconnect
When user disconnects from "PRACTICE_MYSQL" database

# Validate connection
Then user validates database connection

# Log statistics
When user logs database statistics
```

#### Implementation Example:

```typescript
@CSBDDStepDef('user connects to {string} database')
async connectToNamedDatabase(databaseAlias: string): Promise<void> {
  CSReporter.info(`Connecting to named database: ${databaseAlias}`);

  try {
    const database = await this.databaseManager.createConnection(databaseAlias);
    this.databases.set(databaseAlias, database);
    this.currentDatabaseAlias = databaseAlias;

    const connection = await database.getConnection();
    const adapter = database.getAdapter();
    this.databaseContext.setActiveConnection(databaseAlias, adapter, connection);

    CSReporter.info(`Connected to database: ${databaseAlias}`);
  } catch (error) {
    CSReporter.error(`Failed to connect: ${error.message}`);
    throw error;
  }
}
```

### Query Execution Steps

**Location**: `src/steps/database/QueryExecutionSteps.ts`

#### Available Steps:

```gherkin
# Execute simple query
When user executes query "SELECT * FROM employees"

# Execute multiline query
When user executes query:
  """
  SELECT e.first_name, e.last_name, d.department_name
  FROM employees e
  INNER JOIN departments d ON e.department_id = d.department_id
  WHERE d.location = 'Hyderabad'
  """

# Execute parameterized query
When user executes parameterized query "SELECT * FROM employees WHERE department_id = ?" with parameters:
  | name          | value |
  | department_id | 1     |

# Execute scalar query
When user executes scalar query "SELECT COUNT(*) FROM employees"

# Execute query within transaction
When user executes query "UPDATE accounts SET balance = 100 WHERE id = 1" within transaction

# Execute from file
When user executes query from file "queries/get_employees.sql"

# Execute predefined query
When user executes predefined query "GET_ALL_ACTIVE_USERS"

# Execute batch queries
When user executes batch queries:
  """
  INSERT INTO logs (message) VALUES ('Log 1');
  INSERT INTO logs (message) VALUES ('Log 2');
  INSERT INTO logs (message) VALUES ('Log 3');
  """

# Execute with timeout
When user executes query "SELECT * FROM large_table" with timeout 60 seconds

# Execute with plan analysis
When user executes query with plan:
  """
  SELECT * FROM employees WHERE salary > 50000
  """
```

### Transaction Steps

**Location**: `src/steps/database/TransactionSteps.ts`

#### Available Steps:

```gherkin
# Begin transaction
When user begins database transaction

# Begin with isolation level
When user begins database transaction with isolation level "SERIALIZABLE"

# Commit transaction
When user commits database transaction

# Rollback transaction
When user rolls back database transaction

# Create savepoint
When user creates savepoint "before_insert"

# Rollback to savepoint
When user rolls back to savepoint "before_insert"

# Validate transaction state
Then database should have active transaction
Then database should not have active transaction
```

### Data Validation Steps

**Location**: `src/steps/database/DataValidationSteps.ts`

#### Available Steps:

```gherkin
# Row count validation
Then the query result should have 10 rows
Then the query result should not be empty
Then the query result should be empty

# Value validation
And the value in row 1 column "name" should be "John Doe"
And the value in row 1 column "salary" should be 50000.00
And the value in row 1 column "is_active" should be null

# Column validation
And column "email" should contain value "john@example.com"
And column "email" should not contain value "invalid@email"
And all values in column "id" should be unique

# Data type validation
And column "age" should have datatype "integer"
And column "salary" should have datatype "number"

# Statistical validation
And the sum of column "salary" should be 250000.00
And the average of column "age" should be 35.5
And the minimum of column "age" should be 22
And the maximum of column "age" should be 65

# Pattern validation
And column "email" should match pattern "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"

# NULL validation
And column "middle_name" should contain null values
And column "id" should not contain null values
```

### Stored Procedure Steps

**Location**: `src/steps/database/StoredProcedureSteps.ts`

#### Available Steps:

```gherkin
# Execute stored procedure
When user executes stored procedure "calculate_bonus" with parameters:
  | name        | value |
  | employee_id | 123   |
  | year        | 2024  |

# Execute function
When user executes database function "get_employee_salary" with parameters:
  | name        | value |
  | employee_id | 123   |

# Validate output parameters
Then output parameter "total_bonus" should be 5000
```

### Database Utility Steps

**Location**: `src/steps/database/DatabaseUtilitySteps.ts`

#### Available Steps:

```gherkin
# Export results
When user exports query result to "reports/employees.csv"
When user exports query result to "reports/employees.json"
When user exports query result to "reports/employees.xlsx"

# Table operations
When user truncates table "temp_data"
When user drops table "old_table"

# Metadata queries
When user gets table metadata for "employees"
When user gets database version

# Logging
When user logs query execution plan
When user logs database statistics
```

---

## Configuration

### Environment Variable Format

Database connections are configured via environment variables using the pattern:

```
DB_{ALIAS}_{PROPERTY}={VALUE}
```

### Example Configuration

```bash
# MySQL Configuration
DB_PRACTICE_MYSQL_TYPE=mysql
DB_PRACTICE_MYSQL_HOST=10.255.255.254
DB_PRACTICE_MYSQL_PORT=3306
DB_PRACTICE_MYSQL_USERNAME=dbuser
DB_PRACTICE_MYSQL_PASSWORD=SecurePassword123!
DB_PRACTICE_MYSQL_DATABASE=corporate_db
DB_PRACTICE_MYSQL_CONNECTION_TIMEOUT=60000
DB_PRACTICE_MYSQL_REQUEST_TIMEOUT=15000
DB_PRACTICE_MYSQL_POOL_MAX=10
DB_PRACTICE_MYSQL_POOL_MIN=2
DB_PRACTICE_MYSQL_POOL_IDLE_TIMEOUT=30000

# PostgreSQL Configuration
DB_PRACTICE_POSTGRES_TYPE=postgresql
DB_PRACTICE_POSTGRES_HOST=localhost
DB_PRACTICE_POSTGRES_PORT=5432
DB_PRACTICE_POSTGRES_USERNAME=pguser
DB_PRACTICE_POSTGRES_PASSWORD=pgpass
DB_PRACTICE_POSTGRES_DATABASE=testdb

# Active Connections (comma-separated)
DATABASE_CONNECTIONS=PRACTICE_MYSQL,PRACTICE_POSTGRES

# Predefined Queries
DB_QUERY_GET_ALL_USERS=SELECT * FROM users WHERE active = 1
DB_QUERY_GET_ORDERS_BY_STATUS=SELECT * FROM orders WHERE status = ?
```

### Connection Configuration Properties

| Property | Description | Default | Required |
|----------|-------------|---------|----------|
| TYPE | Database type (mysql, postgresql, sqlserver, oracle, mongodb, redis) | sqlserver | Yes |
| HOST | Database server hostname/IP | - | Yes |
| PORT | Database server port | Type-specific | No |
| DATABASE | Database/schema name | - | Yes |
| USERNAME | Database username | - | Yes |
| PASSWORD | Database password | - | Yes |
| CONNECTION_TIMEOUT | Connection timeout (ms) | 30000 | No |
| REQUEST_TIMEOUT | Query timeout (ms) | 30000 | No |
| POOL_MAX | Maximum pool connections | 10 | No |
| POOL_MIN | Minimum pool connections | 2 | No |
| POOL_IDLE_TIMEOUT | Idle connection timeout (ms) | 30000 | No |
| SSL | Enable SSL | false | No |

---

## Advanced Features

### 1. Prepared Statements

Prepared statements improve performance and security for repeated queries.

```typescript
// Prepare statement
const stmt = await db.prepare('SELECT * FROM employees WHERE department_id = ? AND salary > ?');

// Execute multiple times
const result1 = await stmt.execute([1, 50000]);
const result2 = await stmt.execute([2, 60000]);
const result3 = await stmt.execute([3, 70000]);

// Close statement
await stmt.close();
```

### 2. Execution Plan Analysis

Analyze query performance with execution plans.

```typescript
const result = await db.executeWithPlan(`
  SELECT e.*, d.department_name
  FROM employees e
  INNER JOIN departments d ON e.department_id = d.department_id
  WHERE e.salary > 50000
`);

console.log('Execution Plan:');
console.log(result.metadata.executionPlan);
```

### 3. Query Streaming

Process large result sets without loading everything into memory.

```typescript
const connection = await db.getConnection();
const executor = new QueryExecutor(adapter);

let count = 0;
for await (const row of executor.stream(connection, 'SELECT * FROM huge_table')) {
  // Process one row at a time
  processRow(row);
  count++;
}
console.log(`Processed ${count} rows`);
```

### 4. Bulk Operations

Efficiently insert large datasets.

```typescript
const data = [];
for (let i = 0; i < 10000; i++) {
  data.push({
    name: `Employee ${i}`,
    department_id: Math.floor(Math.random() * 10) + 1,
    salary: 30000 + Math.random() * 70000
  });
}

const inserted = await db.bulkInsert('employees', data, {
  batchSize: 1000 // Insert 1000 at a time
});

console.log(`Bulk inserted ${inserted} records`);
```

### 5. Database Metadata

Retrieve database and table metadata.

```typescript
// Get database metadata
const metadata = await db.getMetadata();
console.log(`Database: ${metadata.databaseName}`);
console.log(`Version: ${metadata.version}`);
console.log(`Capabilities:`, metadata.capabilities);

// Get table info
const tableInfo = await db.getTableInfo('employees');
console.log(`Table: ${tableInfo.name}`);
console.log(`Columns: ${tableInfo.columns.length}`);
console.log(`Row Count: ${tableInfo.rowCount}`);
console.log(`Indexes:`, tableInfo.indexes);
```

### 6. Connection Health Monitoring

Monitor connection health and statistics.

```typescript
const db = await CSDatabase.getInstance('PRACTICE_MYSQL');

// Check if connected and healthy
if (db.isConnected()) {
  console.log('Database is connected and healthy');

  // Get pool statistics
  const stats = db.getPoolStats();
  if (stats) {
    console.log(`Active: ${stats.active}/${stats.max}`);
    console.log(`Idle: ${stats.idle}`);
    console.log(`Waiting: ${stats.waiting}`);
  }
}
```

---

## Complete Examples

### Example 1: Complete Employee Management Test

```gherkin
Feature: Employee Database Management
  Comprehensive testing of employee database operations

  Background:
    Given test execution starts for database testing

  Scenario: Connect and Validate Employee Database
    When user connects to "PRACTICE_MYSQL" database
    Then user validates database connection
    When user logs database statistics

  Scenario: Query Employee Data with Joins
    When user connects to "PRACTICE_MYSQL" database
    When user executes query:
      """
      SELECT
        e.first_name,
        e.last_name,
        e.job_title,
        e.salary,
        d.department_name,
        d.location
      FROM employees e
      INNER JOIN departments d ON e.department_id = d.department_id
      WHERE d.department_name = 'Engineering'
      ORDER BY e.salary DESC
      LIMIT 10
      """
    Then the query result should have 10 rows
    And the value in row 1 column "department_name" should be "Engineering"
    And all values in column "salary" should be unique
    When user exports query result to "reports/top_engineers.csv"
    When user disconnects from "PRACTICE_MYSQL" database

  Scenario: Transaction-Based Salary Update
    When user connects to "PRACTICE_MYSQL" database
    When user begins database transaction

    # Update salaries
    When user executes query "UPDATE employees SET salary = salary * 1.10 WHERE department_id = 1" within transaction

    # Verify update
    When user executes query "SELECT COUNT(*) as updated_count FROM employees WHERE department_id = 1" within transaction
    Then the value in row 1 column "updated_count" should be 15

    # Commit changes
    When user commits database transaction

    When user disconnects from "PRACTICE_MYSQL" database

  Scenario: Complex Reporting with Export
    When user connects to "PRACTICE_MYSQL" database
    When user executes query:
      """
      SELECT
        d.department_name,
        COUNT(e.employee_id) as employee_count,
        AVG(e.salary) as avg_salary,
        MAX(e.salary) as max_salary,
        MIN(e.salary) as min_salary
      FROM departments d
      LEFT JOIN employees e ON d.department_id = e.department_id
      GROUP BY d.department_id, d.department_name
      ORDER BY avg_salary DESC
      """
    Then the query result should not be empty
    When user exports query result to "reports/department_summary.xlsx"
    When user disconnects from "PRACTICE_MYSQL" database
```

### Example 2: TypeScript Programmatic Usage

```typescript
import { CSDatabase } from './database/client/CSDatabase';
import { CSDatabaseManager } from './database/CSDatabaseManager';

async function employeeManagementExample() {
  const dbManager = CSDatabaseManager.getInstance();

  // Create connection
  const db = await dbManager.createConnection('PRACTICE_MYSQL');

  try {
    // Query employees
    const employees = await db.query(`
      SELECT e.*, d.department_name
      FROM employees e
      INNER JOIN departments d ON e.department_id = d.department_id
      WHERE e.salary > ?
      ORDER BY e.salary DESC
      LIMIT 10
    `, [50000]);

    console.log(`Found ${employees.rowCount} high-earning employees`);

    // Export to Excel
    await db.exportResult(employees, 'excel', 'reports/high_earners.xlsx');

    // Perform transaction
    await db.beginTransaction({ isolationLevel: 'SERIALIZABLE' });

    try {
      // Promote employee
      await db.query(`
        UPDATE employees
        SET job_title = 'Senior Engineer', salary = salary * 1.15
        WHERE employee_id = ?
      `, [123]);

      // Log promotion
      await db.query(`
        INSERT INTO promotion_history (employee_id, old_title, new_title, promotion_date)
        VALUES (?, 'Engineer', 'Senior Engineer', NOW())
      `, [123]);

      await db.commitTransaction();
      console.log('Promotion completed successfully');

    } catch (error) {
      await db.rollbackTransaction();
      console.error('Promotion failed, rolled back');
      throw error;
    }

    // Get database statistics
    const poolStats = db.getPoolStats();
    if (poolStats) {
      console.log(`Pool: ${poolStats.active} active, ${poolStats.idle} idle`);
    }

  } finally {
    // Clean up
    await dbManager.closeConnection('PRACTICE_MYSQL');
  }
}

// Run example
employeeManagementExample().catch(console.error);
```

### Example 3: Bulk Data Import and Processing

```typescript
import { CSDatabase } from './database/client/CSDatabase';
import * as fs from 'fs/promises';

async function bulkDataImportExample() {
  const db = await CSDatabase.create({
    type: 'mysql',
    host: '10.255.255.254',
    port: 3306,
    database: 'corporate_db',
    username: 'dbuser',
    password: 'SecurePassword123!',
    poolSize: 10
  }, 'PRACTICE_MYSQL');

  try {
    // Import from CSV
    console.log('Importing employees from CSV...');
    const importedCount = await db.importData(
      'temp_employees',
      'data/new_hires.csv',
      'csv',
      { batchSize: 500 }
    );
    console.log(`Imported ${importedCount} new employees`);

    // Process and validate
    await db.beginTransaction();

    try {
      // Move valid records
      await db.query(`
        INSERT INTO employees (first_name, last_name, email, department_id, salary)
        SELECT first_name, last_name, email, department_id, salary
        FROM temp_employees
        WHERE email IS NOT NULL
        AND department_id IN (SELECT department_id FROM departments)
      `);

      // Clean up temp table
      await db.query('TRUNCATE TABLE temp_employees');

      await db.commitTransaction();
      console.log('Import processing completed');

    } catch (error) {
      await db.rollbackTransaction();
      console.error('Import processing failed');
      throw error;
    }

    // Generate report
    const report = await db.query(`
      SELECT
        d.department_name,
        COUNT(*) as new_hires,
        AVG(e.salary) as avg_starting_salary
      FROM employees e
      INNER JOIN departments d ON e.department_id = d.department_id
      WHERE e.hire_date >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
      GROUP BY d.department_id, d.department_name
    `);

    await db.exportResult(report, 'excel', 'reports/new_hire_summary.xlsx');

  } finally {
    await db.disconnect();
  }
}

bulkDataImportExample().catch(console.error);
```

---

## Best Practices

### 1. Connection Management

```typescript
// ✅ GOOD: Use connection manager
const dbManager = CSDatabaseManager.getInstance();
const db = await dbManager.createConnection('PRACTICE_MYSQL');
// ... use db
await dbManager.closeConnection('PRACTICE_MYSQL');

// ❌ BAD: Create connections without cleanup
const db = await CSDatabase.create(config, 'alias');
// ... forget to disconnect
```

### 2. Transaction Handling

```typescript
// ✅ GOOD: Always use try-catch with transactions
await db.beginTransaction();
try {
  await db.query('...');
  await db.query('...');
  await db.commitTransaction();
} catch (error) {
  await db.rollbackTransaction();
  throw error;
}

// ❌ BAD: No error handling
await db.beginTransaction();
await db.query('...');
await db.commitTransaction(); // Will fail if query fails
```

### 3. Parameterized Queries

```typescript
// ✅ GOOD: Use parameterized queries
await db.query('SELECT * FROM users WHERE id = ?', [userId]);

// ❌ BAD: String concatenation (SQL injection risk)
await db.query(`SELECT * FROM users WHERE id = ${userId}`);
```

### 4. Resource Cleanup

```typescript
// ✅ GOOD: Always clean up resources
const stmt = await db.prepare('SELECT * FROM table WHERE id = ?');
try {
  const result = await stmt.execute([123]);
  return result;
} finally {
  await stmt.close();
}

// ❌ BAD: Forget to close prepared statements
const stmt = await db.prepare('...');
await stmt.execute([123]);
// Statement never closed
```

### 5. Pool Configuration

```typescript
// ✅ GOOD: Appropriate pool size for load
poolMin: 2,     // Keep 2 connections ready
poolMax: 10,    // Scale up to 10 under load
poolIdleTimeout: 60000  // Close idle after 1 min

// ❌ BAD: Excessive pool size
poolMin: 50,    // Wastes resources
poolMax: 100    // May exhaust database connections
```

---

## Troubleshooting

### Common Issues

#### 1. Connection Refused

**Symptom**: `ECONNREFUSED` error

**Causes**:
- Database server not running
- Wrong host/port
- Firewall blocking connection

**Solutions**:
```bash
# Check if MySQL is running (Windows)
net start MySQL80

# Test connection from WSL
telnet 10.255.255.254 3306

# Check firewall rule
netsh advfirewall firewall show rule name="MySQL for WSL"
```

#### 2. Timeout Errors

**Symptom**: Query timeout after X ms

**Solutions**:
```typescript
// Increase timeout
await db.query(sql, params, { timeout: 120000 }); // 2 minutes

// Enable retry
await db.query(sql, params, {
  timeout: 60000,
  retry: {
    count: 3,
    delay: 2000
  }
});
```

#### 3. Pool Exhaustion

**Symptom**: `Timeout acquiring connection`

**Solutions**:
```typescript
// Increase pool size
DB_PRACTICE_MYSQL_POOL_MAX=20

// Check for connection leaks
const stats = db.getPoolStats();
console.log(stats); // Check if waiting queue is growing
```

#### 4. Transaction Deadlocks

**Symptom**: `Deadlock found when trying to get lock`

**Solutions**:
```typescript
// Use higher isolation level
await db.beginTransaction({ isolationLevel: 'SERIALIZABLE' });

// Implement retry logic
let retries = 3;
while (retries > 0) {
  try {
    await db.beginTransaction();
    // ... operations
    await db.commitTransaction();
    break;
  } catch (error) {
    await db.rollbackTransaction();
    if (error.message.includes('Deadlock') && retries > 1) {
      retries--;
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      throw error;
    }
  }
}
```

---

## Summary

This database testing framework provides:

- **Multi-database support** with unified API
- **Enterprise-grade features** including connection pooling, transactions, and health monitoring
- **BDD integration** for Cucumber/Gherkin testing
- **Comprehensive error handling** with detailed logging
- **Performance optimization** through prepared statements, streaming, and bulk operations
- **Import/Export capabilities** for multiple formats
- **Type safety** with TypeScript throughout

The architecture follows best practices with clear separation of concerns, adapter pattern for database-specific implementations, and a facade pattern for simplified usage.

---

## Appendix

### Type Definitions Reference

For complete type definitions, see:
- `src/database/types/database.types.ts` - All database type definitions
- `src/database/client/CSDatabase.ts` - Main database client interface
- `src/database/adapters/DatabaseAdapter.ts` - Adapter contract

### File Structure

```
src/database/
├── adapters/              # Database-specific adapters
│   ├── DatabaseAdapter.ts # Base adapter class
│   ├── MySQLAdapter.ts
│   ├── PostgreSQLAdapter.ts
│   ├── SQLServerAdapter.ts
│   ├── OracleAdapter.ts
│   ├── MongoDBAdapter.ts
│   └── RedisAdapter.ts
├── client/                # Core client components
│   ├── CSDatabase.ts      # Main facade
│   ├── ConnectionManager.ts
│   ├── ConnectionPool.ts
│   ├── QueryExecutor.ts
│   ├── TransactionManager.ts
│   └── ResultSetParser.ts
├── context/               # BDD context management
│   ├── DatabaseContext.ts
│   └── QueryContext.ts
├── validators/            # Data validators
│   ├── DataTypeValidator.ts
│   ├── QueryValidator.ts
│   ├── ResultSetValidator.ts
│   └── SchemaValidator.ts
├── types/                 # Type definitions
│   └── database.types.ts
├── CSDatabaseManager.ts   # Global connection manager
└── CSDatabaseRunner.ts    # Test runner integration

src/steps/database/        # BDD step definitions
├── ConnectionSteps.ts
├── QueryExecutionSteps.ts
├── TransactionSteps.ts
├── DataValidationSteps.ts
├── StoredProcedureSteps.ts
├── DatabaseUtilitySteps.ts
└── DatabaseGenericSteps.ts
```
