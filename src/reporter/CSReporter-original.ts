import * as fs from 'fs';
import * as path from 'path';
import { CSConfigurationManager } from '../core/CSConfigurationManager';
import { CSHTMLReporter, TestResult as HTMLTestResult, StepResult as HTMLStepResult, ActionDetail } from './CSHTMLReporter';
import { CSEnterpriseReporter } from './CSEnterpriseReporter';

export interface TestResult {
    name: string;
    status: 'pass' | 'fail' | 'skip' | 'pending';
    duration: number;
    error?: string;
    screenshot?: string;
    video?: string;
    timestamp: string;
    steps: StepResult[];
}

export interface StepResult {
    name: string;
    status: 'pass' | 'fail' | 'skip';
    duration: number;
    error?: string;
    screenshot?: string;
    timestamp: string;
}

export class CSReporter {
    private static results: TestResult[] = [];
    private static currentTest: TestResult | null = null;
    private static currentStep: StepResult | null = null;
    private static config: CSConfigurationManager | null = null;
    private static startTime: number = Date.now();
    private static logBuffer: string[] = [];
    private static reportPath: string = '';
    private static htmlReporter: CSHTMLReporter | null = null;
    private static enterpriseReporter: CSEnterpriseReporter | null = null;
    private static htmlTestResult: HTMLTestResult | null = null;
    
    private static getConfig(): CSConfigurationManager {
        if (!this.config) {
            this.config = CSConfigurationManager.getInstance();
        }
        return this.config;
    }
    
    private static getHtmlReporter(): CSHTMLReporter {
        if (!this.htmlReporter) {
            this.htmlReporter = new CSHTMLReporter();
        }
        return this.htmlReporter;
    }
    
    private static getEnterpriseReporter(): CSEnterpriseReporter {
        if (!this.enterpriseReporter) {
            this.enterpriseReporter = new CSEnterpriseReporter();
        }
        return this.enterpriseReporter;
    }

    public static initialize(): void {
        const reportDir = this.getConfig().get('REPORT_OUTPUT_DIR', './reports');
        const timestamp = new Date().toISOString().replace(/[:]/g, '-').split('.')[0];
        const project = this.getConfig().get('PROJECT', 'unknown');
        const env = this.getConfig().get('ENVIRONMENT', 'unknown');
        
        this.reportPath = path.join(reportDir, `${project}_${env}_${timestamp}`);
        
        // Create report directory
        if (!fs.existsSync(this.reportPath)) {
            fs.mkdirSync(this.reportPath, { recursive: true });
        }
        
        // Initialize log file
        if (this.getConfig().getBoolean('LOG_TO_FILE', true)) {
            const logPath = path.join(this.reportPath, 'execution.log');
            fs.writeFileSync(logPath, `Test Execution Started: ${new Date().toISOString()}\n`);
        }
    }

    public static startTest(name: string, feature?: string, tags?: string[]): void {
        const startTime = new Date();
        this.currentTest = {
            name,
            status: 'pending',
            duration: 0,
            timestamp: startTime.toISOString(),
            steps: []
        };
        
        // Create HTML test result
        this.htmlTestResult = {
            feature: feature || 'Default Feature',
            scenario: name,
            status: 'pending',
            duration: 0,
            startTime: startTime.toISOString(),
            endTime: '',
            steps: [],
            tags: tags || [],
            screenshots: [],
            videos: [],
            consoleLogs: [],
            networkLogs: [],
            browserInfo: {
                browser: this.getConfig().get('BROWSER'),
                version: this.getConfig().get('BROWSER_VERSION'),
                headless: this.getConfig().getBoolean('HEADLESS'),
                viewport: {
                    width: this.getConfig().getNumber('BROWSER_VIEWPORT_WIDTH'),
                    height: this.getConfig().getNumber('BROWSER_VIEWPORT_HEIGHT')
                }
            }
        };
        
        this.info(`Starting test: ${name}`);
    }

