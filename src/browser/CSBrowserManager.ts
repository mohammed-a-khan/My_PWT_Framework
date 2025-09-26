import { Browser, BrowserContext, Page, chromium, firefox, webkit, BrowserType } from '@playwright/test';
import { CSConfigurationManager } from '../core/CSConfigurationManager';
import { CSReporter } from '../reporter/CSReporter';
import { CSTestResultsManager } from '../reporter/CSTestResultsManager';
import * as path from 'path';
// Parallel resource manager removed - handled differently now

export interface BrowserState {
    cookies?: any[];
    localStorage?: any[];
    sessionStorage?: any[];
    url?: string;
}

export class CSBrowserManager {
    private static instance: CSBrowserManager;
    private static threadInstances: Map<number, CSBrowserManager> = new Map();
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private page: Page | null = null;
    private browserPool: Map<string, Browser> = new Map();
    private currentBrowserType: string = 'chrome';
    private browserState: BrowserState = {};
    private restartCount: number = 0;
    private isWorkerThread: boolean = false;
    private workerId: number = 0;
    private videosToDelete: string[] = [];
    private harsToDelete: string[] = [];
    private currentHarPath: string | null = null;
    private traceStarted: boolean = false;

    private constructor() {
        // Don't store config reference - get it fresh each time to avoid initialization order issues
        // Check if running in worker thread
        if (typeof process !== 'undefined' && process.env.WORKER_ID) {
            this.isWorkerThread = true;
            this.workerId = parseInt(process.env.WORKER_ID) || 0;
            CSReporter.debug(`BrowserManager initialized for worker ${this.workerId} (raw: ${process.env.WORKER_ID})`);
        }
    }

    public static getInstance(): CSBrowserManager {
        // For worker threads, create separate instances
        if (typeof process !== 'undefined' && process.env.WORKER_ID) {
            const workerId = parseInt(process.env.WORKER_ID);
            if (!CSBrowserManager.threadInstances.has(workerId)) {
                CSBrowserManager.threadInstances.set(workerId, new CSBrowserManager());
            }
            return CSBrowserManager.threadInstances.get(workerId)!;
        }

        // For main thread, use singleton
        if (!CSBrowserManager.instance) {
            CSBrowserManager.instance = new CSBrowserManager();
        }
        return CSBrowserManager.instance;
    }
    
    // Get fresh config reference each time to avoid singleton initialization order issues
    private get config(): CSConfigurationManager {
        return CSConfigurationManager.getInstance();
    }

    public async launch(browserType?: string): Promise<void> {
        const startTime = Date.now();
        
        if (!browserType) {
            browserType = this.config.get('BROWSER', 'chrome');
        }
        
        this.currentBrowserType = browserType;
        
        try {
            // Get browser instance based on reuse configuration
            const browserReuseEnabled = this.config.getBoolean('BROWSER_REUSE_ENABLED', false);

            if (browserReuseEnabled && this.browser) {
                // Reuse existing browser
                CSReporter.debug('Reusing existing browser');
            } else {
                CSReporter.debug('Launching new browser');
                this.browser = await this.launchBrowser(browserType);

                if (browserReuseEnabled) {
                    this.browserPool.set(browserType, this.browser);
                }
            }

            // For new-per-scenario, we should NOT create a new context here
            // The context should be created fresh and closed properly with test status after each scenario
            if (!this.context) {
                CSReporter.debug('Creating new context (no existing context)');
                await this.createContext();
                await this.createPage();
            } else if (!this.page) {
                CSReporter.debug('Creating new page (context exists but no page)');
                await this.createPage();
            } else {
                CSReporter.debug('Context and page already exist');
            }
            
            const launchTime = Date.now() - startTime;
            if (launchTime > 3000) {
                CSReporter.warn(`Browser launch took ${launchTime}ms (target: <3000ms)`);
            }
            
            CSReporter.info(`Browser ${browserType} launched successfully in ${launchTime}ms`);
        } catch (error) {
            CSReporter.fail(`Failed to launch browser: ${error}`);
            throw error;
        }
    }

