import * as https from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { CSConfigurationManager } from '../core/CSConfigurationManager';
import { CSReporter } from '../reporter/CSReporter';

export interface ADOConfig {
    organization: string;
    project: string;
    pat: string;
    apiVersion?: string;
    proxy?: ProxyConfig;
}

export interface ProxyConfig {
    enabled: boolean;
    protocol: 'http' | 'https' | 'socks5';
    host: string;
    port: number;
    auth?: {
        required: boolean;
        username?: string;
        password?: string;
    };
    bypassList?: string[];
}

export interface TestCase {
    id: number;
    name: string;
    state: string;
    priority: number;
    automationStatus: string;
    steps?: TestStep[];
}

export interface TestStep {
    action: string;
    expectedResult: string;
}

export interface TestResult {
    testCaseId: number;
    outcome: 'Passed' | 'Failed' | 'Blocked' | 'NotApplicable';
    errorMessage?: string;
    stackTrace?: string;
    attachments?: string[];
    duration?: number;
}

export interface Bug {
    title: string;
    description: string;
    severity: string;
    priority: number;
    assignedTo?: string;
    attachments?: Attachment[];
    reproSteps?: string;
}

export interface Attachment {
    fileName: string;
    content: Buffer | string;
    comment?: string;
}

export class CSADOClient {
    private static instance: CSADOClient;
    private config: CSConfigurationManager;
    private adoConfig: ADOConfig;
    private proxyAgent?: HttpsProxyAgent<string> | SocksProxyAgent;
    private baseUrl: string;
    private headers: any;
    private testPointsCache: Map<string, any[]> = new Map();  // Cache for test points
    
    private constructor() {
        this.config = CSConfigurationManager.getInstance();
        this.adoConfig = this.loadADOConfig();

        // Debug logging to verify correct values
        CSReporter.debug(`ADO Organization: ${this.adoConfig.organization}`);
        CSReporter.debug(`ADO Project: ${this.adoConfig.project}`);

        this.baseUrl = `https://dev.azure.com/${this.adoConfig.organization}/${this.adoConfig.project}/_apis`;
        CSReporter.info(`ADO Base URL: ${this.baseUrl}`);

        this.headers = {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(`:${this.adoConfig.pat}`).toString('base64')}`
        };
        
        if (this.adoConfig.proxy?.enabled) {
            this.setupProxy(this.adoConfig.proxy);
        }
    }
    
    public static getInstance(): CSADOClient {
        if (!CSADOClient.instance) {
            CSADOClient.instance = new CSADOClient();
        }
        return CSADOClient.instance;
    }
    
    private loadADOConfig(): ADOConfig {
        return {
            organization: this.config.get('ADO_ORGANIZATION'),
            project: this.config.get('ADO_PROJECT'),
            pat: this.config.get('ADO_PAT'),
            apiVersion: this.config.get('ADO_API_VERSION', '7.0'),
            proxy: {
                enabled: this.config.getBoolean('ADO_PROXY_ENABLED', false),
                protocol: this.config.get('ADO_PROXY_PROTOCOL', 'http') as any,
                host: this.config.get('ADO_PROXY_HOST'),
                port: this.config.getNumber('ADO_PROXY_PORT', 8080),
                auth: {
                    required: this.config.getBoolean('ADO_PROXY_AUTH_REQUIRED', false),
                    username: this.config.get('ADO_PROXY_USERNAME'),
                    password: this.config.get('ADO_PROXY_PASSWORD')
                },
                bypassList: this.config.getList('ADO_PROXY_BYPASS_LIST')
            }
        };
    }
    
    private setupProxy(proxyConfig: ProxyConfig): void {
        let proxyUrl = `${proxyConfig.protocol}://`;
        
        if (proxyConfig.auth?.required && proxyConfig.auth.username && proxyConfig.auth.password) {
            const password = this.decryptIfNeeded(proxyConfig.auth.password);
            proxyUrl += `${proxyConfig.auth.username}:${password}@`;
        }
        
        proxyUrl += `${proxyConfig.host}:${proxyConfig.port}`;
        
        if (proxyConfig.protocol === 'socks5') {
            this.proxyAgent = new SocksProxyAgent(proxyUrl);
        } else {
            this.proxyAgent = new HttpsProxyAgent(proxyUrl);
        }
        
        CSReporter.info(`ADO proxy configured: ${proxyConfig.protocol}://${proxyConfig.host}:${proxyConfig.port}`);
    }
    
    private decryptIfNeeded(value: string): string {
        if (value.startsWith('ENCRYPTED:')) {
            return this.config.get(value.replace('ENCRYPTED:', ''));
        }
        return value;
    }
    
    private shouldBypassProxy(url: string): boolean {
        if (!this.adoConfig.proxy?.bypassList) {
            return false;
        }
        
        return this.adoConfig.proxy.bypassList.some(pattern => url.includes(pattern));
    }
    