    public static endTest(status: 'pass' | 'fail' | 'skip', error?: string): void {
        if (!this.currentTest) return;
        
        this.currentTest.status = status;
        this.currentTest.duration = Date.now() - Date.parse(this.currentTest.timestamp);
        
        if (error) {
            this.currentTest.error = error;
        }
        
        // Take screenshot on failure if configured
        if (status === 'fail' && this.getConfig().getBoolean('SCREENSHOT_ON_FAILURE', true)) {
            this.captureScreenshot(`test_${this.currentTest.name}_failure`);
        }
        
        // Update HTML test result
        if (this.htmlTestResult) {
            this.htmlTestResult.status = status === 'pass' ? 'passed' : status === 'fail' ? 'failed' : 'skipped';
            this.htmlTestResult.duration = this.currentTest.duration;
            this.htmlTestResult.endTime = new Date().toISOString();
            if (error) {
                this.htmlTestResult.error = error;
            }
            this.getHtmlReporter().addTestResult(this.htmlTestResult);
        }
        
        this.results.push(this.currentTest);
        
        // Convert and add to enterprise reporter
        const enterpriseResult = this.convertToEnterpriseResult(this.currentTest);
        this.getEnterpriseReporter().addTestResult(enterpriseResult);
        
        this.info(`Test ${status}: ${this.currentTest.name} (${this.currentTest.duration}ms)`);
        
        this.currentTest = null;
        this.htmlTestResult = null;
    }

    public static startStep(name: string): void {
        this.currentStep = {
            name,
            status: 'pass',
            duration: 0,
            timestamp: new Date().toISOString()
        };
        
        this.debug(`  Step: ${name}`);
    }

    public static endStep(status: 'pass' | 'fail' | 'skip', error?: string): void {
        if (!this.currentStep || !this.currentTest) return;
        
        this.currentStep.status = status;
        this.currentStep.duration = Date.now() - Date.parse(this.currentStep.timestamp);
        
        if (error) {
            this.currentStep.error = error;
        }
        
        // Take screenshot if configured
        const screenshotMode = this.getConfig().get('BROWSER_SCREENSHOT', 'on');
        if (screenshotMode === 'on' || (screenshotMode === 'only-on-failure' && status === 'fail')) {
            this.captureScreenshot(`step_${this.currentStep.name}`);
        }
        
        this.currentTest.steps.push(this.currentStep);
        this.currentStep = null;
    }

    public static debug(message: string): void {
        this.log('DEBUG', message);
    }

    public static info(message: string): void {
        this.log('INFO', message);
    }

    public static warn(message: string): void {
        this.log('WARN', message);
    }

    public static error(message: string): void {
        this.log('ERROR', message);
    }

    public static pass(message: string): void {
        this.log('PASS', message);
        if (this.currentStep) {
            this.currentStep.status = 'pass';
        }
    }

    public static fail(message: string, error?: any): void {
        this.log('FAIL', message);
        if (error) {
            this.log('ERROR', error.stack || error.toString());
        }
        if (this.currentStep) {
            this.currentStep.status = 'fail';
            this.currentStep.error = error?.toString();
        }
    }

    public static success(message: string): void {
        this.log('SUCCESS', message);
        if (this.currentStep) {
            this.currentStep.status = 'pass';
        }
    }

    public static startFeature(featureName: string): void {
        this.log('INFO', `Feature: ${featureName}`);
    }

    public static endFeature(): void {
        // Feature ended
    }

    public static startScenario(scenarioName: string): void {
        this.log('INFO', `  Scenario: ${scenarioName}`);
    }

    public static endScenario(): void {
        // Scenario ended
    }

    public static passScenario(): void {
        this.log('PASS', '  Scenario passed');
    }

    public static failScenario(error: string): void {
        this.log('FAIL', `  Scenario failed: ${error}`);
    }

    public static startBDDStep(stepText: string): void {
        this.log('INFO', `    ${stepText}`);
    }

    public static endBDDStep(): void {
        // Step ended
    }

    public static passStep(): void {
        this.log('PASS', '    Step passed');
    }

    public static failStep(error: string): void {
        this.log('FAIL', `    Step failed: ${error}`);
    }

