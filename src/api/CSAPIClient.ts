import * as https from 'https';
import * as http from 'http';
import { CSConfigurationManager } from '../core/CSConfigurationManager';
import { CSReporter } from '../reporter/CSReporter';

export interface APIRequest {
    url?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
    headers?: Record<string, string>;
    body?: any;
    queryParams?: Record<string, any>;
    timeout?: number;
    retryCount?: number;
    retryDelay?: number;
    validateStatus?: (status: number) => boolean;
}

export interface APIResponse {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: any;
    duration: number;
    request: APIRequest;
}

export class CSAPIClient {
    private static instance: CSAPIClient;
    private config: CSConfigurationManager;
    private baseURL: string;
    private defaultHeaders: Record<string, string>;
    private token: string | null = null;
    private requestChain: APIResponse[] = [];
    private variables: Map<string, any> = new Map();
    
    private constructor() {
        this.config = CSConfigurationManager.getInstance();
        this.baseURL = this.config.get('API_BASE_URL');
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'CS-Test-Framework/3.0'
        };
    }
    
    public static getInstance(): CSAPIClient {
        if (!CSAPIClient.instance) {
            CSAPIClient.instance = new CSAPIClient();
        }
        return CSAPIClient.instance;
    }
    
    public setBaseURL(url: string): void {
        this.baseURL = url;
    }
    
    public setDefaultHeader(key: string, value: string): void {
        this.defaultHeaders[key] = value;
    }
    
    public setToken(token: string): void {
        this.token = token;
        this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
    
    public async request(options: APIRequest): Promise<APIResponse> {
        const startTime = Date.now();
        
        // Build full URL
        const url = this.buildURL(options.url || '', options.queryParams);
        
        // Merge headers
        const headers = {
            ...this.defaultHeaders,
            ...options.headers
        };
        
        // Add token if available
        if (this.token && !headers['Authorization']) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        // Process body with variable substitution
        const body = this.processVariables(options.body);
        
        const requestOptions: APIRequest = {
            ...options,
            url,
            headers,
            body,
            timeout: options.timeout || this.config.getNumber('API_TIMEOUT', 30000),
            retryCount: options.retryCount || this.config.getNumber('API_RETRY_COUNT', 3),
            retryDelay: options.retryDelay || this.config.getNumber('API_RETRY_DELAY', 1000)
        };
        
        // Log request if configured
        if (this.config.getBoolean('API_LOG_REQUESTS', true)) {
            CSReporter.info(`API Request: ${options.method || 'GET'} ${url}`);
            CSReporter.debug(`Headers: ${JSON.stringify(headers)}`);
            if (body) {
                CSReporter.debug(`Body: ${JSON.stringify(body)}`);
            }
        }
        
        // Execute request with retry logic
        const response = await this.executeWithRetry(requestOptions);
        
        // Log response if configured
        if (this.config.getBoolean('API_LOG_RESPONSES', true)) {
            CSReporter.info(`API Response: ${response.status} ${response.statusText} (${response.duration}ms)`);
            CSReporter.debug(`Response Data: ${JSON.stringify(response.data)}`);
        }
        
        // Store in chain for reference
        this.requestChain.push(response);
        
        // Extract variables from response
        this.extractVariables(response);
        
        return response;
    }
    
    private async executeWithRetry(options: APIRequest): Promise<APIResponse> {
        let lastError: Error | null = null;
        const retryCount = options.retryCount || 3;
        const retryDelay = options.retryDelay || 1000;
        
        for (let attempt = 1; attempt <= retryCount; attempt++) {
            try {
                const response = await this.executeRequest(options);
                
                // Check if status is acceptable
                const validateStatus = options.validateStatus || ((status) => status >= 200 && status < 300);
                if (validateStatus(response.status)) {
                    return response;
                }
                
                // Status not acceptable, might retry
                if (attempt < retryCount) {
                    CSReporter.warn(`Request failed with status ${response.status}, retrying... (${attempt}/${retryCount})`);
                    await this.delay(retryDelay * attempt);
                    continue;
                }
                
                return response;
                
            } catch (error: any) {
                lastError = error;
                
                if (attempt < retryCount) {
                    CSReporter.warn(`Request failed: ${error.message}, retrying... (${attempt}/${retryCount})`);
                    await this.delay(retryDelay * attempt);
                } else {
                    throw error;
                }
            }
        }
        
        throw lastError || new Error('Request failed after retries');
    }
    
    private executeRequest(options: APIRequest): Promise<APIResponse> {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const url = new URL(options.url!);
            const isHttps = url.protocol === 'https:';
            const client = isHttps ? https : http;
            
            const requestOptions = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: options.method || 'GET',
                headers: options.headers,
                timeout: options.timeout
            };
            
            const req = client.request(requestOptions, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    const duration = Date.now() - startTime;
                    
                    let parsedData: any = data;
                    try {
                        if (res.headers['content-type']?.includes('application/json')) {
                            parsedData = JSON.parse(data);
                        }
                    } catch (error) {
                        // Keep as string if not JSON
                    }
                    
                    const response: APIResponse = {
                        status: res.statusCode || 0,
                        statusText: res.statusMessage || '',
                        headers: res.headers as Record<string, string>,
                        data: parsedData,
                        duration,
                        request: options
                    };
                    
                    resolve(response);
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            req.on('timeout', () => {
                req.destroy();
                reject(new Error(`Request timeout after ${options.timeout}ms`));
            });
            
            // Write body if present
            if (options.body) {
                const bodyData = typeof options.body === 'string' 
                    ? options.body 
                    : JSON.stringify(options.body);
                req.write(bodyData);
            }
            
            req.end();
        });
    }
    
    private buildURL(endpoint: string, queryParams?: Record<string, any>): string {
        // Build full URL
        let url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
        
        // Process variables in URL
        url = this.processVariables(url);
        
        // Add query parameters
        if (queryParams && Object.keys(queryParams).length > 0) {
            const params = new URLSearchParams();
            Object.entries(queryParams).forEach(([key, value]) => {
                params.append(key, String(value));
            });
            url += (url.includes('?') ? '&' : '?') + params.toString();
        }
        
        return url;
    }
    
    private processVariables(data: any): any {
        if (typeof data === 'string') {
            // Replace {{variable}} patterns
            return data.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
                return this.variables.get(varName) || match;
            });
        }
        
        if (typeof data === 'object' && data !== null) {
            if (Array.isArray(data)) {
                return data.map(item => this.processVariables(item));
            } else {
                const processed: any = {};
                Object.entries(data).forEach(([key, value]) => {
                    processed[key] = this.processVariables(value);
                });
                return processed;
            }
        }
        
        return data;
    }
    
    private extractVariables(response: APIResponse): void {
        // Auto-extract common patterns
        if (response.data) {
            // Extract ID fields
            if (response.data.id) {
                this.variables.set('lastId', response.data.id);
            }
            
            // Extract token
            if (response.data.token || response.data.access_token) {
                const token = response.data.token || response.data.access_token;
                this.variables.set('token', token);
                this.setToken(token);
            }
            
            // Extract user info
            if (response.data.user) {
                this.variables.set('userId', response.data.user.id);
                this.variables.set('username', response.data.user.username);
            }
        }
    }
    
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Convenience methods
    public async get(url: string, options?: Partial<APIRequest>): Promise<APIResponse> {
        return this.request({ ...options, url, method: 'GET' });
    }
    
    public async post(url: string, body?: any, options?: Partial<APIRequest>): Promise<APIResponse> {
        return this.request({ ...options, url, method: 'POST', body });
    }
    
    public async put(url: string, body?: any, options?: Partial<APIRequest>): Promise<APIResponse> {
        return this.request({ ...options, url, method: 'PUT', body });
    }
    
    public async patch(url: string, body?: any, options?: Partial<APIRequest>): Promise<APIResponse> {
        return this.request({ ...options, url, method: 'PATCH', body });
    }
    
    public async delete(url: string, options?: Partial<APIRequest>): Promise<APIResponse> {
        return this.request({ ...options, url, method: 'DELETE' });
    }
    
    // Request chaining methods
    public getLastResponse(): APIResponse | null {
        return this.requestChain[this.requestChain.length - 1] || null;
    }
    
    public getResponseChain(): APIResponse[] {
        return this.requestChain;
    }
    
    public clearChain(): void {
        this.requestChain = [];
    }
    
    // Variable management
    public setVariable(name: string, value: any): void {
        this.variables.set(name, value);
        CSReporter.debug(`Set variable: ${name} = ${value}`);
    }
    
    public getVariable(name: string): any {
        return this.variables.get(name);
    }
    
    public getAllVariables(): Map<string, any> {
        return new Map(this.variables);
    }
    
    public clearVariables(): void {
        this.variables.clear();
    }
    
    // Token auto-refresh
    public async refreshToken(refreshEndpoint: string, refreshToken?: string): Promise<void> {
        CSReporter.info('Refreshing API token');
        
        const response = await this.post(refreshEndpoint, {
            refresh_token: refreshToken || this.getVariable('refreshToken')
        });
        
        if (response.status === 200 && response.data.access_token) {
            this.setToken(response.data.access_token);
            
            if (response.data.refresh_token) {
                this.setVariable('refreshToken', response.data.refresh_token);
            }
            
            CSReporter.info('Token refreshed successfully');
        } else {
            throw new Error('Failed to refresh token');
        }
    }
    
    // Batch requests
    public async batch(requests: APIRequest[]): Promise<APIResponse[]> {
        CSReporter.info(`Executing batch of ${requests.length} requests`);
        
        const responses: APIResponse[] = [];
        
        for (const request of requests) {
            try {
                const response = await this.request(request);
                responses.push(response);
            } catch (error: any) {
                CSReporter.error(`Batch request failed: ${error.message}`);
                // Continue with other requests or throw based on config
                if (this.config.getBoolean('API_BATCH_FAIL_FAST', false)) {
                    throw error;
                }
            }
        }
        
        return responses;
    }
    
    // Parallel requests
    public async parallel(requests: APIRequest[]): Promise<APIResponse[]> {
        CSReporter.info(`Executing ${requests.length} requests in parallel`);
        
        const promises = requests.map(request => this.request(request));
        return Promise.all(promises);
    }
}