import { CSReporter } from '../reporter/CSReporter';

export interface QueryOptions {
    distinct?: boolean;
    limit?: number;
    offset?: number;
    orderBy?: string | string[];
    groupBy?: string | string[];
    having?: string;
    raw?: boolean;
}

export class CSQueryBuilder {
    private tableName: string = '';
    private selectColumns: string[] = ['*'];
    private whereConditions: string[] = [];
    private whereParams: any[] = [];
    private joinClauses: string[] = [];
    private orderByClause: string = '';
    private groupByClause: string = '';
    private havingClause: string = '';
    private limitValue?: number;
    private offsetValue?: number;
    private distinctFlag: boolean = false;
    private queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' = 'SELECT';
    private insertData: any = {};
    private updateData: any = {};

    // Fluent API for building queries
    public static table(tableName: string): CSQueryBuilder {
        const builder = new CSQueryBuilder();
        builder.tableName = tableName;
        return builder;
    }

    public static from(tableName: string): CSQueryBuilder {
        return CSQueryBuilder.table(tableName);
    }

    // SELECT operations
    public select(...columns: string[]): CSQueryBuilder {
        this.queryType = 'SELECT';
        this.selectColumns = columns.length > 0 ? columns : ['*'];
        return this;
    }

    public distinct(): CSQueryBuilder {
        this.distinctFlag = true;
        return this;
    }

    // WHERE conditions
    public where(column: string, operator: string, value?: any): CSQueryBuilder {
        if (value === undefined) {
            // Two-argument form: where('column', 'value')
            value = operator;
            operator = '=';
        }

        this.whereConditions.push(`${column} ${operator} ?`);
        this.whereParams.push(value);
        return this;
    }

    public whereIn(column: string, values: any[]): CSQueryBuilder {
        const placeholders = values.map(() => '?').join(', ');
        this.whereConditions.push(`${column} IN (${placeholders})`);
        this.whereParams.push(...values);
        return this;
    }

    public whereNotIn(column: string, values: any[]): CSQueryBuilder {
        const placeholders = values.map(() => '?').join(', ');
        this.whereConditions.push(`${column} NOT IN (${placeholders})`);
        this.whereParams.push(...values);
        return this;
    }

    public whereBetween(column: string, min: any, max: any): CSQueryBuilder {
        this.whereConditions.push(`${column} BETWEEN ? AND ?`);
        this.whereParams.push(min, max);
        return this;
    }

    public whereNull(column: string): CSQueryBuilder {
        this.whereConditions.push(`${column} IS NULL`);
        return this;
    }

    public whereNotNull(column: string): CSQueryBuilder {
        this.whereConditions.push(`${column} IS NOT NULL`);
        return this;
    }

    public whereLike(column: string, pattern: string): CSQueryBuilder {
        this.whereConditions.push(`${column} LIKE ?`);
        this.whereParams.push(pattern);
        return this;
    }

    public whereRaw(condition: string, params?: any[]): CSQueryBuilder {
        this.whereConditions.push(condition);
        if (params) {
            this.whereParams.push(...params);
        }
        return this;
    }

    public orWhere(column: string, operator: string, value?: any): CSQueryBuilder {
        if (value === undefined) {
            value = operator;
            operator = '=';
        }

        if (this.whereConditions.length > 0) {
            const lastCondition = this.whereConditions.pop();
            this.whereConditions.push(`(${lastCondition} OR ${column} ${operator} ?)`);
        } else {
            this.whereConditions.push(`${column} ${operator} ?`);
        }
        
        this.whereParams.push(value);
        return this;
    }

    // JOIN operations
    public join(table: string, column1: string, operator: string, column2: string): CSQueryBuilder {
        this.joinClauses.push(`JOIN ${table} ON ${column1} ${operator} ${column2}`);
        return this;
    }

    public leftJoin(table: string, column1: string, operator: string, column2: string): CSQueryBuilder {
        this.joinClauses.push(`LEFT JOIN ${table} ON ${column1} ${operator} ${column2}`);
        return this;
    }

    public rightJoin(table: string, column1: string, operator: string, column2: string): CSQueryBuilder {
        this.joinClauses.push(`RIGHT JOIN ${table} ON ${column1} ${operator} ${column2}`);
        return this;
    }

    public innerJoin(table: string, column1: string, operator: string, column2: string): CSQueryBuilder {
        this.joinClauses.push(`INNER JOIN ${table} ON ${column1} ${operator} ${column2}`);
        return this;
    }

