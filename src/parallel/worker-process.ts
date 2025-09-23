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
}

interface ResultMessage {
    type: 'result';
    scenarioId: string;
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
}

class WorkerProcess {
    private workerId: number;
    private bddRunner: any;
    private browserManager: any;
    private browserInitialized: boolean = false;

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
                this.browserInitialized = true;
            }

            // Execute the scenario using the existing framework method
            // This will handle browser, context, steps, everything
            const scenarioResult = await this.bddRunner.executeSingleScenarioForWorker(
                message.scenario,
                message.feature,
                { failFast: false }
            );

            // Map the result including all data from the scenario
            result.status = scenarioResult.status;
            result.steps = scenarioResult.steps;
            result.artifacts = scenarioResult.artifacts || { screenshots: [], videos: [] };
            result.tags = scenarioResult.tags || [];  // Pass tags back
            result.startTime = scenarioResult.startTime;
            result.endTime = scenarioResult.endTime;

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
            // Only close pages, keep browser warm for next scenario
            try {
                if (this.browserManager && this.browserManager.context) {
                    const pages = this.browserManager.context.pages();
                    // Close all pages except keep context alive
                    for (const page of pages) {
                        await page.close().catch(() => {});
                    }
                }
            } catch (e) {
                // Ignore cleanup errors
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
            // Now fully close the browser when worker is terminating
            if (this.browserManager) {
                await this.browserManager.close();
            }

            if (this.bddRunner) {
                await this.bddRunner.cleanup();
            }
        } catch (e) {
            // Ignore cleanup errors
        }
    }
}

// Start worker if run directly
if (require.main === module) {
    new WorkerProcess();
}

export { WorkerProcess };