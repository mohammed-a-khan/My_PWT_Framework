import { CSReporter } from '../reporter/CSReporter';
import { CSConfigurationManager } from '../core/CSConfigurationManager';
import { HttpResponse } from './CSHttpClient';
import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv';

export interface ValidationRule {
    field: string;
    type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null';
    required?: boolean;
    pattern?: string | RegExp;
    minLength?: number;
    maxLength?: number;
    minimum?: number;
    maximum?: number;
    enum?: any[];
    custom?: (value: any) => boolean;
    message?: string;
}

export interface ValidationSchema {
    statusCode?: number | number[];
    headers?: Record<string, ValidationRule>;
    body?: Record<string, ValidationRule> | ValidationRule[];
    jsonSchema?: any;
    responseTime?: number;
    size?: number;
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    summary: {
        totalChecks: number;
        passed: number;
        failed: number;
        warnings: number;
    };
}

export interface ValidationError {
    field: string;
    expected: any;
    actual: any;
    message: string;
    type: 'type' | 'required' | 'pattern' | 'range' | 'enum' | 'custom' | 'schema';
}

export interface ValidationWarning {
    field: string;
    message: string;
    suggestion?: string;
}

export class CSAPIValidator {
    private static instance: CSAPIValidator;
    private config: CSConfigurationManager;
    private ajv: any;
    private schemas: Map<string, ValidationSchema> = new Map();
    private customValidators: Map<string, Function> = new Map();
    private validationHistory: ValidationResult[] = [];
    private strictMode: boolean = false;
    
    private constructor() {
        this.config = CSConfigurationManager.getInstance();
        this.ajv = new Ajv({ allErrors: true, verbose: true });
        this.registerBuiltInValidators();
        this.loadSchemas();
    }
    
    public static getInstance(): CSAPIValidator {
        if (!CSAPIValidator.instance) {
            CSAPIValidator.instance = new CSAPIValidator();
        }
        return CSAPIValidator.instance;
    }
    
    private registerBuiltInValidators(): void {
        // Email validator
        this.customValidators.set('email', (value: string) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(value);
        });
        
        // URL validator
        this.customValidators.set('url', (value: string) => {
            try {
                new URL(value);
                return true;
            } catch {
                return false;
            }
        });
        
        // UUID validator
        this.customValidators.set('uuid', (value: string) => {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            return uuidRegex.test(value);
        });
        
        // Date validator
        this.customValidators.set('date', (value: string) => {
            return !isNaN(Date.parse(value));
        });
        
        // ISO date validator
        this.customValidators.set('isoDate', (value: string) => {
            const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
            return isoDateRegex.test(value);
        });
        
        // Phone validator
        this.customValidators.set('phone', (value: string) => {
            const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
            return phoneRegex.test(value);
        });
        
        // Credit card validator
        this.customValidators.set('creditCard', (value: string) => {
            const cleaned = value.replace(/\s/g, '');
            return this.luhnCheck(cleaned);
        });
        
