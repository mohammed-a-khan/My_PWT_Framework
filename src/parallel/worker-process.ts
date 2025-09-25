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
}

class WorkerProcess {
    private workerId: number;
    private bddRunner: any;
    private browserManager: any;
    private scenarioCountForReuse: number = 0;

    constructor() {
        this.workerId = parseInt(process.env.WORKER_ID || '0');
        process.env.IS_WORKER = 'true';
        process.env.WORKER_ID = String(this.workerId);

        this.setupProcessHandlers();

        // Send ready message after a small delay to ensure IPC is ready
        process.nextTick(() => {
            this.sendMessage({ type: 'ready', workerId: this.workerId });
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

            // Set up configuration
            const configManager = CSConfigurationManager.getInstance();
            for (const [key, value] of Object.entries(message.config)) {
                configManager.set(key, value);
            }

            // Create runner and browser manager if not already created
            if (!this.bddRunner) {
                this.bddRunner = CSBDDRunner.getInstance();
                // Load step definitions for the project
                await this.bddRunner.loadProjectSteps(message.config.project || message.config.PROJECT);
            }

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

            // Capture any console logs
            const { CSParallelMediaHandler } = require('../parallel/CSParallelMediaHandler');
            const mediaHandler = CSParallelMediaHandler.getInstance();
            const logPath = await mediaHandler.saveConsoleLogs(message.scenario.name);
            if (logPath) {
                result.artifacts = result.artifacts || { screenshots: [], videos: [] };
                result.artifacts.logs = [logPath];
            }

        } catch (error: any) {
            console.error(`[Worker ${this.workerId}] Error:`, error);
            result.status = 'failed';
            result.error = error.message;
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
                                    if (context) {
                                        // Clear cookies and local storage
                                        await context.clearCookies();
                                        await context.clearPermissions();

                                        // Navigate to blank page to clear any page state
                                        const page = this.browserManager.getPage();
                                        if (page && !page.isClosed()) {
                                            await page.goto('about:blank');
                                        }

                                        console.log(`[Worker ${this.workerId}] Browser state cleared for reuse`);
                                    }
                                } catch (e) {
                                    console.debug(`[Worker ${this.workerId}] Failed to clear browser state: ${e}`);
                                }
                            } else {
                                console.log(`[Worker ${this.workerId}] Browser kept open for reuse (state not cleared)`);
                            }
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
        if (process.send) {
            process.send(message);
        }
    }

    private async cleanup() {
        try {
            // Close the browser when worker is terminating
            // Use closeAll() to ensure HAR files are saved but skip extra trace save
            if (this.browserManager) {
                console.log(`[Worker ${this.workerId}] Closing browser and saving HAR files...`);
                await this.browserManager.closeAll();
                console.log(`[Worker ${this.workerId}] Browser closed, HAR files should be saved`);
            }

            if (this.bddRunner) {
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