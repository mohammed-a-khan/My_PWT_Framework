import { CSDatabaseClient } from './CSDatabaseClient';
import { CSReporter } from '../reporter/CSReporter';
import { CSConfigurationManager } from '../core/CSConfigurationManager';

export interface TransactionOptions {
    isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
    timeout?: number;
    retryOnDeadlock?: boolean;
    maxRetries?: number;
    savepoints?: boolean;
}

export interface Savepoint {
    name: string;
    createdAt: Date;
    queries: string[];
}

export class CSTransaction {
    private client: CSDatabaseClient;
    private queries: string[] = [];
    private savepoints: Savepoint[] = [];
    private isActive: boolean = false;
    private startTime: Date;
    private options: TransactionOptions;
    private transactionId: string;
    
    constructor(client: CSDatabaseClient, options: TransactionOptions = {}) {
        this.client = client;
        this.options = options;
        this.startTime = new Date();
        this.transactionId = this.generateTransactionId();
    }
    
    private generateTransactionId(): string {
        return `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
    
    public async begin(): Promise<void> {
        if (this.isActive) {
            throw new Error('Transaction already active');
        }
        
        CSReporter.startStep(`Begin transaction ${this.transactionId}`);
        
        try {
            // Set isolation level if specified
            if (this.options.isolationLevel) {
                await this.client.query(
                    `SET TRANSACTION ISOLATION LEVEL ${this.options.isolationLevel}`
                );
            }
            
            // Begin transaction
            await this.client.query('BEGIN');
            this.isActive = true;
            
            CSReporter.endStep('pass');
            CSReporter.debug(`Transaction ${this.transactionId} started`);
        } catch (error: any) {
            CSReporter.endStep('fail');
            throw error;
        }
    }
    
    public async query(sql: string, params?: any[]): Promise<any> {
        if (!this.isActive) {
            throw new Error('Transaction not active');
        }
        
        this.queries.push(sql);
        
        try {
            const result = await this.client.query(sql, params);
            CSReporter.debug(`Transaction query executed: ${sql.substring(0, 50)}...`);
            return result;
        } catch (error: any) {
            CSReporter.error(`Transaction query failed: ${error.message}`);
            
            // Check for deadlock
            if (this.isDeadlockError(error) && this.options.retryOnDeadlock) {
                CSReporter.warn('Deadlock detected, will retry transaction');
                throw new DeadlockError(error.message);
            }
            
            throw error;
        }
    }
    
    public async commit(): Promise<void> {
        if (!this.isActive) {
            throw new Error('Transaction not active');
        }
        
        CSReporter.startStep(`Commit transaction ${this.transactionId}`);
        
        try {
            await this.client.query('COMMIT');
            this.isActive = false;
            
            const duration = Date.now() - this.startTime.getTime();
            CSReporter.endStep('pass');
            CSReporter.info(`Transaction ${this.transactionId} committed (${duration}ms, ${this.queries.length} queries)`);
        } catch (error: any) {
            CSReporter.endStep('fail');
            throw error;
        }
    }
    
    public async rollback(): Promise<void> {
        if (!this.isActive) {
            return;
        }
        
        CSReporter.startStep(`Rollback transaction ${this.transactionId}`);
        
        try {
            await this.client.query('ROLLBACK');
            this.isActive = false;
            
            CSReporter.endStep('pass');
            CSReporter.warn(`Transaction ${this.transactionId} rolled back`);
        } catch (error: any) {
            CSReporter.endStep('fail');
            throw error;
        }
    }
    
    public async savepoint(name: string): Promise<void> {
        if (!this.isActive) {
            throw new Error('Transaction not active');
        }
        
        if (!this.options.savepoints) {
            throw new Error('Savepoints not enabled for this transaction');
        }
        
        await this.client.query(`SAVEPOINT ${name}`);
        
        this.savepoints.push({
            name,
            createdAt: new Date(),
            queries: [...this.queries]
        });
        
        CSReporter.debug(`Savepoint '${name}' created`);
    }
    
    public async rollbackToSavepoint(name: string): Promise<void> {
        if (!this.isActive) {
            throw new Error('Transaction not active');
        }
        
        const savepoint = this.savepoints.find(sp => sp.name === name);
        if (!savepoint) {
            throw new Error(`Savepoint '${name}' not found`);
        }
        
        await this.client.query(`ROLLBACK TO SAVEPOINT ${name}`);
        
        // Restore queries to savepoint state
        this.queries = [...savepoint.queries];
        
        CSReporter.debug(`Rolled back to savepoint '${name}'`);
    }
    
    public async releaseSavepoint(name: string): Promise<void> {
        if (!this.isActive) {
            throw new Error('Transaction not active');
        }
        
        await this.client.query(`RELEASE SAVEPOINT ${name}`);
        
        // Remove savepoint from list
        this.savepoints = this.savepoints.filter(sp => sp.name !== name);
        
        CSReporter.debug(`Savepoint '${name}' released`);
    }
    
    private isDeadlockError(error: any): boolean {
        const message = error.message?.toLowerCase() || '';
        return message.includes('deadlock') || 
               message.includes('lock wait timeout') ||
               error.code === '40001' || // PostgreSQL
               error.code === '40P01' || // PostgreSQL
               error.errno === 1213;     // MySQL
    }
    
    public getIsActive(): boolean {
        return this.isActive;
    }
    
    public getTransactionId(): string {
        return this.transactionId;
    }
    
    public getQueries(): string[] {
        return [...this.queries];
    }
    
    public getSavepoints(): Savepoint[] {
        return [...this.savepoints];
    }
}

class DeadlockError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DeadlockError';
    }
}

export class CSTransactionManager {
    private static instance: CSTransactionManager;
    private databaseClient: CSDatabaseClient;
    private config: CSConfigurationManager;
    private activeTransactions: Map<string, CSTransaction> = new Map();
    private transactionHistory: TransactionRecord[] = [];
    private defaultOptions!: TransactionOptions;
    
    private constructor() {
        this.databaseClient = CSDatabaseClient.getInstance();
        this.config = CSConfigurationManager.getInstance();
        this.initializeDefaultOptions();
    }
    
    public static getInstance(): CSTransactionManager {
        if (!CSTransactionManager.instance) {
            CSTransactionManager.instance = new CSTransactionManager();
        }
        return CSTransactionManager.instance;
    }
    
    private initializeDefaultOptions(): void {
        this.defaultOptions = {
            isolationLevel: this.config.get('DB_TRANSACTION_ISOLATION', 'READ_COMMITTED') as any,
            timeout: this.config.getNumber('DB_TRANSACTION_TIMEOUT', 30000),
            retryOnDeadlock: this.config.getBoolean('DB_RETRY_ON_DEADLOCK', true),
            maxRetries: this.config.getNumber('DB_MAX_RETRIES', 3),
            savepoints: this.config.getBoolean('DB_ENABLE_SAVEPOINTS', false)
        };
    }
    
    public async beginTransaction(options?: TransactionOptions): Promise<CSTransaction> {
        const client = await this.databaseClient.getConnection();
        const mergedOptions = { ...this.defaultOptions, ...options };
        
        const transaction = new CSTransaction(client, mergedOptions);
        await transaction.begin();
        
        this.activeTransactions.set(transaction.getTransactionId(), transaction);
        
        return transaction;
    }
    
    public async executeInTransaction<T>(
        callback: (transaction: CSTransaction) => Promise<T>,
        options?: TransactionOptions
    ): Promise<T> {
        const mergedOptions = { ...this.defaultOptions, ...options };
        let attempts = 0;
        const maxAttempts = mergedOptions.maxRetries || 1;
        
        while (attempts < maxAttempts) {
            attempts++;
            const transaction = await this.beginTransaction(mergedOptions);
            const startTime = Date.now();
            
            try {
                // Execute callback
                const result = await callback(transaction);
                
                // Commit transaction
                await transaction.commit();
                
                // Record successful transaction
                this.recordTransaction({
                    id: transaction.getTransactionId(),
                    status: 'committed',
                    duration: Date.now() - startTime,
                    queries: transaction.getQueries().length,
                    attempts
                });
                
                this.activeTransactions.delete(transaction.getTransactionId());
                
                return result;
                
            } catch (error: any) {
                // Rollback transaction
                await transaction.rollback();
                
                // Check if we should retry
                if (error instanceof DeadlockError && attempts < maxAttempts) {
                    CSReporter.warn(`Transaction failed due to deadlock, retrying (attempt ${attempts}/${maxAttempts})`);
                    
                    // Wait before retry with exponential backoff
                    await this.delay(Math.pow(2, attempts) * 100);
                    continue;
                }
                
                // Record failed transaction
                this.recordTransaction({
                    id: transaction.getTransactionId(),
                    status: 'rolled_back',
                    duration: Date.now() - startTime,
                    queries: transaction.getQueries().length,
                    attempts,
                    error: error.message
                });
                
                this.activeTransactions.delete(transaction.getTransactionId());
                
                throw error;
            }
        }
        
        throw new Error(`Transaction failed after ${maxAttempts} attempts`);
    }
    
    public async executeBatch(
        queries: Array<{ sql: string; params?: any[] }>,
        options?: TransactionOptions
    ): Promise<any[]> {
        return this.executeInTransaction(async (transaction) => {
            const results: any[] = [];
            
            for (const query of queries) {
                const result = await transaction.query(query.sql, query.params);
                results.push(result);
            }
            
            return results;
        }, options);
    }
    
    public async executeWithSavepoints<T>(
        callback: (transaction: CSTransaction, createSavepoint: (name: string) => Promise<void>) => Promise<T>,
        options?: TransactionOptions
    ): Promise<T> {
        const mergedOptions = { ...this.defaultOptions, ...options, savepoints: true };
        
        return this.executeInTransaction(async (transaction) => {
            const createSavepoint = async (name: string) => {
                await transaction.savepoint(name);
            };
            
            return await callback(transaction, createSavepoint);
        }, mergedOptions);
    }
    
    public async executeParallel(
        callbacks: Array<() => Promise<any>>,
        options?: TransactionOptions
    ): Promise<any[]> {
        const promises = callbacks.map(callback => 
            this.executeInTransaction(async () => await callback(), options)
        );
        
        return Promise.all(promises);
    }
    
    public async executeSequential(
        callbacks: Array<() => Promise<any>>,
        options?: TransactionOptions
    ): Promise<any[]> {
        const results: any[] = [];
        
        for (const callback of callbacks) {
            const result = await this.executeInTransaction(
                async () => await callback(),
                options
            );
            results.push(result);
        }
        
        return results;
    }
    
    public async withDistributedTransaction<T>(
        databases: string[],
        callback: (transactions: Map<string, CSTransaction>) => Promise<T>,
        options?: TransactionOptions
    ): Promise<T> {
        const transactions = new Map<string, CSTransaction>();
        const startTime = Date.now();
        
        try {
            // Begin transactions on all databases
            for (const dbName of databases) {
                const client = await this.databaseClient.getConnection(dbName);
                const transaction = new CSTransaction(client, options || this.defaultOptions);
                await transaction.begin();
                transactions.set(dbName, transaction);
            }
            
            // Execute callback
            const result = await callback(transactions);
            
            // Prepare phase (two-phase commit)
            for (const [dbName, transaction] of transactions) {
                // In real implementation, would send PREPARE TRANSACTION
                CSReporter.debug(`Preparing transaction on ${dbName}`);
            }
            
            // Commit phase
            for (const [dbName, transaction] of transactions) {
                await transaction.commit();
            }
            
            CSReporter.info(`Distributed transaction completed across ${databases.length} databases (${Date.now() - startTime}ms)`);
            
            return result;
            
        } catch (error: any) {
            // Rollback all transactions
            for (const [dbName, transaction] of transactions) {
                try {
                    await transaction.rollback();
                } catch (rollbackError: any) {
                    CSReporter.error(`Failed to rollback transaction on ${dbName}: ${rollbackError.message}`);
                }
            }
            
            CSReporter.error(`Distributed transaction failed: ${error.message}`);
            throw error;
        }
    }
    
    public getActiveTransactions(): CSTransaction[] {
        return Array.from(this.activeTransactions.values());
    }
    
    public getActiveTransactionCount(): number {
        return this.activeTransactions.size;
    }
    
    public async rollbackAll(): Promise<void> {
        CSReporter.warn(`Rolling back ${this.activeTransactions.size} active transactions`);
        
        for (const [id, transaction] of this.activeTransactions) {
            try {
                await transaction.rollback();
                this.activeTransactions.delete(id);
            } catch (error: any) {
                CSReporter.error(`Failed to rollback transaction ${id}: ${error.message}`);
            }
        }
    }
    
    private recordTransaction(record: TransactionRecord): void {
        this.transactionHistory.push(record);
        
        // Keep only last 1000 records
        if (this.transactionHistory.length > 1000) {
            this.transactionHistory = this.transactionHistory.slice(-1000);
        }
    }
    
    public getTransactionHistory(): TransactionRecord[] {
        return [...this.transactionHistory];
    }
    
    public getTransactionStats(): TransactionStats {
        const stats: TransactionStats = {
            total: this.transactionHistory.length,
            committed: 0,
            rolledBack: 0,
            averageDuration: 0,
            averageQueries: 0,
            deadlocks: 0,
            retries: 0
        };
        
        let totalDuration = 0;
        let totalQueries = 0;
        
        this.transactionHistory.forEach(record => {
            if (record.status === 'committed') {
                stats.committed++;
            } else {
                stats.rolledBack++;
            }
            
            totalDuration += record.duration;
            totalQueries += record.queries;
            
            if (record.error?.toLowerCase().includes('deadlock')) {
                stats.deadlocks++;
            }
            
            if (record.attempts > 1) {
                stats.retries += record.attempts - 1;
            }
        });
        
        if (stats.total > 0) {
            stats.averageDuration = totalDuration / stats.total;
            stats.averageQueries = totalQueries / stats.total;
        }
        
        return stats;
    }
    
    public clearHistory(): void {
        this.transactionHistory = [];
    }
    
    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

interface TransactionRecord {
    id: string;
    status: 'committed' | 'rolled_back';
    duration: number;
    queries: number;
    attempts: number;
    error?: string;
}

interface TransactionStats {
    total: number;
    committed: number;
    rolledBack: number;
    averageDuration: number;
    averageQueries: number;
    deadlocks: number;
    retries: number;
}