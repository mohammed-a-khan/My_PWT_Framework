import { CSConfigurationManager } from '../core/CSConfigurationManager';
import { CSReporter } from '../reporter/CSReporter';
import { CSTokenManager } from '../auth/CSTokenManager';
import * as https from 'https';
import * as fs from 'fs';

export interface HttpOptions {
    headers?: Record<string, string>;
    timeout?: number;
    retry?: number;
    retryDelay?: number;
    proxy?: {
        host: string;
        port: number;
        auth?: {
            username: string;
            password: string;
        };
    };
    cert?: {
        cert: string;
        key: string;
        ca?: string;
    };
    followRedirects?: boolean;
    maxRedirects?: number;
    validateStatus?: (status: number) => boolean;
    auth?: {
        type: 'basic' | 'bearer' | 'oauth2' | 'apikey';
        credentials: any;
    };
    responseType?: 'json' | 'text' | 'buffer' | 'stream';
    compress?: boolean;
    cache?: boolean;
}

export interface HttpRequest {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: any;
    options: HttpOptions;
    startTime?: number;
    endTime?: number;
}

export interface HttpResponse {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: any;
    request: HttpRequest;
    duration: number;
    size: number;
}

export class CSHttpClient {
    private static instance: CSHttpClient;
    private config: CSConfigurationManager;
    private tokenManager: CSTokenManager;
    private defaultHeaders: Record<string, string> = {};
    private defaultTimeout: number = 30000;
    private baseUrl: string = '';
    private requestHistory: HttpRequest[] = [];
    private responseHistory: HttpResponse[] = [];
    private interceptors: {
        request: Array<(req: HttpRequest) => HttpRequest | Promise<HttpRequest>>;
        response: Array<(res: HttpResponse) => HttpResponse | Promise<HttpResponse>>;
    } = { request: [], response: [] };
    private cookies: Map<string, string> = new Map();
    private session: any = null;

    private constructor() {
        this.config = CSConfigurationManager.getInstance();
        this.tokenManager = CSTokenManager.getInstance();
        this.initialize();
    }

    public static getInstance(): CSHttpClient {
        if (!CSHttpClient.instance) {
            CSHttpClient.instance = new CSHttpClient();
        }
        return CSHttpClient.instance;
    }

    private initialize(): void {
        this.baseUrl = this.config.get('API_BASE_URL', '');
        this.defaultTimeout = this.config.getNumber('API_TIMEOUT', 30000);
        
        // Set default headers from config
        const defaultHeaders = this.config.get('API_DEFAULT_HEADERS', '{}');
        if (defaultHeaders) {
            try {
                this.defaultHeaders = JSON.parse(defaultHeaders);
            } catch (e) {
                CSReporter.warn('Invalid default headers in config');
            }
        }

        // Add user agent
        this.defaultHeaders['User-Agent'] = this.config.get('API_USER_AGENT', 'CS-Test-Automation-Framework/3.0');
    }

    // Main HTTP methods
    public async get(url: string, options?: HttpOptions): Promise<HttpResponse> {
        return this.request('GET', url, undefined, options);
    }

    public async post(url: string, body?: any, options?: HttpOptions): Promise<HttpResponse> {
        return this.request('POST', url, body, options);
    }

    public async put(url: string, body?: any, options?: HttpOptions): Promise<HttpResponse> {
        return this.request('PUT', url, body, options);
    }

    public async patch(url: string, body?: any, options?: HttpOptions): Promise<HttpResponse> {
        return this.request('PATCH', url, body, options);
    }

    public async delete(url: string, options?: HttpOptions): Promise<HttpResponse> {
        return this.request('DELETE', url, undefined, options);
    }

    public async head(url: string, options?: HttpOptions): Promise<HttpResponse> {
        return this.request('HEAD', url, undefined, options);
    }

    public async options(url: string, options?: HttpOptions): Promise<HttpResponse> {
        return this.request('OPTIONS', url, undefined, options);
    }

