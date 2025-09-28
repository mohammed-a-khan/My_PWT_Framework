#!/usr/bin/env node
/**
 * Worker process for parallel test execution
 * Thin wrapper that uses the existing BDD runner for scenario execution
 */

import * as path from 'path';

// Message types for IPC
interface ExecuteMessage {
    type: 'execute';
    scenarioId: string;
    feature: any;
    scenario: any;
    config: Record<string, any>;
    exampleRow?: string[];
    exampleHeaders?: string[];
    iterationNumber?: number;
    totalIterations?: number;
}

interface ResultMessage {
    type: 'result';
    scenarioId: string;
    name?: string;  // Add scenario name (interpolated with iteration)
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    error?: string;
    stackTrace?: string;
    steps: any[];
    artifacts: {
        screenshots: string[];
        videos: string[];
        traces?: string[];
        har?: string[];
        logs?: string[];
    };
    tags?: string[];
    startTime?: Date;
    endTime?: Date;
    testData?: any;  // Add test data for data-driven scenarios
    adoMetadata?: any;  // ADO metadata for test case mapping
}

class WorkerProcess {
    private workerId: number;
    private bddRunner: any;
    private browserManager: any;
    private scenarioCountForReuse: number = 0;
    private anyTestFailed: boolean = false;  // Track if any test failed for HAR decision
    private adoIntegration: any;

    constructor() {
        this.workerId = parseInt(process.env.WORKER_ID || '0');
        process.env.IS_WORKER = 'true';
        process.env.WORKER_ID = String(this.workerId);


        this.setupProcessHandlers();

        // Initialize worker asynchronously
        this.initializeWorker();
    }

    private async initializeWorker() {
        try {
            // Preload critical modules
            const { CSBDDRunner } = require('../bdd/CSBDDRunner');
            const { CSConfigurationManager } = require('../core/CSConfigurationManager');
            const { CSBrowserManager } = require('../browser/CSBrowserManager');

            // Initialize BDD runner
            this.bddRunner = CSBDDRunner.getInstance();

            // Skip preloading step definitions in workers
            // Steps will be loaded during actual scenario execution in executeSingleScenarioForWorker
            // This avoids the "No step definitions found" warning and improves startup performance

            // Initialize browser manager (but don't launch browser yet)
            this.browserManager = CSBrowserManager.getInstance();

            // Defer ADO integration initialization until after config is set up
            // We'll initialize it when we actually execute scenarios

        } catch (error) {
            console.error(`[Worker ${this.workerId}] Failed to initialize:`, error);
        }

        // Send ready message after initialization using setImmediate to ensure process is ready
        setImmediate(() => {
            // Wait a bit to ensure the parent process is ready to receive messages
            setTimeout(() => {
                this.sendMessage({ type: 'ready', workerId: this.workerId });
            }, 100);
        });
    }

    private setupProcessHandlers() {
        process.on('message', this.handleMessage.bind(this));
        process.on('SIGTERM', this.cleanup.bind(this));
        process.on('SIGINT', this.cleanup.bind(this));
        process.on('uncaughtException', (error) => {
            console.error(`[Worker ${this.workerId}] Uncaught exception:`, error);
            this.cleanup();
        });
    }

    private async handleMessage(message: any) {
        switch (message.type) {
            case 'init':
                // Handle initialization data from orchestrator
                // Skip preloading - steps will be loaded during execution
                break;
            case 'execute':
                await this.executeScenario(message as ExecuteMessage);
                break;
            case 'terminate':
                await this.cleanup();
                process.exit(0);
                break;
        }
    }

