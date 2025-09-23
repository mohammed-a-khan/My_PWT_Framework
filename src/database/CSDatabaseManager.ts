import { CSConfigurationManager } from '../core/CSConfigurationManager';
import { CSReporter } from '../reporter/CSReporter';

export interface DatabaseConfig {
    type: 'mysql' | 'postgresql' | 'mongodb' | 'oracle' | 'mssql';
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    connectionPoolMin?: number;
    connectionPoolMax?: number;
    queryTimeout?: number;
}

export interface QueryResult {
    rows: any[];
    rowCount: number;
    fields?: any[];
}

export interface Transaction {
    id: string;
    connection: DatabaseConnection;
    savepoint?: string;
    isActive: boolean;
}

export abstract class DatabaseAdapter {
    protected config: DatabaseConfig;
    
    constructor(config: DatabaseConfig) {
        this.config = config;
    }
    
    abstract connect(): Promise<void>;
    abstract disconnect(): Promise<void>;
    abstract query(sql: string, params?: any[]): Promise<QueryResult>;
    abstract beginTransaction(): Promise<Transaction>;
    abstract commit(transaction: Transaction): Promise<void>;
    abstract rollback(transaction: Transaction): Promise<void>;
    abstract createSavepoint(transaction: Transaction, name: string): Promise<void>;
    abstract rollbackToSavepoint(transaction: Transaction, name: string): Promise<void>;
    abstract isConnected(): boolean;
}

class MySQLAdapter extends DatabaseAdapter {
    private connection: any;
    
    async connect(): Promise<void> {
        // MySQL connection implementation
        CSReporter.info(`Connecting to MySQL: ${this.config.host}:${this.config.port}`);
        // Would use mysql2 package in production
    }
    
    async disconnect(): Promise<void> {
        if (this.connection) {
            // await this.connection.end();
        }
    }
    
    async query(sql: string, params?: any[]): Promise<QueryResult> {
        CSReporter.debug(`MySQL Query: ${sql}`);
        // Execute query
        return { rows: [], rowCount: 0 };
    }
    
    async beginTransaction(): Promise<Transaction> {
        const id = `mysql_tx_${Date.now()}`;
        // await this.connection.beginTransaction();
        return {
            id,
            connection: this as any,
            isActive: true
        };
    }
    
    async commit(transaction: Transaction): Promise<void> {
        // await this.connection.commit();
        transaction.isActive = false;
    }
    
    async rollback(transaction: Transaction): Promise<void> {
        // await this.connection.rollback();
        transaction.isActive = false;
    }
    
    async createSavepoint(transaction: Transaction, name: string): Promise<void> {
        await this.query(`SAVEPOINT ${name}`);
        transaction.savepoint = name;
    }
    
    async rollbackToSavepoint(transaction: Transaction, name: string): Promise<void> {
        await this.query(`ROLLBACK TO SAVEPOINT ${name}`);
    }
    
    isConnected(): boolean {
        return this.connection && !this.connection.destroyed;
    }
}

class PostgreSQLAdapter extends DatabaseAdapter {
    private client: any;
    
    async connect(): Promise<void> {
        CSReporter.info(`Connecting to PostgreSQL: ${this.config.host}:${this.config.port}`);
        // Would use pg package in production
    }
    
    async disconnect(): Promise<void> {
        if (this.client) {
            // await this.client.end();
        }
    }
    
    async query(sql: string, params?: any[]): Promise<QueryResult> {
        CSReporter.debug(`PostgreSQL Query: ${sql}`);
        // Execute query
        return { rows: [], rowCount: 0 };
    }
    
    async beginTransaction(): Promise<Transaction> {
        const id = `pg_tx_${Date.now()}`;
        await this.query('BEGIN');
        return {
            id,
            connection: this as any,
            isActive: true
        };
    }
    
    async commit(transaction: Transaction): Promise<void> {
        await this.query('COMMIT');
        transaction.isActive = false;
    }
    
    async rollback(transaction: Transaction): Promise<void> {
        await this.query('ROLLBACK');
        transaction.isActive = false;
    }
    
    async createSavepoint(transaction: Transaction, name: string): Promise<void> {
        await this.query(`SAVEPOINT ${name}`);
        transaction.savepoint = name;
    }
    
    async rollbackToSavepoint(transaction: Transaction, name: string): Promise<void> {
        await this.query(`ROLLBACK TO SAVEPOINT ${name}`);
    }
    
    isConnected(): boolean {
        return this.client && !this.client.ended;
    }
}

class MongoDBAdapter extends DatabaseAdapter {
    private client: any;
    private db: any;
    
    async connect(): Promise<void> {
        CSReporter.info(`Connecting to MongoDB: ${this.config.host}:${this.config.port}`);
        // Would use mongodb package in production
    }
    
    async disconnect(): Promise<void> {
        if (this.client) {
            // await this.client.close();
        }
    }
    