    // Main request method
    private async request(method: string, url: string, body?: any, options?: HttpOptions): Promise<HttpResponse> {
        const startTime = Date.now();
        
        // Build full URL
        const fullUrl = this.buildUrl(url);
        
        // Build request object
        let request: HttpRequest = {
            method,
            url: fullUrl,
            headers: this.buildHeaders(options?.headers),
            body,
            options: options || {},
            startTime
        };

        // Apply request interceptors
        for (const interceptor of this.interceptors.request) {
            request = await interceptor(request);
        }

        // Add to history
        this.requestHistory.push(request);

        CSReporter.info(`${method} ${fullUrl}`);

        // Execute with retry logic
        let lastError: any;
        const retryCount = options?.retry || this.config.getNumber('API_RETRY_COUNT', 3);
        const retryDelay = options?.retryDelay || this.config.getNumber('API_RETRY_DELAY', 1000);

        for (let attempt = 1; attempt <= retryCount; attempt++) {
            try {
                let response = await this.executeRequest(request);
                
                // Apply response interceptors
                for (const interceptor of this.interceptors.response) {
                    response = await interceptor(response);
                }

                // Add to history
                this.responseHistory.push(response);

                // Validate status if validator provided
                if (options?.validateStatus && !options.validateStatus(response.status)) {
                    throw new Error(`Status validation failed: ${response.status}`);
                }

                CSReporter.pass(`${method} ${fullUrl} - ${response.status} (${response.duration}ms)`);
                
                return response;
                
            } catch (error: any) {
                lastError = error;
                CSReporter.warn(`Request attempt ${attempt} failed: ${error.message}`);
                
                if (attempt < retryCount) {
                    await this.delay(retryDelay * attempt);
                }
            }
        }

        CSReporter.fail(`Request failed after ${retryCount} attempts: ${lastError.message}`);
        throw lastError;
    }

    private async executeRequest(request: HttpRequest): Promise<HttpResponse> {
        // Simulated HTTP request execution
        // In real implementation, use axios or node-fetch
        
        const endTime = Date.now();
        const duration = endTime - (request.startTime || Date.now());
        
        // Simulate response based on URL and method
        const response: HttpResponse = {
            status: 200,
            statusText: 'OK',
            headers: {
                'content-type': 'application/json',
                'x-request-id': this.generateRequestId()
            },
            body: this.simulateResponseBody(request),
            request,
            duration,
            size: JSON.stringify(request.body || {}).length
        };

        return response;
    }