    private async executeScenario(message: ExecuteMessage) {
        const startTime = Date.now();
        const result: ResultMessage = {
            type: 'result',
            scenarioId: message.scenarioId,
            status: 'failed',
            duration: 0,
            steps: [],
            artifacts: {
                screenshots: [],
                videos: []
            }
        };

        try {
            // Load configuration
            process.env.PROJECT = message.config.project || message.config.PROJECT;

            // Use already loaded modules (from preloadModules)
            const { CSBDDRunner } = require('../bdd/CSBDDRunner');
            const { CSConfigurationManager } = require('../core/CSConfigurationManager');
            const { CSBrowserManager } = require('../browser/CSBrowserManager');
            const { CSADOIntegration } = require('../ado/CSADOIntegration');
            const { CSADOTagExtractor } = require('../ado/CSADOTagExtractor');

            // Set up configuration
            const configManager = CSConfigurationManager.getInstance();

            // First manually set ADO configuration from environment variables
            // This ensures ADO works in worker processes
            const adoKeys = [
                'ADO_ENABLED', 'ADO_DRY_RUN', 'ADO_ORGANIZATION', 'ADO_PROJECT',
                'ADO_PAT', 'ADO_BASE_URL', 'ADO_API_VERSION', 'ADO_PLAN_ID',
                'ADO_SUITE_ID', 'ADO_TEST_PLAN_ID', 'ADO_TEST_SUITE_ID'
            ];

            for (const key of adoKeys) {
                const value = process.env[key];
                if (value !== undefined) {
                    configManager.set(key, value);
                }
            }

            // Map ADO_ENABLED to ADO_INTEGRATION_ENABLED (which is what the code uses)
            if (process.env.ADO_ENABLED) {
                configManager.set('ADO_INTEGRATION_ENABLED', process.env.ADO_ENABLED);
            }

            // Then set config from message
            for (const [key, value] of Object.entries(message.config)) {
                configManager.set(key, value);
            }

            // Now initialize ADO integration after config is set
            // Initialize ADO integration if enabled
            if (configManager.get('ADO_ENABLED') === 'true' || configManager.get('ADO_INTEGRATION_ENABLED') === 'true') {
                if (!this.adoIntegration) {
                    this.adoIntegration = CSADOIntegration.getInstance();
                    await this.adoIntegration.initialize(true); // true for worker mode
                }
            }

            // Create runner and browser manager if not already created
            if (!this.bddRunner) {
                this.bddRunner = CSBDDRunner.getInstance();
            }

            // Load step definitions for the project if not already loaded
            // This should be fast if already loaded in initializeWorker
            await this.bddRunner.loadProjectSteps(message.config.project || message.config.PROJECT);

            // Initialize browser manager if needed
            if (!this.browserManager) {
                this.browserManager = CSBrowserManager.getInstance();
                // Browser will be initialized on first use by the BDD runner
            }

            // Execute the scenario using the existing framework method
            // This will handle browser, context, steps, everything
            // Pass data-driven test parameters if provided
            const scenarioResult = await this.bddRunner.executeSingleScenarioForWorker(
                message.scenario,
                message.feature,
                { failFast: false },
                message.exampleRow,
                message.exampleHeaders,
                message.iterationNumber,
                message.totalIterations
            );

            // Map the result including all data from the scenario
            result.name = scenarioResult.name;  // Pass the interpolated scenario name
            result.status = scenarioResult.status;
            result.steps = scenarioResult.steps;
            result.artifacts = scenarioResult.artifacts || { screenshots: [], videos: [] };
            result.tags = scenarioResult.tags || [];  // Pass tags back
            result.startTime = scenarioResult.startTime;
            result.endTime = scenarioResult.endTime;
            result.testData = scenarioResult.testData;  // Pass test data for data-driven scenarios

            // Capture error and stack trace for failed tests
            if (result.status === 'failed') {
                result.error = scenarioResult.error;
                result.stackTrace = scenarioResult.stackTrace;
            }

            // Track if any test failed for HAR decision
            if (result.status === 'failed') {
                this.anyTestFailed = true;
            }

            // Capture any console logs
            const { CSParallelMediaHandler } = require('../parallel/CSParallelMediaHandler');
            const mediaHandler = CSParallelMediaHandler.getInstance();
            const logPath = await mediaHandler.saveConsoleLogs(message.scenario.name);
            if (logPath) {
                result.artifacts = result.artifacts || { screenshots: [], videos: [] };
                result.artifacts.logs = [logPath];
            }

            // Extract ADO metadata if integration is enabled
            if (configManager.getBoolean('ADO_INTEGRATION_ENABLED', false)) {
                const tagExtractor = CSADOTagExtractor.getInstance();
                const adoMetadata = tagExtractor.extractMetadata(message.scenario, message.feature);
                result.adoMetadata = adoMetadata;
            }

        } catch (error: any) {
            console.error(`[Worker ${this.workerId}] Error:`, error);
            result.status = 'failed';
            result.error = error.message;
            result.stackTrace = error.stack;
        } finally {
            // Handle browser reuse or close based on configuration
            try {
                if (this.browserManager) {
                    const { CSConfigurationManager } = require('../core/CSConfigurationManager');
                    const configManager = CSConfigurationManager.getInstance();
                    const browserReuseEnabled = configManager.getBoolean('BROWSER_REUSE_ENABLED', false);
                    const clearStateOnReuse = configManager.getBoolean('BROWSER_REUSE_CLEAR_STATE', true);
                    const closeAfterScenarios = configManager.getNumber('BROWSER_REUSE_CLOSE_AFTER_SCENARIOS', 0);

                    if (browserReuseEnabled) {
                        // Track scenario count for periodic browser restart
                        if (!this.scenarioCountForReuse) {
                            this.scenarioCountForReuse = 0;
                        }
                        this.scenarioCountForReuse++;

                        // Check if we should close browser after N scenarios
                        const shouldCloseBrowser = closeAfterScenarios > 0 &&
                                                 this.scenarioCountForReuse >= closeAfterScenarios;

                        if (shouldCloseBrowser) {
                            // Close and reset counter
                            console.log(`[Worker ${this.workerId}] Closing browser after ${this.scenarioCountForReuse} scenarios`);
                            await this.browserManager.close(result.status);
                            this.scenarioCountForReuse = 0;
                        } else {
                            // Keep browser open but clear state if configured
                            // Note: Trace saving is already handled by CSBDDRunner.executeSingleScenarioForWorker
                            // so we don't need to save it here to avoid duplicates
                            if (clearStateOnReuse) {
                                try {
                                    const context = this.browserManager.getContext();
                                    const page = this.browserManager.getPage();

                                    if (page && context) {
                                        // Step 1: Navigate to about:blank first to leave the application
                                        await page.goto('about:blank');

                                        // Step 2: Clear all cookies at context level
                                        await context.clearCookies();

                                        // Step 3: Clear permissions
                                        await context.clearPermissions();

                                        // Step 4: Clear localStorage and sessionStorage via JavaScript
                                        await page.evaluate(() => {
                                            try {
                                                localStorage.clear();
                                                sessionStorage.clear();
                                            } catch (e) {
                                                // Ignore errors on about:blank
                                            }
                                        });

                                        // Step 5: Clear the saved browser state to prevent restoration
                                        this.browserManager.clearBrowserState();

                                        console.log(`[Worker ${this.workerId}] Browser state completely cleared for reuse`);
                                    }
                                } catch (e) {
                                    console.debug(`[Worker ${this.workerId}] Failed to clear browser state: ${e}`);
                                }
                            } else {
                                console.log(`[Worker ${this.workerId}] Browser kept open for reuse (state not cleared)`);
                            }

                            // Restart trace recording for the next scenario (after state is cleared)
                            await (this.browserManager as any).restartTraceForNextScenario?.();
                        }
                    } else {
                        // Default behavior - close browser after each scenario
                        await this.browserManager.close(result.status);
                        console.log(`[Worker ${this.workerId}] Browser closed with status: ${result.status}`);
                    }
                }
            } catch (e) {
                // Ignore cleanup errors
                console.debug(`[Worker ${this.workerId}] Error during browser cleanup: ${e}`);
            }
        }

        result.duration = Date.now() - startTime;
        this.sendMessage(result);
    }

    private sendMessage(message: any) {
        try {
            if (process.send && process.connected) {
                process.send(message);
            } else {
                console.error(`[Worker ${this.workerId}] Cannot send message - process not connected`);
            }
        } catch (error) {
            console.error(`[Worker ${this.workerId}] Error sending message:`, error);
        }
    }

    private async cleanup() {
        try {
            // Close the browser when worker is terminating
            // Pass overall test status for proper HAR handling
            if (this.browserManager) {
                const finalStatus = this.anyTestFailed ? 'failed' : 'passed';
                console.log(`[Worker ${this.workerId}] Closing browser (overall: ${finalStatus})...`);
                await this.browserManager.closeAll(finalStatus);
                console.log(`[Worker ${this.workerId}] Browser closed, HAR saved if needed`);
            }

            if (this.bddRunner && typeof this.bddRunner.cleanup === 'function') {
                await this.bddRunner.cleanup();
            }
        } catch (e) {
            console.error(`[Worker ${this.workerId}] Error during cleanup:`, e);
        }
    }
}

// Start worker if run directly
if (require.main === module) {
    new WorkerProcess();
}

export { WorkerProcess };