import { Page } from '@playwright/test';
import { CSBrowserManager } from '../browser/CSBrowserManager';
import { CSConfigurationManager } from './CSConfigurationManager';
import { CSReporter } from '../reporter/CSReporter';
import { CSWebElement } from '../element/CSWebElement';
import { CSCrossDomainNavigationHandler } from '../navigation/CSCrossDomainNavigationHandler';

export abstract class CSBasePage {
    protected page: Page;
    protected config: CSConfigurationManager;
    protected browserManager: CSBrowserManager;
    protected url: string = '';
    protected elements: Map<string, CSWebElement> = new Map();
    private crossDomainHandler?: CSCrossDomainNavigationHandler;

    constructor() {
        this.config = CSConfigurationManager.getInstance();
        this.browserManager = CSBrowserManager.getInstance();
        this.page = this.browserManager.getPage();
        this.initializeElements();
        this.initializeCrossDomainHandler();
    }
    
    // Public getter for page access
    public getPage(): Page {
        return this.page;
    }
    
    // Abstract method to be implemented by page classes
    protected abstract initializeElements(): void;

    /**
     * Initialize cross-domain navigation handler if enabled
     */
    private initializeCrossDomainHandler(): void {
        if (this.config.getBoolean('CROSS_DOMAIN_NAVIGATION_ENABLED', true)) {
            this.crossDomainHandler = new CSCrossDomainNavigationHandler(this.page);
            CSReporter.debug('Cross-domain navigation handler initialized');
        }
    }
    
    public async navigate(url?: string): Promise<void> {
        const targetUrl = url || this.url || this.config.get('BASE_URL');
        CSReporter.info(`Navigating to: ${targetUrl}`);

        // Set up cross-domain handler if enabled
        if (this.crossDomainHandler) {
            this.crossDomainHandler.setTargetDomain(targetUrl);
            this.crossDomainHandler.setOriginalDomain(targetUrl);
        }

        // Navigate to the URL
        await this.page.goto(targetUrl, {
            waitUntil: 'domcontentloaded', // Use domcontentloaded for faster initial navigation
            timeout: this.config.getNumber('BROWSER_NAVIGATION_TIMEOUT', 30000)
        });

        // Handle potential authentication redirect
        if (this.crossDomainHandler) {
            // Check if we're being redirected to authentication
            await this.crossDomainHandler.handleInitialAuthRedirect(targetUrl);

            // If we're in cross-domain navigation, wait for it to complete
            if (this.crossDomainHandler.isInCrossDomainNavigation()) {
                CSReporter.info('Detected cross-domain authentication redirect, waiting for completion...');
                await this.crossDomainHandler.forceWaitForNavigation();
            }
        } else {
            // Fallback to regular wait for load
            await this.page.waitForLoadState('load', {
                timeout: this.config.getNumber('BROWSER_NAVIGATION_TIMEOUT', 30000)
            });
        }

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

    /**
     * Wait for any ongoing cross-domain navigation to complete
     */
    public async waitForCrossDomainNavigation(): Promise<void> {
        if (this.crossDomainHandler && this.crossDomainHandler.isInCrossDomainNavigation()) {
            CSReporter.info('Waiting for cross-domain navigation to complete...');
            await this.crossDomainHandler.handleCrossDomainNavigation();
        }
    }

    /**
     * Get cross-domain navigation state
     */
    public getCrossDomainNavigationState(): any {
        if (this.crossDomainHandler) {
            return this.crossDomainHandler.getNavigationState();
        }
        return null;
    }

    /**
     * Reset cross-domain handler (useful when switching between tests)
     */
    public resetCrossDomainHandler(): void {
        if (this.crossDomainHandler) {
            this.crossDomainHandler.reset();
        }
    }

    /**
     * Update page reference (useful after browser restart or context switch)
     */
    public updatePageReference(newPage: Page): void {
        this.page = newPage;
        // Reinitialize cross-domain handler with new page
        if (this.config.getBoolean('CROSS_DOMAIN_NAVIGATION_ENABLED', true)) {
            this.crossDomainHandler = new CSCrossDomainNavigationHandler(this.page);
            CSReporter.debug('Cross-domain handler reinitialized with new page');
        }
    }
}