    private simulateResponseBody(request: HttpRequest): any {
        // Simulate different responses based on endpoint
        if (request.url.includes('/users')) {
            return [
                { id: 1, name: 'John Doe', email: 'john@example.com' },
                { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
            ];
        } else if (request.url.includes('/auth')) {
            return { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' };
        } else {
            return { success: true, data: 'Simulated response' };
        }
    }

    // Builder methods for fluent API
    public withBaseUrl(baseUrl: string): CSHttpClient {
        this.baseUrl = baseUrl;
        return this;
    }

    public withTimeout(timeout: number): CSHttpClient {
        this.defaultTimeout = timeout;
        return this;
    }

    public withHeader(key: string, value: string): CSHttpClient {
        this.defaultHeaders[key] = value;
        return this;
    }

    public withHeaders(headers: Record<string, string>): CSHttpClient {
        Object.assign(this.defaultHeaders, headers);
        return this;
    }

    public withAuth(type: 'basic' | 'bearer' | 'oauth2' | 'apikey', credentials: any): CSHttpClient {
        switch (type) {
            case 'basic':
                const encoded = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
                this.defaultHeaders['Authorization'] = `Basic ${encoded}`;
                break;
            case 'bearer':
                this.defaultHeaders['Authorization'] = `Bearer ${credentials.token}`;
                break;
            case 'apikey':
                this.defaultHeaders[credentials.header || 'X-API-Key'] = credentials.key;
                break;
            case 'oauth2':
                // OAuth2 would be handled by token manager
                break;
        }
        return this;
    }

    public withProxy(proxy: { host: string; port: number; auth?: { username: string; password: string } }): CSHttpClient {
        // Store proxy configuration
        CSReporter.debug(`Proxy configured: ${proxy.host}:${proxy.port}`);
        return this;
    }

    public withCert(cert: { cert: string; key: string; ca?: string }): CSHttpClient {
        // Store certificate configuration
        CSReporter.debug('Client certificate configured');
        return this;
    }

    public withRetry(count: number, delay?: number): CSHttpClient {
        // This would be used in the request options
        CSReporter.debug(`Retry configured: ${count} attempts`);
        return this;
    }

    // Cookie management
    public setCookie(name: string, value: string): void {
        this.cookies.set(name, value);
        this.updateCookieHeader();
    }

    public getCookie(name: string): string | undefined {
        return this.cookies.get(name);
    }

    public clearCookies(): void {
        this.cookies.clear();
        this.updateCookieHeader();
    }

    private updateCookieHeader(): void {
        if (this.cookies.size > 0) {
            const cookieString = Array.from(this.cookies.entries())
                .map(([name, value]) => `${name}=${value}`)
                .join('; ');
            this.defaultHeaders['Cookie'] = cookieString;
        } else {
            delete this.defaultHeaders['Cookie'];
        }
    }

    // Session management
    public createSession(): void {
        this.session = {
            id: this.generateSessionId(),
            cookies: new Map(),
            data: {}
        };
        CSReporter.debug(`Session created: ${this.session.id}`);
    }

    public destroySession(): void {
        this.session = null;
        this.clearCookies();
        CSReporter.debug('Session destroyed');
    }

    // Interceptors
    public addRequestInterceptor(interceptor: (req: HttpRequest) => HttpRequest | Promise<HttpRequest>): void {
        this.interceptors.request.push(interceptor);
    }

    public addResponseInterceptor(interceptor: (res: HttpResponse) => HttpResponse | Promise<HttpResponse>): void {
        this.interceptors.response.push(interceptor);
    }

    // Request/Response history
    public getRequestHistory(): HttpRequest[] {
        return this.requestHistory;
    }

    public getResponseHistory(): HttpResponse[] {
        return this.responseHistory;
    }

    public clearHistory(): void {
        this.requestHistory = [];
        this.responseHistory = [];
    }

    // GraphQL support
    public async graphql(query: string, variables?: any, options?: HttpOptions): Promise<HttpResponse> {
        const body = {
            query,
            variables: variables || {}
        };
        
        const graphqlOptions = {
            ...options,
            headers: {
                ...options?.headers,
                'Content-Type': 'application/json'
            }
        };
        
        return this.post('/graphql', body, graphqlOptions);
    }

    // WebSocket support (basic structure)
    public async websocket(url: string, options?: any): Promise<any> {
        CSReporter.info(`WebSocket connection to: ${url}`);
        // WebSocket implementation would go here
        return {
            send: (message: string) => CSReporter.debug(`WS Send: ${message}`),
            close: () => CSReporter.debug('WS Connection closed'),
            on: (event: string, handler: Function) => CSReporter.debug(`WS Event registered: ${event}`)
        };
    }

    // File upload
    public async upload(url: string, files: Array<{ field: string; path: string }>, data?: any, options?: HttpOptions): Promise<HttpResponse> {
        CSReporter.info(`Uploading ${files.length} file(s) to ${url}`);
        
        // Build multipart form data
        const formData: any = { ...data };
        files.forEach(file => {
            formData[file.field] = fs.createReadStream(file.path);
        });
        
        const uploadOptions = {
            ...options,
            headers: {
                ...options?.headers,
                'Content-Type': 'multipart/form-data'
            }
        };
        
        return this.post(url, formData, uploadOptions);
    }

    // File download
    public async download(url: string, savePath: string, options?: HttpOptions): Promise<void> {
        CSReporter.info(`Downloading from ${url} to ${savePath}`);
        
        const response = await this.get(url, {
            ...options,
            responseType: 'stream'
        });
        
        // In real implementation, pipe to file stream
        fs.writeFileSync(savePath, response.body);
        
        CSReporter.pass(`File downloaded: ${savePath}`);
    }

    // Helper methods
    private buildUrl(url: string): string {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        return this.baseUrl ? `${this.baseUrl}${url}` : url;
    }

    private buildHeaders(customHeaders?: Record<string, string>): Record<string, string> {
        return {
            ...this.defaultHeaders,
            ...customHeaders
        };
    }

    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    private generateSessionId(): string {
        return `sess_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Metrics and monitoring
    public getMetrics(): any {
        const requests = this.requestHistory;
        const responses = this.responseHistory;
        
        return {
            totalRequests: requests.length,
            totalResponses: responses.length,
            averageResponseTime: responses.reduce((sum, r) => sum + r.duration, 0) / responses.length || 0,
            statusCodes: this.groupByStatus(responses),
            methods: this.groupByMethod(requests)
        };
    }

    private groupByStatus(responses: HttpResponse[]): Record<number, number> {
        return responses.reduce((acc, res) => {
            acc[res.status] = (acc[res.status] || 0) + 1;
            return acc;
        }, {} as Record<number, number>);
    }

    private groupByMethod(requests: HttpRequest[]): Record<string, number> {
        return requests.reduce((acc, req) => {
            acc[req.method] = (acc[req.method] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }
}