        // JWT validator
        this.customValidators.set('jwt', (value: string) => {
            const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
            return jwtRegex.test(value);
        });
    }
    
    private luhnCheck(value: string): boolean {
        let sum = 0;
        let isEven = false;
        
        for (let i = value.length - 1; i >= 0; i--) {
            let digit = parseInt(value[i], 10);
            
            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            
            sum += digit;
            isEven = !isEven;
        }
        
        return sum % 10 === 0;
    }
    
    private loadSchemas(): void {
        const schemaDir = path.join(process.cwd(), 'test', 'schemas');
        
        if (fs.existsSync(schemaDir)) {
            const files = fs.readdirSync(schemaDir);
            
            files.forEach(file => {
                if (file.endsWith('.json')) {
                    const schemaPath = path.join(schemaDir, file);
                    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
                    const name = path.basename(file, '.json');
                    
                    this.schemas.set(name, schema);
                    
                    if (schema.jsonSchema) {
                        this.ajv.addSchema(schema.jsonSchema, name);
                    }
                    
                    CSReporter.debug(`Loaded validation schema: ${name}`);
                }
            });
        }
    }
    
    public async validate(response: HttpResponse, schema: ValidationSchema | string): Promise<ValidationResult> {
        const startTime = Date.now();
        
        // Resolve schema if string provided
        const validationSchema = typeof schema === 'string' 
            ? this.schemas.get(schema) || {} 
            : schema;
        
        const result: ValidationResult = {
            valid: true,
            errors: [],
            warnings: [],
            summary: {
                totalChecks: 0,
                passed: 0,
                failed: 0,
                warnings: 0
            }
        };
        
        // Validate status code
        if (validationSchema.statusCode !== undefined) {
            result.summary.totalChecks++;
            const expectedCodes = Array.isArray(validationSchema.statusCode) 
                ? validationSchema.statusCode 
                : [validationSchema.statusCode];
            
            if (!expectedCodes.includes(response.status)) {
                result.errors.push({
                    field: 'statusCode',
                    expected: expectedCodes,
                    actual: response.status,
                    message: `Expected status code ${expectedCodes.join(' or ')}, got ${response.status}`,
                    type: 'enum'
                });
                result.summary.failed++;
                result.valid = false;
            } else {
                result.summary.passed++;
            }
        }
        
        // Validate response time
        if (validationSchema.responseTime !== undefined) {
            result.summary.totalChecks++;
            
            if (response.duration > validationSchema.responseTime) {
                result.warnings.push({
                    field: 'responseTime',
                    message: `Response time ${response.duration}ms exceeds threshold ${validationSchema.responseTime}ms`,
                    suggestion: 'Consider optimizing the API endpoint or increasing timeout'
                });
                result.summary.warnings++;
            } else {
                result.summary.passed++;
            }
        }
        
        // Validate headers
        if (validationSchema.headers) {
            const headerResults = this.validateHeaders(response.headers, validationSchema.headers);
            result.errors.push(...headerResults.errors);
            result.warnings.push(...headerResults.warnings);
            result.summary.totalChecks += headerResults.totalChecks;
            result.summary.passed += headerResults.passed;
            result.summary.failed += headerResults.failed;
            result.summary.warnings += headerResults.warningsCount;
            
            if (headerResults.errors.length > 0) {
                result.valid = false;
            }
        }
        
        // Validate body
        if (validationSchema.body) {
            const bodyResults = this.validateBody(response.body, validationSchema.body);
            result.errors.push(...bodyResults.errors);
            result.warnings.push(...bodyResults.warnings);
            result.summary.totalChecks += bodyResults.totalChecks;
            result.summary.passed += bodyResults.passed;
            result.summary.failed += bodyResults.failed;
            result.summary.warnings += bodyResults.warningsCount;
            
            if (bodyResults.errors.length > 0) {
                result.valid = false;
            }
        }
        
        // Validate with JSON Schema
        if (validationSchema.jsonSchema) {
            result.summary.totalChecks++;
            
            const schemaName = typeof schema === 'string' ? schema : 'inline';
            const valid = this.ajv.validate(schemaName, response.body);
            
            if (!valid) {
                this.ajv.errors.forEach((error: any) => {
                    result.errors.push({
                        field: error.instancePath || 'body',
                        expected: error.params,
                        actual: error.data,
                        message: error.message || 'Schema validation failed',
                        type: 'schema'
                    });
                });
                result.summary.failed++;
                result.valid = false;
            } else {
                result.summary.passed++;
            }
        }
        
        // Log validation result
        const duration = Date.now() - startTime;
        
        if (result.valid) {
            CSReporter.pass(`API validation passed (${duration}ms): ${result.summary.passed}/${result.summary.totalChecks} checks`);
        } else {
            CSReporter.fail(`API validation failed (${duration}ms): ${result.summary.failed} errors, ${result.summary.warnings} warnings`);
            result.errors.forEach(error => {
                CSReporter.error(`  - ${error.field}: ${error.message}`);
            });
        }
        
        if (result.warnings.length > 0) {
            result.warnings.forEach(warning => {
                CSReporter.warn(`  - ${warning.field}: ${warning.message}`);
            });
        }
        
        // Store in history
        this.validationHistory.push(result);
        
        return result;
    }
    
    private validateHeaders(headers: Record<string, string>, rules: Record<string, ValidationRule>): any {
        const result = {
            errors: [] as ValidationError[],
            warnings: [] as ValidationWarning[],
            totalChecks: 0,
            passed: 0,
            failed: 0,
            warningsCount: 0
        };
        
        Object.entries(rules).forEach(([headerName, rule]) => {
            result.totalChecks++;
            const headerValue = headers[headerName.toLowerCase()];
            
            // Check required
            if (rule.required && !headerValue) {
                result.errors.push({
                    field: `headers.${headerName}`,
                    expected: 'present',
                    actual: 'missing',
                    message: `Required header '${headerName}' is missing`,
                    type: 'required'
                });
                result.failed++;
                return;
            }
            
            if (headerValue) {
                const fieldResult = this.validateField(headerValue, rule, `headers.${headerName}`);
                
                if (fieldResult.error) {
                    result.errors.push(fieldResult.error);
                    result.failed++;
                } else {
                    result.passed++;
                }
                
                if (fieldResult.warning) {
                    result.warnings.push(fieldResult.warning);
                    result.warningsCount++;
                }
            } else {
                result.passed++;
            }
        });
        
        return result;
    }
    
    private validateBody(body: any, rules: Record<string, ValidationRule> | ValidationRule[]): any {
        const result = {
            errors: [] as ValidationError[],
            warnings: [] as ValidationWarning[],
            totalChecks: 0,
            passed: 0,
            failed: 0,
            warningsCount: 0
        };
        
        if (Array.isArray(rules)) {
            // Validate array body
            if (!Array.isArray(body)) {
                result.errors.push({
                    field: 'body',
                    expected: 'array',
                    actual: typeof body,
                    message: 'Expected response body to be an array',
                    type: 'type'
                });
                result.failed++;
                return result;
            }
            
            // Validate each item
            body.forEach((item, index) => {
                rules.forEach(rule => {
                    result.totalChecks++;
                    const fieldResult = this.validateField(item, rule, `body[${index}]`);
                    
                    if (fieldResult.error) {
                        result.errors.push(fieldResult.error);
                        result.failed++;
                    } else {
                        result.passed++;
                    }
                });
            });
        } else {
            // Validate object body
            Object.entries(rules).forEach(([fieldPath, rule]) => {
                result.totalChecks++;
                const fieldValue = this.getNestedValue(body, fieldPath);
                
                // Check required
                if (rule.required && fieldValue === undefined) {
                    result.errors.push({
                        field: `body.${fieldPath}`,
                        expected: 'present',
                        actual: 'missing',
                        message: `Required field '${fieldPath}' is missing`,
                        type: 'required'
                    });
                    result.failed++;
                    return;
                }
                
                if (fieldValue !== undefined) {
                    const fieldResult = this.validateField(fieldValue, rule, `body.${fieldPath}`);
                    
                    if (fieldResult.error) {
                        result.errors.push(fieldResult.error);
                        result.failed++;
                    } else {
                        result.passed++;
                    }
                    
                    if (fieldResult.warning) {
                        result.warnings.push(fieldResult.warning);
                        result.warningsCount++;
                    }
                } else if (!rule.required) {
                    result.passed++;
                }
            });
        }
        
        return result;
    }
    
    private validateField(value: any, rule: ValidationRule, fieldPath: string): { error?: ValidationError; warning?: ValidationWarning } {
        // Type validation
        if (rule.type && typeof value !== rule.type) {
            if (!(rule.type === 'array' && Array.isArray(value))) {
                return {
                    error: {
                        field: fieldPath,
                        expected: rule.type,
                        actual: typeof value,
                        message: rule.message || `Expected type '${rule.type}', got '${typeof value}'`,
                        type: 'type'
                    }
                };
            }
        }
        
        // Pattern validation
        if (rule.pattern && typeof value === 'string') {
            const regex = rule.pattern instanceof RegExp ? rule.pattern : new RegExp(rule.pattern);
            if (!regex.test(value)) {
                return {
                    error: {
                        field: fieldPath,
                        expected: rule.pattern.toString(),
                        actual: value,
                        message: rule.message || `Value does not match pattern ${rule.pattern}`,
                        type: 'pattern'
                    }
                };
            }
        }
        
        // Length validation for strings
        if (typeof value === 'string') {
            if (rule.minLength !== undefined && value.length < rule.minLength) {
                return {
                    error: {
                        field: fieldPath,
                        expected: `>= ${rule.minLength}`,
                        actual: value.length,
                        message: rule.message || `String length ${value.length} is less than minimum ${rule.minLength}`,
                        type: 'range'
                    }
                };
            }
            
            if (rule.maxLength !== undefined && value.length > rule.maxLength) {
                return {
                    error: {
                        field: fieldPath,
                        expected: `<= ${rule.maxLength}`,
                        actual: value.length,
                        message: rule.message || `String length ${value.length} exceeds maximum ${rule.maxLength}`,
                        type: 'range'
                    }
                };
            }
        }
        
        // Numeric range validation
        if (typeof value === 'number') {
            if (rule.minimum !== undefined && value < rule.minimum) {
                return {
                    error: {
                        field: fieldPath,
                        expected: `>= ${rule.minimum}`,
                        actual: value,
                        message: rule.message || `Value ${value} is less than minimum ${rule.minimum}`,
                        type: 'range'
                    }
                };
            }
            
            if (rule.maximum !== undefined && value > rule.maximum) {
                return {
                    error: {
                        field: fieldPath,
                        expected: `<= ${rule.maximum}`,
                        actual: value,
                        message: rule.message || `Value ${value} exceeds maximum ${rule.maximum}`,
                        type: 'range'
                    }
                };
            }
        }
        
        // Enum validation
        if (rule.enum && !rule.enum.includes(value)) {
            return {
                error: {
                    field: fieldPath,
                    expected: rule.enum,
                    actual: value,
                    message: rule.message || `Value must be one of: ${rule.enum.join(', ')}`,
                    type: 'enum'
                }
            };
        }
        
        // Custom validation
        if (rule.custom) {
            try {
                const isValid = rule.custom(value);
                if (!isValid) {
                    return {
                        error: {
                            field: fieldPath,
                            expected: 'custom validation to pass',
                            actual: value,
                            message: rule.message || 'Custom validation failed',
                            type: 'custom'
                        }
                    };
                }
            } catch (error: any) {
                return {
                    error: {
                        field: fieldPath,
                        expected: 'custom validation to pass',
                        actual: value,
                        message: error.message || 'Custom validation error',
                        type: 'custom'
                    }
                };
            }
        }
        
        return {};
    }
    
    private getNestedValue(obj: any, path: string): any {
        const keys = path.split('.');
        let value = obj;
        
        for (const key of keys) {
            if (value === null || value === undefined) {
                return undefined;
            }
            
            // Handle array index
            const arrayMatch = key.match(/^(.+)\[(\d+)\]$/);
            if (arrayMatch) {
                const [, arrayKey, index] = arrayMatch;
                value = value[arrayKey];
                if (Array.isArray(value)) {
                    value = value[parseInt(index, 10)];
                } else {
                    return undefined;
                }
            } else {
                value = value[key];
            }
        }
        
        return value;
    }
    
    // Builder methods for fluent API
    public expectStatus(status: number | number[]): CSAPIValidator {
        // Store expectation for chaining
        return this;
    }
    
    public expectHeader(name: string, value?: string | RegExp): CSAPIValidator {
        // Store expectation for chaining
        return this;
    }
    
    public expectBody(schema: any): CSAPIValidator {
        // Store expectation for chaining
        return this;
    }
    
    public expectResponseTime(maxMs: number): CSAPIValidator {
        // Store expectation for chaining
        return this;
    }
    
    // Schema management
    public registerSchema(name: string, schema: ValidationSchema): void {
        this.schemas.set(name, schema);
        
        if (schema.jsonSchema) {
            this.ajv.addSchema(schema.jsonSchema, name);
        }
        
        CSReporter.debug(`Registered validation schema: ${name}`);
    }
    
    public getSchema(name: string): ValidationSchema | undefined {
        return this.schemas.get(name);
    }
    
    public removeSchema(name: string): void {
        this.schemas.delete(name);
        this.ajv.removeSchema(name);
    }
    
    // Custom validator management
    public registerValidator(name: string, validator: Function): void {
        this.customValidators.set(name, validator);
        CSReporter.debug(`Registered custom validator: ${name}`);
    }
    
    public getValidator(name: string): Function | undefined {
        return this.customValidators.get(name);
    }
    
    // Contract testing
    public async validateContract(response: HttpResponse, contractFile: string): Promise<ValidationResult> {
        const contractPath = path.join(process.cwd(), 'test', 'contracts', contractFile);
        
        if (!fs.existsSync(contractPath)) {
            throw new Error(`Contract file not found: ${contractPath}`);
        }
        
        const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
        return this.validate(response, contract);
    }
    
    // Snapshot testing
    public async validateSnapshot(response: HttpResponse, snapshotName: string): Promise<ValidationResult> {
        const snapshotPath = path.join(process.cwd(), 'test', 'snapshots', `${snapshotName}.json`);
        
        if (!fs.existsSync(snapshotPath)) {
            // Create initial snapshot
            this.saveSnapshot(response, snapshotName);
            CSReporter.info(`Created initial snapshot: ${snapshotName}`);
            
            return {
                valid: true,
                errors: [],
                warnings: [],
                summary: {
                    totalChecks: 1,
                    passed: 1,
                    failed: 0,
                    warnings: 0
                }
            };
        }
        
        const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
        const differences = this.compareSnapshots(snapshot, response);
        
        if (differences.length > 0) {
            return {
                valid: false,
                errors: differences.map(diff => ({
                    field: diff.path,
                    expected: diff.expected,
                    actual: diff.actual,
                    message: `Snapshot mismatch at ${diff.path}`,
                    type: 'schema' as const
                })),
                warnings: [],
                summary: {
                    totalChecks: differences.length,
                    passed: 0,
                    failed: differences.length,
                    warnings: 0
                }
            };
        }
        
        return {
            valid: true,
            errors: [],
            warnings: [],
            summary: {
                totalChecks: 1,
                passed: 1,
                failed: 0,
                warnings: 0
            }
        };
    }
    
    private saveSnapshot(response: HttpResponse, name: string): void {
        const snapshotDir = path.join(process.cwd(), 'test', 'snapshots');
        
        if (!fs.existsSync(snapshotDir)) {
            fs.mkdirSync(snapshotDir, { recursive: true });
        }
        
        const snapshot = {
            status: response.status,
            headers: response.headers,
            body: response.body,
            timestamp: new Date().toISOString()
        };
        
        fs.writeFileSync(
            path.join(snapshotDir, `${name}.json`),
            JSON.stringify(snapshot, null, 2)
        );
    }
    
    private compareSnapshots(snapshot: any, response: HttpResponse): any[] {
        const differences: any[] = [];
        
        // Compare status
        if (snapshot.status !== response.status) {
            differences.push({
                path: 'status',
                expected: snapshot.status,
                actual: response.status
            });
        }
        
        // Compare body
        this.deepCompare(snapshot.body, response.body, 'body', differences);
        
        return differences;
    }
    
    private deepCompare(expected: any, actual: any, path: string, differences: any[]): void {
        if (expected === actual) {
            return;
        }
        
        if (typeof expected !== typeof actual) {
            differences.push({ path, expected: typeof expected, actual: typeof actual });
            return;
        }
        
        if (Array.isArray(expected)) {
            if (!Array.isArray(actual)) {
                differences.push({ path, expected: 'array', actual: typeof actual });
                return;
            }
            
            if (expected.length !== actual.length) {
                differences.push({ 
                    path: `${path}.length`, 
                    expected: expected.length, 
                    actual: actual.length 
                });
            }
            
            const minLength = Math.min(expected.length, actual.length);
            for (let i = 0; i < minLength; i++) {
                this.deepCompare(expected[i], actual[i], `${path}[${i}]`, differences);
            }
        } else if (typeof expected === 'object' && expected !== null) {
            if (typeof actual !== 'object' || actual === null) {
                differences.push({ path, expected: 'object', actual: actual });
                return;
            }
            
            const allKeys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
            
            allKeys.forEach(key => {
                if (!(key in expected)) {
                    differences.push({ 
                        path: `${path}.${key}`, 
                        expected: 'undefined', 
                        actual: actual[key] 
                    });
                } else if (!(key in actual)) {
                    differences.push({ 
                        path: `${path}.${key}`, 
                        expected: expected[key], 
                        actual: 'undefined' 
                    });
                } else {
                    this.deepCompare(expected[key], actual[key], `${path}.${key}`, differences);
                }
            });
        } else if (expected !== actual) {
            differences.push({ path, expected, actual });
        }
    }
    
    // Validation history
    public getValidationHistory(): ValidationResult[] {
        return this.validationHistory;
    }
    
    public clearHistory(): void {
        this.validationHistory = [];
    }
    
    public getValidationStats(): any {
        const stats = {
            total: this.validationHistory.length,
            passed: 0,
            failed: 0,
            avgChecks: 0,
            avgErrors: 0,
            avgWarnings: 0
        };
        
        this.validationHistory.forEach(result => {
            if (result.valid) {
                stats.passed++;
            } else {
                stats.failed++;
            }
            
            stats.avgChecks += result.summary.totalChecks;
            stats.avgErrors += result.errors.length;
            stats.avgWarnings += result.warnings.length;
        });
        
        if (stats.total > 0) {
            stats.avgChecks /= stats.total;
            stats.avgErrors /= stats.total;
            stats.avgWarnings /= stats.total;
        }
        
        return stats;
    }
    
    // Configuration
    public setStrictMode(strict: boolean): void {
        this.strictMode = strict;
        CSReporter.debug(`Validation strict mode: ${strict}`);
    }
    
    public isStrictMode(): boolean {
        return this.strictMode;
    }
}