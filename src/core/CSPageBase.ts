import { Page } from '@playwright/test';
import { CSBrowserManager } from '../browser/CSBrowserManager';
import { CSConfigurationManager } from './CSConfigurationManager';
import { CSReporter } from '../reporter/CSReporter';
import { CSWebElement } from '../element/CSWebElement';

export abstract class CSPageBase {
    protected page: Page;
    protected config: CSConfigurationManager;
    protected browserManager: CSBrowserManager;
    protected url: string = '';
    protected elements: Map<string, CSWebElement> = new Map();
    
    constructor() {
        this.config = CSConfigurationManager.getInstance();
        this.browserManager = CSBrowserManager.getInstance();
        this.page = this.browserManager.getPage();
        this.initializeElements();
    }
    
    // Public getter for page access
    public getPage(): Page {
        return this.page;
    }
    
    // Abstract method to be implemented by page classes
    protected abstract initializeElements(): void;
    
    public async navigate(url?: string): Promise<void> {
        const targetUrl = url || this.url || this.config.get('BASE_URL');
        CSReporter.info(`Navigating to: ${targetUrl}`);
        // Include waitUntil in goto to avoid separate waitForPageLoad call
        await this.page.goto(targetUrl, {
            waitUntil: 'load',
            timeout: this.config.getNumber('BROWSER_NAVIGATION_TIMEOUT', 30000)
        });
        CSReporter.debug('Navigation complete');
    }

    public async waitForPageLoad(): Promise<void> {
        // Use a reasonable timeout from config or default to 30 seconds
        const timeout = this.config.getNumber('BROWSER_NAVIGATION_TIMEOUT', 30000);
        // Use 'load' instead of 'networkidle' as recommended by Playwright documentation
        // networkidle is discouraged and can cause unnecessary timeouts
        await this.page.waitForLoadState('load', { timeout });
        CSReporter.debug('Page loaded');
    }
    
    public async isAt(): Promise<boolean> {
        // Override in page classes for specific validation
        return true;
    }
    
    public async takeScreenshot(name?: string): Promise<void> {
        const screenshotName = name || `${this.constructor.name}_${Date.now()}`;
        await this.page.screenshot({ 
            path: `./screenshots/${screenshotName}.png`,
            fullPage: true 
        });
        CSReporter.debug(`Screenshot taken: ${screenshotName}`);
    }
    
    protected registerElement(name: string, element: CSWebElement): void {
        this.elements.set(name, element);
    }
    
    protected getElement(name: string): CSWebElement {
        const element = this.elements.get(name);
        if (!element) {
            throw new Error(`Element '${name}' not found in ${this.constructor.name}`);
        }
        return element;
    }
    
    public async waitForElement(elementName: string, timeout?: number): Promise<void> {
        const element = this.getElement(elementName);
        await element.waitForVisible(timeout);
    }
    
    public async executeScript(script: string, ...args: any[]): Promise<any> {
        return await this.page.evaluate(script, ...args);
    }
    
    public async getTitle(): Promise<string> {
        return await this.page.title();
    }
    
    public async getUrl(): Promise<string> {
        return this.page.url();
    }
    
    public async refresh(): Promise<void> {
        await this.page.reload();
        await this.waitForPageLoad();
    }
    
    public async goBack(): Promise<void> {
        await this.page.goBack();
        await this.waitForPageLoad();
    }
    
    public async goForward(): Promise<void> {
        await this.page.goForward();
        await this.waitForPageLoad();
    }
}