    async query(sql: string, params?: any[]): Promise<QueryResult> {
        // MongoDB doesn't use SQL, this would be translated to MongoDB operations
        CSReporter.debug(`MongoDB Operation: ${sql}`);
        return { rows: [], rowCount: 0 };
    }
    
    async beginTransaction(): Promise<Transaction> {
        const id = `mongo_tx_${Date.now()}`;
        // const session = this.client.startSession();
        // session.startTransaction();
        return {
            id,
            connection: this as any,
            isActive: true
        };
    }
    
    async commit(transaction: Transaction): Promise<void> {
        // await session.commitTransaction();
        transaction.isActive = false;
    }
    
    async rollback(transaction: Transaction): Promise<void> {
        // await session.abortTransaction();
        transaction.isActive = false;
    }
    
    async createSavepoint(transaction: Transaction, name: string): Promise<void> {
        // MongoDB doesn't support savepoints
        CSReporter.warn('Savepoints not supported in MongoDB');
    }
    
    async rollbackToSavepoint(transaction: Transaction, name: string): Promise<void> {
        CSReporter.warn('Savepoints not supported in MongoDB');
    }
    
    isConnected(): boolean {
        return this.client && this.client.topology && this.client.topology.isConnected();
    }
}

class OracleAdapter extends DatabaseAdapter {
    private connection: any;
    
    async connect(): Promise<void> {
        CSReporter.info(`Connecting to Oracle: ${this.config.host}:${this.config.port}`);
        // Would use oracledb package in production
    }
    
    async disconnect(): Promise<void> {
        if (this.connection) {
            // await this.connection.close();
        }
    }
    
    async query(sql: string, params?: any[]): Promise<QueryResult> {
        CSReporter.debug(`Oracle Query: ${sql}`);
        return { rows: [], rowCount: 0 };
    }
    
    async beginTransaction(): Promise<Transaction> {
        const id = `oracle_tx_${Date.now()}`;
        // Transaction begins automatically in Oracle
        return {
            id,
            connection: this as any,
            isActive: true
        };
    }
    
    async commit(transaction: Transaction): Promise<void> {
        await this.query('COMMIT');
        transaction.isActive = false;
    }
    
    async rollback(transaction: Transaction): Promise<void> {
        await this.query('ROLLBACK');
        transaction.isActive = false;
    }
    
    async createSavepoint(transaction: Transaction, name: string): Promise<void> {
        await this.query(`SAVEPOINT ${name}`);
        transaction.savepoint = name;
    }
    
    async rollbackToSavepoint(transaction: Transaction, name: string): Promise<void> {
        await this.query(`ROLLBACK TO ${name}`);
    }
    
    isConnected(): boolean {
        return this.connection && this.connection.isHealthy();
    }
}

export interface DatabaseConnection extends DatabaseAdapter {}

export class CSDatabaseManager {
    private static instance: CSDatabaseManager;
    private config: CSConfigurationManager;
    private connections: Map<string, DatabaseAdapter> = new Map();
    private transactions: Map<string, Transaction> = new Map();
    private adapters: { [key: string]: any } = {
        mysql: MySQLAdapter,
        postgresql: PostgreSQLAdapter,
        mongodb: MongoDBAdapter,
        oracle: OracleAdapter,
        mssql: MySQLAdapter // Using MySQL adapter as placeholder for MSSQL
    };
    
    private constructor() {
        this.config = CSConfigurationManager.getInstance();
    }
    
    public static getInstance(): CSDatabaseManager {
        if (!CSDatabaseManager.instance) {
            CSDatabaseManager.instance = new CSDatabaseManager();
        }
        return CSDatabaseManager.instance;
    }
    
    public async getConnection(name: string = 'default'): Promise<DatabaseAdapter> {
        if (this.connections.has(name)) {
            const connection = this.connections.get(name)!;
            if (connection.isConnected()) {
                return connection;
            }
        }
        
        const connection = await this.createConnection(name);
        this.connections.set(name, connection);
        return connection;
    }
    
    private async createConnection(name: string): Promise<DatabaseAdapter> {
        const dbType = this.config.get(`DB_TYPE`, 'mysql') as any;
        const dbConfig: DatabaseConfig = {
            type: dbType,
            host: this.config.get('DB_HOST'),
            port: this.config.getNumber('DB_PORT', 3306),
            database: this.config.get('DB_NAME'),
            username: this.config.get('DB_USERNAME'),
            password: this.config.get('DB_PASSWORD'),
            connectionPoolMin: this.config.getNumber('DB_CONNECTION_POOL_MIN', 2),
            connectionPoolMax: this.config.getNumber('DB_CONNECTION_POOL_MAX', 10),
            queryTimeout: this.config.getNumber('DB_QUERY_TIMEOUT', 10000)
        };
        
        const AdapterClass = this.adapters[dbType];
        if (!AdapterClass) {
            throw new Error(`Unsupported database type: ${dbType}`);
        }
        
        const adapter = new AdapterClass(dbConfig);
        await adapter.connect();
        
        CSReporter.info(`Database connection established: ${name} (${dbType})`);
        return adapter;
    }
    