    public crossJoin(table: string): CSQueryBuilder {
        this.joinClauses.push(`CROSS JOIN ${table}`);
        return this;
    }

    // ORDER BY
    public orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): CSQueryBuilder {
        if (this.orderByClause) {
            this.orderByClause += `, ${column} ${direction}`;
        } else {
            this.orderByClause = `${column} ${direction}`;
        }
        return this;
    }

    public orderByAsc(column: string): CSQueryBuilder {
        return this.orderBy(column, 'ASC');
    }

    public orderByDesc(column: string): CSQueryBuilder {
        return this.orderBy(column, 'DESC');
    }

    // GROUP BY
    public groupBy(...columns: string[]): CSQueryBuilder {
        this.groupByClause = columns.join(', ');
        return this;
    }

    public having(condition: string, params?: any[]): CSQueryBuilder {
        this.havingClause = condition;
        if (params) {
            this.whereParams.push(...params);
        }
        return this;
    }

    // LIMIT and OFFSET
    public limit(limit: number): CSQueryBuilder {
        this.limitValue = limit;
        return this;
    }

    public offset(offset: number): CSQueryBuilder {
        this.offsetValue = offset;
        return this;
    }

    public skip(offset: number): CSQueryBuilder {
        return this.offset(offset);
    }

    public take(limit: number): CSQueryBuilder {
        return this.limit(limit);
    }

    // INSERT operations
    public insert(data: any): CSQueryBuilder {
        this.queryType = 'INSERT';
        this.insertData = data;
        return this;
    }

    public insertMany(data: any[]): CSQueryBuilder[] {
        return data.map(record => {
            const builder = new CSQueryBuilder();
            builder.tableName = this.tableName;
            builder.queryType = 'INSERT';
            builder.insertData = record;
            return builder;
        });
    }

    // UPDATE operations
    public update(data: any): CSQueryBuilder {
        this.queryType = 'UPDATE';
        this.updateData = data;
        return this;
    }

    public set(column: string, value: any): CSQueryBuilder {
        this.queryType = 'UPDATE';
        this.updateData[column] = value;
        return this;
    }

    public increment(column: string, amount: number = 1): CSQueryBuilder {
        this.queryType = 'UPDATE';
        this.updateData[column] = `${column} + ${amount}`;
        return this;
    }

    public decrement(column: string, amount: number = 1): CSQueryBuilder {
        this.queryType = 'UPDATE';
        this.updateData[column] = `${column} - ${amount}`;
        return this;
    }

    // DELETE operations
    public delete(): CSQueryBuilder {
        this.queryType = 'DELETE';
        return this;
    }

    // Build the SQL query
    public build(): { sql: string; params: any[] } {
        let sql = '';
        const params: any[] = [];

        switch (this.queryType) {
            case 'SELECT':
                sql = this.buildSelectQuery();
                params.push(...this.whereParams);
                break;

            case 'INSERT':
                sql = this.buildInsertQuery();
                params.push(...Object.values(this.insertData));
                break;

            case 'UPDATE':
                sql = this.buildUpdateQuery();
                params.push(...Object.values(this.updateData));
                params.push(...this.whereParams);
                break;

            case 'DELETE':
                sql = this.buildDeleteQuery();
                params.push(...this.whereParams);
                break;
        }

        CSReporter.debug(`Built query: ${sql}`);
        CSReporter.debug(`Parameters: ${JSON.stringify(params)}`);

        return { sql, params };
    }

    private buildSelectQuery(): string {
        let sql = 'SELECT ';

        if (this.distinctFlag) {
            sql += 'DISTINCT ';
        }

        sql += this.selectColumns.join(', ');
        sql += ` FROM ${this.tableName}`;

        // Add JOIN clauses
        if (this.joinClauses.length > 0) {
            sql += ' ' + this.joinClauses.join(' ');
        }

        // Add WHERE clause
        if (this.whereConditions.length > 0) {
            sql += ' WHERE ' + this.whereConditions.join(' AND ');
        }

        // Add GROUP BY clause
        if (this.groupByClause) {
            sql += ' GROUP BY ' + this.groupByClause;
        }

        // Add HAVING clause
        if (this.havingClause) {
            sql += ' HAVING ' + this.havingClause;
        }

        // Add ORDER BY clause
        if (this.orderByClause) {
            sql += ' ORDER BY ' + this.orderByClause;
        }

        // Add LIMIT clause
        if (this.limitValue !== undefined) {
            sql += ` LIMIT ${this.limitValue}`;
        }

        // Add OFFSET clause
        if (this.offsetValue !== undefined) {
            sql += ` OFFSET ${this.offsetValue}`;
        }

        return sql;
    }

    private buildInsertQuery(): string {
        const columns = Object.keys(this.insertData);
        const placeholders = columns.map(() => '?').join(', ');
        
        return `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    }

    private buildUpdateQuery(): string {
        const setClause = Object.keys(this.updateData)
            .map(column => {
                const value = this.updateData[column];
                // Check if it's a raw SQL expression (like increment)
                if (typeof value === 'string' && value.includes(column)) {
                    return `${column} = ${value}`;
                }
                return `${column} = ?`;
            })
            .join(', ');

        let sql = `UPDATE ${this.tableName} SET ${setClause}`;

        // Add WHERE clause
        if (this.whereConditions.length > 0) {
            sql += ' WHERE ' + this.whereConditions.join(' AND ');
        }

        return sql;
    }

    private buildDeleteQuery(): string {
        let sql = `DELETE FROM ${this.tableName}`;

        // Add WHERE clause
        if (this.whereConditions.length > 0) {
            sql += ' WHERE ' + this.whereConditions.join(' AND ');
        }

        return sql;
    }

    // Execute the query (requires database client)
    public async execute(client?: any): Promise<any> {
        const { sql, params } = this.build();
        
        if (!client) {
            const { CSDatabaseClient } = require('./CSDatabaseClient');
            client = CSDatabaseClient.getInstance();
        }

        return await client.query(sql, params);
    }

    // Convenience methods
    public async first(client?: any): Promise<any> {
        this.limit(1);
        const result = await this.execute(client);
        return result.rows ? result.rows[0] : null;
    }

    public async get(client?: any): Promise<any[]> {
        const result = await this.execute(client);
        return result.rows || [];
    }

    public async count(client?: any): Promise<number> {
        this.selectColumns = ['COUNT(*) as count'];
        const result = await this.execute(client);
        return result.rows?.[0]?.count || 0;
    }

    public async exists(client?: any): Promise<boolean> {
        const count = await this.count(client);
        return count > 0;
    }

    public async pluck(column: string, client?: any): Promise<any[]> {
        this.selectColumns = [column];
        const result = await this.execute(client);
        return result.rows?.map((row: any) => row[column]) || [];
    }

    // Aggregate functions
    public async sum(column: string, client?: any): Promise<number> {
        this.selectColumns = [`SUM(${column}) as sum`];
        const result = await this.execute(client);
        return result.rows?.[0]?.sum || 0;
    }

    public async avg(column: string, client?: any): Promise<number> {
        this.selectColumns = [`AVG(${column}) as avg`];
        const result = await this.execute(client);
        return result.rows?.[0]?.avg || 0;
    }

    public async min(column: string, client?: any): Promise<any> {
        this.selectColumns = [`MIN(${column}) as min`];
        const result = await this.execute(client);
        return result.rows?.[0]?.min;
    }

    public async max(column: string, client?: any): Promise<any> {
        this.selectColumns = [`MAX(${column}) as max`];
        const result = await this.execute(client);
        return result.rows?.[0]?.max;
    }

    // Clone the builder for reuse
    public clone(): CSQueryBuilder {
        const newBuilder = new CSQueryBuilder();
        Object.assign(newBuilder, this);
        newBuilder.whereConditions = [...this.whereConditions];
        newBuilder.whereParams = [...this.whereParams];
        newBuilder.joinClauses = [...this.joinClauses];
        newBuilder.selectColumns = [...this.selectColumns];
        return newBuilder;
    }

    // Reset the builder
    public reset(): CSQueryBuilder {
        this.whereConditions = [];
        this.whereParams = [];
        this.joinClauses = [];
        this.orderByClause = '';
        this.groupByClause = '';
        this.havingClause = '';
        this.limitValue = undefined;
        this.offsetValue = undefined;
        this.distinctFlag = false;
        this.insertData = {};
        this.updateData = {};
        return this;
    }

    // Get raw SQL string (for debugging)
    public toSQL(): string {
        const { sql, params } = this.build();
        
        // Replace placeholders with actual values for debugging
        let debugSQL = sql;
        params.forEach(param => {
            const value = typeof param === 'string' ? `'${param}'` : param;
            debugSQL = debugSQL.replace('?', value.toString());
        });
        
        return debugSQL;
    }
}