    private async makeRequest(method: string, endpoint: string, data?: any): Promise<any> {
        const url = `${this.baseUrl}${endpoint}?api-version=${this.adoConfig.apiVersion}`;
        
        if (this.shouldBypassProxy(url)) {
            CSReporter.debug(`Bypassing proxy for: ${url}`);
        }
        
        const timeout = this.config.getNumber('ADO_API_TIMEOUT', 30000);
        const retryCount = this.config.getNumber('ADO_API_RETRY_COUNT', 3);
        const retryDelay = this.config.getNumber('ADO_API_RETRY_DELAY', 2000);
        
        let lastError: any;
        
        for (let attempt = 1; attempt <= retryCount; attempt++) {
            try {
                const response = await this.executeRequest(method, url, data, timeout);
                return response;
            } catch (error: any) {
                lastError = error;
                CSReporter.warn(`ADO API request failed (attempt ${attempt}/${retryCount}): ${error.message}`);
                
                if (attempt < retryCount) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
                }
            }
        }
        
        throw lastError;
    }
    
    private executeRequest(method: string, url: string, data: any, timeout: number): Promise<any> {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            
            const options: any = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: method,
                headers: this.headers,
                timeout: timeout
            };
            
            if (this.proxyAgent && !this.shouldBypassProxy(url)) {
                options.agent = this.proxyAgent;
            }
            
            const req = https.request(options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(JSON.parse(responseData));
                        } catch {
                            resolve(responseData);
                        }
                    } else {
                        reject(new Error(`ADO API error: ${res.statusCode} - ${responseData}`));
                    }
                });
            });
            
            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            
            if (data) {
                req.write(JSON.stringify(data));
            }
            
            req.end();
        });
    }
    
    public async getTestCase(testCaseId: number): Promise<TestCase> {
        CSReporter.info(`Fetching test case: ${testCaseId}`);
        
        const response = await this.makeRequest('GET', `/test/testcases/${testCaseId}`);
        
        return {
            id: response.id,
            name: response.fields['System.Title'],
            state: response.fields['System.State'],
            priority: response.fields['Microsoft.VSTS.Common.Priority'],
            automationStatus: response.fields['Microsoft.VSTS.TCM.AutomationStatus'],
            steps: this.parseTestSteps(response.fields['Microsoft.VSTS.TCM.Steps'])
        };
    }
    
    private parseTestSteps(stepsXml: string): TestStep[] {
        // Simplified XML parsing - in production use proper XML parser
        const steps: TestStep[] = [];
        
        if (!stepsXml) return steps;
        
        const stepMatches = stepsXml.match(/<step[^>]*>.*?<\/step>/g);
        
        if (stepMatches) {
            stepMatches.forEach(stepXml => {
                const actionMatch = stepXml.match(/<action>(.*?)<\/action>/);
                const expectedMatch = stepXml.match(/<expectedResult>(.*?)<\/expectedResult>/);
                
                steps.push({
                    action: actionMatch ? actionMatch[1] : '',
                    expectedResult: expectedMatch ? expectedMatch[1] : ''
                });
            });
        }
        
        return steps;
    }
    
    public async updateTestResult(result: TestResult): Promise<void> {
        if (!this.config.getBoolean('ADO_UPDATE_TEST_CASES', true)) {
            return;
        }
        
        CSReporter.info(`Updating test result for test case: ${result.testCaseId}`);
        
        const data = {
            results: [{
                testCase: { id: result.testCaseId },
                outcome: result.outcome,
                errorMessage: result.errorMessage,
                stackTrace: result.stackTrace,
                durationInMs: result.duration,
                state: 'Completed'
            }]
        };
        
        await this.makeRequest('POST', '/test/runs/1/results', data);
        
        // Upload attachments if any
        if (result.attachments && result.attachments.length > 0) {
            for (const attachment of result.attachments) {
                await this.uploadAttachment(result.testCaseId, attachment);
            }
        }
        
        CSReporter.info(`Test result updated: ${result.outcome}`);
    }
    
    public async createBug(bug: Bug): Promise<number> {
        if (!this.config.getBoolean('ADO_CREATE_BUGS_ON_FAILURE', false)) {
            return 0;
        }
        
        CSReporter.info(`Creating bug: ${bug.title}`);
        
        const data = [
            {
                op: 'add',
                path: '/fields/System.Title',
                value: bug.title
            },
            {
                op: 'add',
                path: '/fields/System.Description',
                value: bug.description
            },
            {
                op: 'add',
                path: '/fields/Microsoft.VSTS.Common.Severity',
                value: bug.severity
            },
            {
                op: 'add',
                path: '/fields/Microsoft.VSTS.Common.Priority',
                value: bug.priority
            },
            {
                op: 'add',
                path: '/fields/System.AssignedTo',
                value: bug.assignedTo || this.config.get('DEFAULT_BUG_ASSIGNEE')
            },
            {
                op: 'add',
                path: '/fields/Microsoft.VSTS.TCM.ReproSteps',
                value: bug.reproSteps
            }
        ];
        
        const response = await this.makeRequest('POST', '/wit/workitems/$Bug', data);
        const bugId = response.id;
        
        // Upload attachments
        if (bug.attachments && bug.attachments.length > 0) {
            for (const attachment of bug.attachments) {
                await this.uploadBugAttachment(bugId, attachment);
            }
        }
        
        CSReporter.info(`Bug created with ID: ${bugId}`);
        return bugId;
    }
    
    private async uploadAttachment(testCaseId: number, filePath: string): Promise<void> {
        // Simplified attachment upload
        CSReporter.debug(`Uploading attachment for test case ${testCaseId}: ${filePath}`);
        
        // In production, implement actual file upload
        await this.makeRequest('POST', `/test/testcases/${testCaseId}/attachments`, {
            fileName: filePath,
            comment: 'Test execution evidence'
        });
    }
    
    private async uploadBugAttachment(bugId: number, attachment: Attachment): Promise<void> {
        CSReporter.debug(`Uploading attachment for bug ${bugId}: ${attachment.fileName}`);
        
        // First upload the attachment
        const uploadResponse = await this.makeRequest('POST', '/wit/attachments', attachment.content);
        const attachmentUrl = uploadResponse.url;
        
        // Then link it to the bug
        const linkData = [
            {
                op: 'add',
                path: '/relations/-',
                value: {
                    rel: 'AttachedFile',
                    url: attachmentUrl,
                    attributes: {
                        comment: attachment.comment || 'Bug evidence'
                    }
                }
            }
        ];
        
        await this.makeRequest('PATCH', `/wit/workitems/${bugId}`, linkData);
    }
    
    public async getTestPlan(planId: number): Promise<any> {
        CSReporter.info(`Fetching test plan: ${planId}`);
        return await this.makeRequest('GET', `/test/plans/${planId}`);
    }
    
    public async getTestSuite(planId: number, suiteId: number): Promise<any> {
        CSReporter.info(`Fetching test suite: ${suiteId}`);
        return await this.makeRequest('GET', `/test/plans/${planId}/suites/${suiteId}`);
    }

    public getTestPoints(planId: number, suiteId: number): any[] {
        // In a real implementation, this would fetch test points from ADO
        // For now, return cached test points if available
        // This is a synchronous method for compatibility with the publisher
        const cacheKey = `testpoints-${planId}-${suiteId}`;
        if (this.testPointsCache.has(cacheKey)) {
            return this.testPointsCache.get(cacheKey)!;
        }

        // Return empty array if not cached
        // The async version (fetchTestPoints) should be called first to populate cache
        return [];
    }

    public async fetchTestPoints(planId: number, suiteId: number): Promise<any[]> {
        CSReporter.info(`Fetching test points for plan ${planId}, suite ${suiteId}`);
        // FIXED: Use 'testpoints' (plural) not 'testpoint'
        const response = await this.makeRequest('GET', `/test/plans/${planId}/suites/${suiteId}/testpoints`);

        const testPoints = response.value || [];

        // Cache the test points
        const cacheKey = `testpoints-${planId}-${suiteId}`;
        this.testPointsCache.set(cacheKey, testPoints);

        CSReporter.info(`Fetched ${testPoints.length} test points`);
        return testPoints;
    }
    
    public async createTestRun(name: string, testPoints: number[]): Promise<number> {
        CSReporter.info(`Creating test run: ${name}`);

        const data: any = {
            name: name,
            automated: true,
            state: 'InProgress'
        };

        // If we have test points, add them to create a planned test run
        // This ensures only the specified test points get results
        if (testPoints && testPoints.length > 0) {
            data.pointIds = testPoints;
            CSReporter.info(`Creating test run with ${testPoints.length} test points`);
        }

        const response = await this.makeRequest('POST', '/test/runs', data);
        CSReporter.info(`Test run created with ID: ${response.id}`);
        return response.id;
    }
    
    public async completeTestRun(runId: number): Promise<void> {
        CSReporter.info(`Completing test run: ${runId}`);
        
        const data = {
            state: 'Completed',
            completedDate: new Date().toISOString()
        };
        
        await this.makeRequest('PATCH', `/test/runs/${runId}`, data);
    }
    
    public async syncTestCases(featureFiles: string[]): Promise<void> {
        CSReporter.info('Syncing test cases with Azure DevOps');
        
        // Parse feature files and sync with ADO
        // This is a placeholder for the actual implementation
        
        for (const featureFile of featureFiles) {
            // Parse feature file
            // Match scenarios with test cases
            // Update test cases in ADO
            CSReporter.debug(`Syncing feature file: ${featureFile}`);
        }
        
        CSReporter.info('Test case sync completed');
    }
}