    private async launchBrowser(browserType: string): Promise<Browser> {
        const isHeadless = this.config.getBoolean('HEADLESS', false);
        
        const browserOptions: any = {
            headless: isHeadless,
            timeout: this.config.getNumber('BROWSER_LAUNCH_TIMEOUT', 30000),
            slowMo: this.config.getNumber('BROWSER_SLOWMO', 0),
            devtools: this.config.getBoolean('BROWSER_DEVTOOLS', false),
            args: isHeadless ? [] : [
                '--start-maximized',
                '--no-default-browser-check',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--force-device-scale-factor=1'
            ]
        };

        // Add proxy if configured
        const proxyEnabled = this.config.getBoolean('BROWSER_PROXY_ENABLED', false);
        if (proxyEnabled) {
            browserOptions.proxy = {
                server: this.config.get('BROWSER_PROXY_SERVER'),
                username: this.config.get('BROWSER_PROXY_USERNAME'),
                password: this.config.get('BROWSER_PROXY_PASSWORD'),
                bypass: this.config.get('BROWSER_PROXY_BYPASS')
            };
        }

        // Add browser-specific options
        if (browserType === 'chrome' || browserType === 'chromium') {
            // Merge args instead of overwriting
            const chromeArgs = this.getChromeArgs();
            browserOptions.args = [...(browserOptions.args || []), ...chromeArgs];
            return await chromium.launch(browserOptions);
        } else if (browserType === 'firefox') {
            const firefoxArgs = this.getFirefoxArgs();
            browserOptions.args = [...(browserOptions.args || []), ...firefoxArgs];
            return await firefox.launch(browserOptions);
        } else if (browserType === 'webkit' || browserType === 'safari') {
            return await webkit.launch(browserOptions);
        } else if (browserType === 'edge') {
            browserOptions.channel = 'msedge';
            return await chromium.launch(browserOptions);
        } else {
            throw new Error(`Unsupported browser type: ${browserType}`);
        }
    }

    private getChromeArgs(): string[] {
        const args = [];
        
        // Always maximize in non-headless mode
        const isHeadless = this.config.getBoolean('HEADLESS', false);
        if (!isHeadless) {
            args.push('--start-maximized');
        }
        
        if (this.config.getBoolean('BROWSER_INCOGNITO', false)) {
            args.push('--incognito');
        }
        
        if (this.config.getBoolean('BROWSER_DISABLE_GPU', false)) {
            args.push('--disable-gpu');
        }
        
        if (this.config.getBoolean('BROWSER_NO_SANDBOX', false)) {
            args.push('--no-sandbox');
        }
        
        // Add custom args
        const customArgs = this.config.getList('BROWSER_CHROME_ARGS');
        args.push(...customArgs);
        
        return args;
    }

    private getFirefoxArgs(): string[] {
        const args = [];
        
        if (this.config.getBoolean('BROWSER_PRIVATE', false)) {
            args.push('-private');
        }
        
        // Add custom args
        const customArgs = this.config.getList('BROWSER_FIREFOX_ARGS');
        args.push(...customArgs);
        
        return args;
    }