    public async query(sql: string, params?: any[], connectionName: string = 'default'): Promise<QueryResult> {
        const connection = await this.getConnection(connectionName);
        
        const startTime = Date.now();
        try {
            const result = await connection.query(sql, params);
            const duration = Date.now() - startTime;
            
            CSReporter.debug(`Query executed in ${duration}ms: ${result.rowCount} rows`);
            return result;
        } catch (error: any) {
            CSReporter.error(`Query failed: ${error.message}`);
            throw error;
        }
    }
    
    public async beginTransaction(testId: string, connectionName: string = 'default'): Promise<Transaction> {
        const connection = await this.getConnection(connectionName);
        const transaction = await connection.beginTransaction();
        
        this.transactions.set(testId, transaction);
        
        // Create savepoint for rollback
        if (this.config.getBoolean('DB_AUTO_ROLLBACK', false)) {
            await connection.createSavepoint(transaction, `test_${testId}`);
        }
        
        CSReporter.info(`Transaction started: ${transaction.id}`);
        return transaction;
    }
    
    public async executeInTransaction(
        testId: string,
        operation: (connection: DatabaseAdapter) => Promise<any>
    ): Promise<any> {
        const transaction = this.transactions.get(testId);
        if (!transaction) {
            throw new Error(`No transaction found for test: ${testId}`);
        }
        
        try {
            const result = await operation(transaction.connection);
            
            // Don't commit if auto-rollback is enabled
            if (!this.config.getBoolean('DB_AUTO_ROLLBACK', false)) {
                await transaction.connection.commit(transaction);
            }
            
            return result;
        } catch (error: any) {
            await transaction.connection.rollback(transaction);
            throw error;
        }
    }
    
    public async rollbackTransaction(testId: string): Promise<void> {
        const transaction = this.transactions.get(testId);
        if (!transaction) {
            return;
        }
        
        if (transaction.savepoint) {
            await transaction.connection.rollbackToSavepoint(transaction, transaction.savepoint);
        } else {
            await transaction.connection.rollback(transaction);
        }
        
        this.transactions.delete(testId);
        CSReporter.info(`Transaction rolled back: ${transaction.id}`);
    }
    
    public async commitTransaction(testId: string): Promise<void> {
        const transaction = this.transactions.get(testId);
        if (!transaction) {
            return;
        }
        
        await transaction.connection.commit(transaction);
        this.transactions.delete(testId);
        CSReporter.info(`Transaction committed: ${transaction.id}`);
    }
    
    public async closeConnection(name: string = 'default'): Promise<void> {
        const connection = this.connections.get(name);
        if (connection) {
            await connection.disconnect();
            this.connections.delete(name);
            CSReporter.info(`Database connection closed: ${name}`);
        }
    }
    
    public async closeAllConnections(): Promise<void> {
        for (const [name, connection] of this.connections) {
            await connection.disconnect();
        }
        this.connections.clear();
        CSReporter.info('All database connections closed');
    }
    
    public async rollbackAllTransactions(): Promise<void> {
        for (const [testId, transaction] of this.transactions) {
            if (transaction.isActive) {
                await transaction.connection.rollback(transaction);
            }
        }
        this.transactions.clear();
    }
    
    // Helper methods for common operations
    public async insert(table: string, data: any, connectionName: string = 'default'): Promise<any> {
        const columns = Object.keys(data).join(', ');
        const placeholders = Object.keys(data).map((_, i) => `$${i + 1}`).join(', ');
        const values = Object.values(data);
        
        const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
        return await this.query(sql, values, connectionName);
    }
    
    public async update(table: string, data: any, where: any, connectionName: string = 'default'): Promise<any> {
        const setClause = Object.keys(data).map((key, i) => `${key} = $${i + 1}`).join(', ');
        const whereClause = Object.keys(where).map((key, i) => `${key} = $${Object.keys(data).length + i + 1}`).join(' AND ');
        const values = [...Object.values(data), ...Object.values(where)];
        
        const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
        return await this.query(sql, values, connectionName);
    }
    
    public async delete(table: string, where: any, connectionName: string = 'default'): Promise<any> {
        const whereClause = Object.keys(where).map((key, i) => `${key} = $${i + 1}`).join(' AND ');
        const values = Object.values(where);
        
        const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
        return await this.query(sql, values, connectionName);
    }
    
    public async select(table: string, where?: any, connectionName: string = 'default'): Promise<any[]> {
        let sql = `SELECT * FROM ${table}`;
        let values: any[] = [];
        
        if (where && Object.keys(where).length > 0) {
            const whereClause = Object.keys(where).map((key, i) => `${key} = $${i + 1}`).join(' AND ');
            sql += ` WHERE ${whereClause}`;
            values = Object.values(where);
        }
        
        const result = await this.query(sql, values, connectionName);
        return result.rows;
    }
}