    private static log(level: string, message: string): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}`;
        
        // Console output if enabled
        if (this.getConfig().getBoolean('LOG_CONSOLE_ENABLED', true)) {
            const colors = this.getConfig().getBoolean('LOG_CONSOLE_COLORS', true);
            if (colors) {
                this.consoleWithColor(level, logMessage);
            } else {
                console.log(logMessage);
            }
        }
        
        // Buffer for file output
        this.logBuffer.push(logMessage);
        
        // Write to file if buffer is large enough
        if (this.logBuffer.length >= 10) {
            this.flushLogs();
        }
    }

    private static consoleWithColor(level: string, message: string): void {
        const colors: any = {
            'DEBUG': '\x1b[90m',  // Gray
            'INFO': '\x1b[36m',   // Cyan
            'WARN': '\x1b[33m',   // Yellow
            'ERROR': '\x1b[31m',  // Red
            'FAIL': '\x1b[31m',   // Red
            'PASS': '\x1b[32m',   // Green
        };
        
        const color = colors[level] || '\x1b[0m';
        console.log(`${color}${message}\x1b[0m`);
    }

    private static flushLogs(): void {
        if (!this.getConfig().getBoolean('LOG_TO_FILE', true)) return;
        
        const logPath = path.join(this.reportPath, 'execution.log');
        fs.appendFileSync(logPath, this.logBuffer.join('\n') + '\n');
        this.logBuffer = [];
    }

    private static async captureScreenshot(name: string): Promise<string | undefined> {
        try {
            // Use dynamic import to avoid circular dependency
            const { CSBrowserManager } = await import('../browser/CSBrowserManager');
            const browserManager = CSBrowserManager.getInstance();
            const page = browserManager.getPage();
            
            const screenshotDir = path.join(this.reportPath, 'screenshots');
            if (!fs.existsSync(screenshotDir)) {
                fs.mkdirSync(screenshotDir, { recursive: true });
            }
            
            const screenshotPath = path.join(screenshotDir, `${name}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });
            
            // Store path in current context
            if (this.currentStep) {
                this.currentStep.screenshot = screenshotPath;
            } else if (this.currentTest) {
                this.currentTest.screenshot = screenshotPath;
            }
            
            return screenshotPath;
        } catch (error) {
            this.warn(`Failed to capture screenshot: ${error}`);
            return undefined;
        }
    }

    public static async generateReports(): Promise<void> {
        this.flushLogs();
        
        const formats = this.getConfig().getList('REPORT_FORMATS', ';');
        
        for (const format of formats) {
            switch (format.toLowerCase()) {
                case 'html':
                    await this.generateHTMLReport();
                    break;
                case 'json':
                    await this.generateJSONReport();
                    break;
                case 'junit':
                    await this.generateJUnitReport();
                    break;
                case 'pdf':
                    await this.generatePDFReport();
                    break;
                default:
                    this.warn(`Unknown report format: ${format}`);
            }
        }
        
        // Open report if configured
        if (this.getConfig().getBoolean('REPORT_OPEN_AFTER_RUN', true)) {
            this.openReport();
        }
    }

    private static convertToEnterpriseResult(result: TestResult): any {
        return {
            id: result.name.replace(/[^a-zA-Z0-9]/g, '_'),
            feature: this.getConfig().get('PROJECT', 'Unknown Feature'),
            suite: this.getConfig().get('SUITE', 'Test Suite'),
            scenario: result.name,
            status: result.status === 'pass' ? 'passed' : result.status === 'fail' ? 'failed' : result.status,
            severity: 'major',
            priority: 'P2',
            duration: result.duration,
            startTime: result.timestamp,
            endTime: new Date(Date.parse(result.timestamp) + result.duration).toISOString(),
            steps: result.steps.map(step => ({
                name: step.name,
                status: step.status === 'pass' ? 'passed' : step.status === 'fail' ? 'failed' : step.status,
                duration: step.duration,
                startTime: step.timestamp,
                endTime: new Date(Date.parse(step.timestamp) + step.duration).toISOString(),
                attachments: step.screenshot ? [{
                    type: 'image',
                    name: 'Screenshot',
                    url: step.screenshot
                }] : []
            })),
            tags: ['@smoke', '@akhan'],
            categories: ['UI Test'],
            author: 'CS Framework',
            owner: 'CS Framework',
            epic: 'AKHAN Application',
            story: result.name,
            requirement: 'REQ-001',
            error: result.error ? {
                message: result.error,
                stackTrace: result.error,
                type: 'AssertionError'
            } : undefined,
            attachments: []
        };
    }

    private static async generateHTMLReport(): Promise<void> {
        // Use the enterprise reporter that surpasses Allure and ExtentReports
        const reportPath = path.join(this.reportPath, 'enterprise-report.html');
        await this.getEnterpriseReporter().generateReport(reportPath);
        this.info(`Enterprise-grade HTML report generated: ${reportPath}`);
    }

    private static async generateJSONReport(): Promise<void> {
        const report = {
            project: this.getConfig().get('PROJECT'),
            environment: this.getConfig().get('ENVIRONMENT'),
            browser: this.config?.get('BROWSER') || 'unknown',
            timestamp: new Date().toISOString(),
            duration: Date.now() - this.startTime,
            summary: {
                total: this.results.length,
                passed: this.results.filter(r => r.status === 'pass').length,
                failed: this.results.filter(r => r.status === 'fail').length,
                skipped: this.results.filter(r => r.status === 'skip').length
            },
            tests: this.results
        };
        
        const jsonPath = path.join(this.reportPath, 'report.json');
        fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
        this.info(`JSON report generated: ${jsonPath}`);
    }

    private static async generateJUnitReport(): Promise<void> {
        const totalTests = this.results.length;
        const failures = this.results.filter(r => r.status === 'fail').length;
        const skipped = this.results.filter(r => r.status === 'skip').length;
        const time = (Date.now() - this.startTime) / 1000;
        
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="CS Test Suite" tests="${totalTests}" failures="${failures}" skipped="${skipped}" time="${time}">
    <testsuite name="${this.getConfig().get('PROJECT')}" tests="${totalTests}" failures="${failures}" skipped="${skipped}" time="${time}">
        ${this.results.map(test => `
        <testcase name="${test.name}" time="${test.duration / 1000}">
            ${test.status === 'fail' ? `<failure message="${test.error || 'Test failed'}">${test.error}</failure>` : ''}
            ${test.status === 'skip' ? '<skipped/>' : ''}
        </testcase>`).join('')}
    </testsuite>
</testsuites>`;
        
        const xmlPath = path.join(this.reportPath, 'report.xml');
        fs.writeFileSync(xmlPath, xml);
        this.info(`JUnit report generated: ${xmlPath}`);
    }

    private static async generatePDFReport(): Promise<void> {
        // PDF generation would require additional library
        // For now, just create a placeholder
        this.warn('PDF report generation not yet implemented');
    }

    private static openReport(): void {
        const htmlPath = path.join(this.reportPath, 'report.html');
        if (fs.existsSync(htmlPath)) {
            const platform = process.platform;
            const { exec } = require('child_process');
            
            if (platform === 'darwin') {
                exec(`open ${htmlPath}`);
            } else if (platform === 'win32') {
                exec(`start ${htmlPath}`);
            } else {
                exec(`xdg-open ${htmlPath}`);
            }
        }
    }

    public static getResults(): TestResult[] {
        return this.results;
    }

    public static clearResults(): void {
        this.results = [];
        this.currentTest = null;
        this.currentStep = null;
    }

    // Methods for world-class HTML reporting
    public static addStepToHTML(keyword: string, name: string, status?: 'passed' | 'failed' | 'skipped'): void {
        if (this.htmlTestResult) {
            const htmlStep: HTMLStepResult = {
                keyword,
                name,
                status: status || 'passed',
                duration: 0,
                actionDetails: []
            };
            this.htmlTestResult.steps.push(htmlStep);
        }
    }

    public static addActionDetail(action: string, element: string, value?: string, screenshot?: string): void {
        if (this.htmlTestResult && this.htmlTestResult.steps.length > 0) {
            const lastStep = this.htmlTestResult.steps[this.htmlTestResult.steps.length - 1];
            const actionDetail: ActionDetail = {
                action,
                element,
                value,
                timestamp: new Date().toISOString(),
                duration: 0,
                screenshot
            };
            if (!lastStep.actionDetails) {
                lastStep.actionDetails = [];
            }
            lastStep.actionDetails.push(actionDetail);
        }
    }

    public static addScreenshotToReport(path: string): void {
        if (this.htmlTestResult) {
            this.htmlTestResult.screenshots.push(path);
        }
    }

    public static addVideoToReport(path: string): void {
        if (this.htmlTestResult) {
            this.htmlTestResult.videos.push(path);
        }
    }

    public static addConsoleLog(log: string): void {
        if (this.htmlTestResult) {
            this.htmlTestResult.consoleLogs.push(`[${new Date().toISOString()}] ${log}`);
        }
    }

    public static addNetworkLog(method: string, url: string, status: number, duration: number, size: number): void {
        if (this.htmlTestResult) {
            this.htmlTestResult.networkLogs.push({
                method,
                url,
                status,
                duration,
                size,
                timestamp: new Date().toISOString()
            });
        }
    }
}