    private async createContext(): Promise<void> {
        if (!this.browser) {
            throw new Error('Browser not launched');
        }

        const isHeadless = this.config.getBoolean('HEADLESS', false);
        
        const contextOptions: any = {
            viewport: isHeadless ? {
                width: this.config.getNumber('BROWSER_VIEWPORT_WIDTH', 1920),
                height: this.config.getNumber('BROWSER_VIEWPORT_HEIGHT', 1080)
            } : null, // null viewport means use the window size (maximized)
            ignoreHTTPSErrors: this.config.getBoolean('BROWSER_IGNORE_HTTPS_ERRORS', true),
            locale: this.config.get('BROWSER_LOCALE', 'en-US'),
            timezoneId: this.config.get('BROWSER_TIMEZONE', 'America/New_York'),
            permissions: this.config.getList('BROWSER_PERMISSIONS'),
            geolocation: this.getGeolocation(),
            colorScheme: this.config.get('BROWSER_COLOR_SCHEME', 'light') as any,
            reducedMotion: this.config.get('BROWSER_REDUCED_MOTION', 'no-preference') as any,
            forcedColors: this.config.get('BROWSER_FORCED_COLORS', 'none') as any,
        };

        // Add recording options if enabled
        const videoMode = this.config.get('BROWSER_VIDEO', 'off');

        // Use parallel resource manager if in parallel mode, otherwise use test results manager
        const isParallel = this.config.getBoolean('USE_WORKER_THREADS', false) && this.isWorkerThread;
        let dirs: any;

        // Always use the main test results directory (same for parallel and sequential)
        // This ensures artifacts are saved in the correct location
        const resultsManager = CSTestResultsManager.getInstance();
        dirs = resultsManager.getDirectories();

        CSReporter.debug(`Video mode configured: ${videoMode} (Worker: ${this.workerId || 'main'})`);
        if (videoMode !== 'off' && videoMode !== 'never') {
            contextOptions.recordVideo = {
                dir: dirs.videos,
                size: {
                    width: this.config.getNumber('BROWSER_VIDEO_WIDTH', 1280),
                    height: this.config.getNumber('BROWSER_VIDEO_HEIGHT', 720)
                }
            };
            CSReporter.info(`Video recording enabled: ${dirs.videos}`);
        }

        // Add HAR recording if enabled
        const harCaptureMode = this.config.get('HAR_CAPTURE_MODE', 'never').toLowerCase();
        const harEnabledFlag = this.config.getBoolean('BROWSER_HAR_ENABLED', false);
        // HAR is enabled if either the flag is set OR capture mode is not 'never'
        const harEnabled = harEnabledFlag || harCaptureMode !== 'never';
        CSReporter.debug(`HAR recording configured: ${harEnabled} (mode: ${harCaptureMode}, enabled flag: ${harEnabledFlag})`);

        if (harEnabled) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const uniqueId = this.isWorkerThread ? `w${this.workerId}` : 'main';
            this.currentHarPath = `${dirs.har}/network-${uniqueId}-${timestamp}.har`;
            contextOptions.recordHar = {
                path: this.currentHarPath,
                omitContent: this.config.getBoolean('BROWSER_HAR_OMIT_CONTENT', false)
            };
            CSReporter.info(`HAR recording enabled: ${this.currentHarPath}`);
        }

        // Add user agent if specified
        const userAgent = this.config.get('BROWSER_USER_AGENT');
        if (userAgent) {
            contextOptions.userAgent = userAgent;
        }

        // Add extra HTTP headers
        const extraHeaders = this.config.get('BROWSER_EXTRA_HEADERS');
        if (extraHeaders) {
            contextOptions.extraHTTPHeaders = JSON.parse(extraHeaders);
        }

        // Add offline mode if specified
        if (this.config.getBoolean('BROWSER_OFFLINE', false)) {
            contextOptions.offline = true;
        }

        // Add HTTP credentials if specified
        const httpUsername = this.config.get('BROWSER_HTTP_USERNAME');
        const httpPassword = this.config.get('BROWSER_HTTP_PASSWORD');
        if (httpUsername && httpPassword) {
            contextOptions.httpCredentials = {
                username: httpUsername,
                password: httpPassword
            };
        }

        // Restore state if switching browsers
        if (this.browserState.cookies) {
            contextOptions.storageState = {
                cookies: this.browserState.cookies,
                origins: []
            };
        }

        CSReporter.debug(`Creating browser context with options: recordVideo=${!!contextOptions.recordVideo}, recordHar=${!!contextOptions.recordHar}`);
        this.context = await this.browser.newContext(contextOptions);
        CSReporter.info('Browser context created successfully');
        
        // Start tracing if enabled
        const traceCaptureMode = this.config.get('TRACE_CAPTURE_MODE', 'never').toLowerCase();
        const traceEnabled = traceCaptureMode !== 'never' || this.config.getBoolean('BROWSER_TRACE_ENABLED', false);
        if (traceEnabled) {
            CSReporter.debug(`Starting trace recording (${traceCaptureMode})...`);
            await this.context.tracing.start({
                screenshots: true,
                snapshots: true,
                sources: true
            });
            this.traceStarted = true;
            CSReporter.info(`Trace recording started (${traceCaptureMode})`);
        }
        
        // Set default timeout for context
        this.context.setDefaultTimeout(this.config.getNumber('BROWSER_ACTION_TIMEOUT', 10000));
        this.context.setDefaultNavigationTimeout(this.config.getNumber('BROWSER_NAVIGATION_TIMEOUT', 30000));
    }

    private async createPage(): Promise<void> {
        if (!this.context) {
            throw new Error('Context not created');
        }

        this.page = await this.context.newPage();
        
        // Set page-level configurations
        const autoWaitTimeout = this.config.getNumber('BROWSER_AUTO_WAIT_TIMEOUT', 5000);
        if (autoWaitTimeout > 0) {
            this.page.setDefaultTimeout(autoWaitTimeout);
        }

        // Add console log listener if enabled
        if (this.config.getBoolean('CONSOLE_LOG_CAPTURE', true)) {
            this.page.on('console', msg => {
                const resultsManager = CSTestResultsManager.getInstance();
                resultsManager.addConsoleLog(msg.type(), msg.text(), new Date());
                CSReporter.debug(`Console [${msg.type()}]: ${msg.text()}`);
            });
        }

        // Add page error listener
        this.page.on('pageerror', error => {
            CSReporter.warn(`Page error: ${error.message}`);
        });

        // Add request failed listener
        this.page.on('requestfailed', request => {
            CSReporter.debug(`Request failed: ${request.url()} - ${request.failure()?.errorText}`);
        });

        // Add crash detection
        this.page.on('crash', () => {
            CSReporter.error('Page crashed!');
            if (this.config.getBoolean('BROWSER_AUTO_RESTART_ON_CRASH', true)) {
                this.handleCrash();
            }
        });
    }

    private getGeolocation(): any {
        const lat = this.config.get('BROWSER_GEOLOCATION_LAT');
        const lon = this.config.get('BROWSER_GEOLOCATION_LON');
        
        if (lat && lon) {
            return {
                latitude: parseFloat(lat),
                longitude: parseFloat(lon)
            };
        }
        
        return undefined;
    }

    public async switchBrowser(toBrowserType: string): Promise<void> {
        CSReporter.info(`Switching browser from ${this.currentBrowserType} to ${toBrowserType}`);
        
        // Save current state if configured
        if (this.config.getBoolean('BROWSER_SWITCH_MAINTAIN_STATE', true)) {
            await this.saveState();
        }
        
        // Close current browser
        await this.close();
        
        // Launch new browser
        await this.launch(toBrowserType);
        
        // Restore state if saved
        if (this.config.getBoolean('BROWSER_SWITCH_MAINTAIN_STATE', true) && this.browserState.url) {
            await this.restoreState();
        }
    }

    private async saveState(): Promise<void> {
        if (!this.page || !this.context) return;
        
        try {
            this.browserState.url = this.page.url();
            const storageState = await this.context.storageState();
            this.browserState.cookies = storageState.cookies;
            this.browserState.localStorage = storageState.origins
                .flatMap(origin => origin.localStorage || []);
            // Session storage is not persisted in Playwright's storageState
            this.browserState.sessionStorage = [];
            
            CSReporter.debug('Browser state saved');
        } catch (error) {
            CSReporter.warn(`Failed to save browser state: ${error}`);
        }
    }

    private async restoreState(): Promise<void> {
        if (!this.page || !this.browserState.url) return;
        
        try {
            await this.page.goto(this.browserState.url);
            CSReporter.debug('Browser state restored');
        } catch (error) {
            CSReporter.warn(`Failed to restore browser state: ${error}`);
        }
    }

    public async restartBrowser(): Promise<void> {
        CSReporter.info('Restarting browser');
        
        const currentType = this.currentBrowserType;
        
        // Save state before restart
        if (this.config.getBoolean('BROWSER_RESTART_MAINTAIN_STATE', true)) {
            await this.saveState();
        }
        
        // Close current browser
        await this.close();
        
        // Increment restart count
        this.restartCount++;
        
        // Launch browser again
        await this.launch(currentType);
        
        // Restore state after restart
        if (this.config.getBoolean('BROWSER_RESTART_MAINTAIN_STATE', true) && this.browserState.url) {
            await this.restoreState();
        }
        
        CSReporter.info(`Browser restarted successfully (restart count: ${this.restartCount})`);
    }

    private async handleCrash(): Promise<void> {
        const maxRestarts = this.config.getNumber('BROWSER_MAX_RESTART_ATTEMPTS', 3);
        
        if (this.restartCount >= maxRestarts) {
            CSReporter.error(`Maximum restart attempts (${maxRestarts}) reached`);
            throw new Error('Browser crash recovery failed');
        }
        
        CSReporter.warn(`Browser crashed. Attempting auto-restart (${this.restartCount + 1}/${maxRestarts})`);
        await this.restartBrowser();
    }

    public async closePage(): Promise<void> {
        if (this.page) {
            try {
                await this.page.close();
            } catch (error) {
                CSReporter.debug('Page already closed or error closing page');
            } finally {
                this.page = null;
            }
        }
    }

    public async closeContext(testStatus?: 'passed' | 'failed', skipTraceSave: boolean = false): Promise<void> {
        // Save trace before closing context if browser reuse is enabled
        // Skip trace save when called from closeAll() as traces are already saved per-scenario
        if (this.context && this.traceStarted && !skipTraceSave) {
            await this.saveTraceIfNeeded(testStatus);
        }

        if (this.context) {
            try {
                // Use a timeout to prevent hanging on context.close()
                await Promise.race([
                    this.context.close(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Context close timeout')), 5000)
                    )
                ]);
            } catch (error) {
                CSReporter.debug('Context close timeout or error: ' + error);
            } finally {
                this.context = null;
            }
        }
    }

    public async saveTraceIfNeeded(testStatus?: 'passed' | 'failed'): Promise<void> {
        if (!this.context || !this.traceStarted) return;

        const traceCaptureMode = this.config.get('TRACE_CAPTURE_MODE', 'never').toLowerCase();
        const resultsManager = CSTestResultsManager.getInstance();
        const dirs = resultsManager.getDirectories();
        const fs = require('fs');

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const tracePath = `${dirs.traces}/trace-${timestamp}.zip`;
            await this.context.tracing.stop({ path: tracePath });
            this.traceStarted = false;

            // Determine if we should keep the trace
            const actualStatus = testStatus || 'passed'; // Default to 'passed' if undefined
            const shouldDeleteTrace = this.shouldDeleteArtifact(traceCaptureMode, actualStatus);
            CSReporter.debug(`Trace decision: mode=${traceCaptureMode}, status=${actualStatus}, shouldDelete=${shouldDeleteTrace}`);

            if (shouldDeleteTrace) {
                try {
                    fs.unlinkSync(tracePath);
                    CSReporter.debug(`Trace deleted (capture mode: ${traceCaptureMode}, test ${testStatus}): ${tracePath}`);
                } catch (error) {
                    CSReporter.debug(`Failed to delete trace: ${error}`);
                }
            } else {
                CSReporter.info(`Trace saved (capture mode: ${traceCaptureMode}, test ${testStatus}): ${tracePath}`);
            }

            // Don't restart trace here - it should be restarted in restartTraceForNextScenario()
            // This prevents timing issues where trace might be restarted too early
        } catch (error) {
            CSReporter.debug(`Failed to save/restart trace: ${error}`);
        }
    }

    public async restartTraceForNextScenario(): Promise<void> {
        if (!this.context || !this.config.getBoolean('BROWSER_REUSE_ENABLED', false)) {
            return;
        }

        try {
            // Only restart trace if it's enabled
            const traceEnabled = this.config.getBoolean('BROWSER_TRACE_ENABLED', false) ||
                                this.config.get('TRACE_CAPTURE_MODE', 'never') !== 'never';

            if (traceEnabled) {
                await this.context.tracing.start({
                    screenshots: true,
                    snapshots: true,
                    sources: true
                });
                this.traceStarted = true;
                CSReporter.debug('Trace recording restarted for next scenario');
            }
        } catch (error) {
            CSReporter.debug(`Failed to restart trace: ${error}`);
        }
    }


    public async closeBrowser(): Promise<void> {
        if (this.browser) {
            try {
                // Use a timeout to prevent hanging on browser.close()
                await Promise.race([
                    this.browser.close(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Browser close timeout')), 5000)
                    )
                ]);
            } catch (error) {
                CSReporter.debug('Browser close timeout or error: ' + error);
                // Force kill if close fails
                try {
                    const process = (this.browser as any).process();
                    if (process) {
                        process.kill('SIGKILL');
                    }
                } catch (killError) {
                    CSReporter.debug('Failed to force kill browser process');
                }
            } finally {
                this.browser = null;
            }
        }
    }

    private shouldDeleteArtifact(captureMode: string, testStatus?: 'passed' | 'failed'): boolean {
        // Determine if artifact should be deleted based on capture mode and test status
        switch(captureMode) {
            case 'always':
                return false; // Never delete - always keep artifacts
            case 'on-failure-only':
            case 'on-failure':
            case 'retain-on-failure':
                // Only keep if test failed (delete if passed or unknown)
                return testStatus === 'passed';
            case 'on-pass-only':
            case 'on-pass':
                // Only keep if test passed (delete if failed or unknown)
                return testStatus === 'failed';
            case 'never':
            case 'off':
                return true; // Always delete (shouldn't happen as we don't record)
            default:
                // Default to keeping artifacts if mode is unknown
                return false;
        }
    }

    public async close(testStatus?: 'passed' | 'failed'): Promise<void> {
        const resultsManager = CSTestResultsManager.getInstance();
        const dirs = resultsManager.getDirectories();
        const fs = require('fs');

        let videoPath: string | null = null;
        let tracePath: string | null = null;

        // Handle trace recording
        const traceCaptureMode = this.config.get('TRACE_CAPTURE_MODE', 'never').toLowerCase();
        if (this.context && (this.traceStarted || this.config.getBoolean('BROWSER_TRACE_ENABLED', false))) {
            try {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                tracePath = `${dirs.traces}/trace-${timestamp}.zip`;
                await this.context.tracing.stop({ path: tracePath });
                this.traceStarted = false;

                // Determine if we should keep the trace
                const shouldDeleteTrace = this.shouldDeleteArtifact(traceCaptureMode, testStatus);
                CSReporter.debug(`Trace decision: mode=${traceCaptureMode}, status=${testStatus}, shouldDelete=${shouldDeleteTrace}`);

                if (shouldDeleteTrace) {
                    try {
                        fs.unlinkSync(tracePath);
                        CSReporter.debug(`Trace deleted (capture mode: ${traceCaptureMode}, test ${testStatus}): ${tracePath}`);
                        tracePath = null;
                    } catch (error) {
                        CSReporter.debug(`Failed to delete trace: ${error}`);
                    }
                } else {
                    CSReporter.info(`Trace saved (capture mode: ${traceCaptureMode}, test ${testStatus}): ${tracePath}`);
                }
            } catch (error) {
                CSReporter.debug('Failed to save trace');
            }
        }

        // Handle video recording
        const videoCaptureMode = this.config.get('BROWSER_VIDEO', 'off').toLowerCase();
        if (videoCaptureMode !== 'never' && videoCaptureMode !== 'off' && this.page) {
            try {
                const video = this.page.video();
                if (video) {
                    videoPath = await video.path();
                    if (videoPath) {
                        const shouldDeleteVideo = this.shouldDeleteArtifact(videoCaptureMode, testStatus);
                        CSReporter.debug(`Video decision: mode=${videoCaptureMode}, status=${testStatus}, shouldDelete=${shouldDeleteVideo}, path=${videoPath}`);

                        if (shouldDeleteVideo) {
                            // Mark for deletion after context closes
                            this.videosToDelete.push(videoPath);
                            CSReporter.debug(`Video will be deleted (capture mode: ${videoCaptureMode}, test ${testStatus}): ${videoPath}`);
                        } else {
                            CSReporter.info(`Video saved (capture mode: ${videoCaptureMode}, test ${testStatus}): ${videoPath}`);
                        }
                    } else {
                        CSReporter.debug('Video path is null - video may not have been saved yet');
                    }
                } else {
                    CSReporter.debug('No video object available on page');
                }
            } catch (error: any) {
                CSReporter.debug(`Could not get video path: ${error.message}`);
            }
        } else {
            CSReporter.debug(`Video capture skipped - mode: ${videoCaptureMode}, has page: ${!!this.page}`);
        }

        // Handle HAR file
        const harCaptureMode = this.config.get('HAR_CAPTURE_MODE', 'never').toLowerCase();
        if (harCaptureMode !== 'never' && this.currentHarPath) {
            const shouldDeleteHar = this.shouldDeleteArtifact(harCaptureMode, testStatus);
            CSReporter.debug(`HAR decision: mode=${harCaptureMode}, status=${testStatus}, shouldDelete=${shouldDeleteHar}`);

            if (shouldDeleteHar) {
                // Mark for deletion after context closes
                this.harsToDelete.push(this.currentHarPath);
                CSReporter.debug(`HAR will be deleted (capture mode: ${harCaptureMode}, test ${testStatus}): ${this.currentHarPath}`);
            } else {
                CSReporter.info(`HAR saved (capture mode: ${harCaptureMode}, test ${testStatus}): ${this.currentHarPath}`);
            }
        }

        // Close page first
        await this.closePage();

        // Close context - this triggers video/HAR save automatically
        await this.closeContext();

        // Wait for video files to be released by Playwright
        // Playwright needs time to finalize video encoding after context closes
        if (this.videosToDelete.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Clean up artifacts that were marked for deletion after context is closed
        // Delete videos marked for deletion with retry logic
        for (const videoToDelete of this.videosToDelete) {
            let retries = 3;
            while (retries > 0) {
                try {
                    if (fs.existsSync(videoToDelete)) {
                        fs.unlinkSync(videoToDelete);
                        CSReporter.debug(`Video deleted: ${videoToDelete}`);
                        break;
                    }
                } catch (error: any) {
                    retries--;
                    if (retries > 0 && error.code === 'EBUSY') {
                        // File is still locked, wait a bit and retry
                        await new Promise(resolve => setTimeout(resolve, 500));
                    } else {
                        CSReporter.debug(`Failed to delete video: ${error}`);
                        break;
                    }
                }
            }
        }
        this.videosToDelete = [];

        // Delete HARs marked for deletion
        for (const harToDelete of this.harsToDelete) {
            try {
                if (fs.existsSync(harToDelete)) {
                    fs.unlinkSync(harToDelete);
                    CSReporter.debug(`HAR deleted: ${harToDelete}`);
                }
            } catch (error) {
                CSReporter.debug(`Failed to delete HAR: ${error}`);
            }
        }
        this.harsToDelete = [];

        // Reset paths for next test
        this.currentHarPath = null;

        const browserReuseEnabled = this.config.getBoolean('BROWSER_REUSE_ENABLED', false);
        if (!browserReuseEnabled) {
            await this.closeBrowser();
        }
    }

    public async closeAll(): Promise<void> {
        await this.closePage();
        // Skip trace save in closeContext as traces are already saved per-scenario
        await this.closeContext(undefined, true);
        await this.closeBrowser();
        
        // Close all pooled browsers
        for (const [type, browser] of this.browserPool) {
            await browser.close();
        }
        this.browserPool.clear();
    }

    public getPage(): Page {
        if (!this.page) {
            throw new Error('Page not initialized');
        }
        return this.page;
    }

    public getContext(): BrowserContext {
        if (!this.context) {
            throw new Error('Context not initialized');
        }
        return this.context;
    }

    public getBrowser(): Browser {
        if (!this.browser) {
            throw new Error('Browser not initialized');
        }
        return this.browser;
    }

    public getCurrentBrowserType(): string {
        return this.currentBrowserType;
    }

    public getRestartCount(): number {
        return this.restartCount;
    }

    /**
     * Wait for loading spinners to disappear
     * Uses SPINNER_SELECTORS configuration to identify loading indicators
     */
    public async waitForSpinnersToDisappear(timeout: number = 30000): Promise<void> {
        const spinnerSelectors = this.config.get('SPINNER_SELECTORS', '.spinner;.loader;.loading;.progress');
        const selectors = spinnerSelectors.split(';').filter(s => s.trim());

        if (selectors.length === 0 || !this.page) {
            return;
        }

        CSReporter.debug(`Waiting for spinners to disappear: ${selectors.join(', ')}`);

        for (const selector of selectors) {
            try {
                await this.page.waitForSelector(selector.trim(), {
                    state: 'hidden',
                    timeout: timeout
                });
                CSReporter.debug(`Spinner hidden: ${selector}`);
            } catch (error) {
                // Spinner might not exist on the page, which is fine
                CSReporter.debug(`Spinner selector not found or already hidden: ${selector}`);
            }
        }
    }

    /**
     * Navigate to URL and wait for spinners to disappear
     */
    public async navigateAndWaitReady(url: string, options?: any): Promise<void> {
        if (!this.page) {
            throw new Error('Page not initialized');
        }

        // Navigate to the URL
        await this.page.goto(url, options);

        // Wait for spinners to disappear if configured
        if (this.config.getBoolean('WAIT_FOR_SPINNERS', true)) {
            await this.waitForSpinnersToDisappear();
        }
    }

    /**
     * Get session artifacts (screenshots, videos, etc.)
     */
    public async getSessionArtifacts(): Promise<{ screenshots: string[], videos: string[], traces: string[], har: string[] }> {
        const artifacts: { screenshots: string[], videos: string[], traces: string[], har: string[] } = {
            screenshots: [],
            videos: [],
            traces: [],
            har: []
        };

        try {
            const config = CSConfigurationManager.getInstance();
            const fs = require('fs');
            const isParallel = this.isWorkerThread;
            const testResultsDir = config.get('TEST_RESULTS_DIR') || path.join(process.cwd(), 'reports', 'test-results');

            // Build directory paths - always use main test results directory
            // Don't create worker-specific subdirectories
            const dirs = {
                videos: path.join(testResultsDir, 'videos'),
                har: path.join(testResultsDir, 'har'),
                traces: path.join(testResultsDir, 'traces'),
                screenshots: path.join(testResultsDir, 'screenshots')
            };

            // Get video path if recording
            if (this.page && this.context) {
                const video = this.page.video();
                if (video) {
                    try {
                        const videoPath = await video.path();
                        if (videoPath) {
                            artifacts.videos.push(videoPath);
                        }
                    } catch (e) {
                        // Video might not be ready yet
                    }
                }
            }

            // Check for trace files
            if (fs.existsSync(dirs.traces)) {
                const traceFiles = fs.readdirSync(dirs.traces)
                    .filter((f: string) => f.endsWith('.zip'))
                    .map((f: string) => path.join(dirs.traces, f));
                artifacts.traces.push(...traceFiles);
            }

            // Check for HAR files
            if (fs.existsSync(dirs.har)) {
                const harFiles = fs.readdirSync(dirs.har)
                    .filter((f: string) => f.endsWith('.har'))
                    .map((f: string) => path.join(dirs.har, f));
                artifacts.har.push(...harFiles);
            }

            // Check for screenshots
            if (fs.existsSync(dirs.screenshots)) {
                const screenshotFiles = fs.readdirSync(dirs.screenshots)
                    .filter((f: string) => f.endsWith('.png') || f.endsWith('.jpg'))
                    .map((f: string) => path.join(dirs.screenshots, f));
                artifacts.screenshots.push(...screenshotFiles);
            }

        } catch (error: any) {
            CSReporter.debug(`Error collecting session artifacts: ${error.message}`);
        }

        return artifacts;
    }
}