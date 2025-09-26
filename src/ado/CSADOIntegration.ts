/**
 * Azure DevOps Integration Hook
 * Integrates ADO publishing with the BDD test runner
 */

import { CSADOPublisher, ScenarioResult } from './CSADOPublisher';
import { CSADOTagExtractor } from './CSADOTagExtractor';
import { CSReporter } from '../reporter/CSReporter';
import { ParsedScenario, ParsedFeature } from '../bdd/CSBDDEngine';

export class CSADOIntegration {
    private static instance: CSADOIntegration;
    private publisher: CSADOPublisher;
    private tagExtractor: CSADOTagExtractor;
    private isInitialized: boolean = false;
    private isParallelMode: boolean = false;
    private allScenarios: Array<{scenario: ParsedScenario, feature: ParsedFeature}> = [];

    private constructor() {
        this.publisher = CSADOPublisher.getInstance();
        this.tagExtractor = CSADOTagExtractor.getInstance();
    }

    public static getInstance(): CSADOIntegration {
        if (!CSADOIntegration.instance) {
            CSADOIntegration.instance = new CSADOIntegration();
        }
        return CSADOIntegration.instance;
    }

    /**
     * Initialize ADO integration
     */
    public async initialize(isParallel: boolean = false): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        this.isParallelMode = isParallel;
        await this.publisher.initialize();
        this.isInitialized = true;

        if (this.publisher.isEnabled()) {
            CSReporter.info('Azure DevOps integration enabled');
        }
    }

    /**
     * Collect all scenarios that will be executed
     * This should be called before test execution starts
     */
    public async collectScenarios(scenarios: Array<{scenario: ParsedScenario, feature: ParsedFeature}>): Promise<void> {
        this.allScenarios = scenarios;
        if (this.publisher.isEnabled()) {
            // Collect test points from all scenarios
            await this.publisher.collectTestPoints(scenarios);
        }
    }

    /**
     * Called before test execution starts
     */
    public async beforeAllTests(testRunName?: string): Promise<void> {
        if (!this.publisher.isEnabled()) {
            return;
        }

        try {
            // Start test run with the collected test points
            await this.publisher.startTestRun(testRunName);
        } catch (error) {
            CSReporter.error(`Failed to start ADO test run: ${error}`);
        }
    }

    /**
     * Called before a scenario executes
     */
    public beforeScenario(scenario: ParsedScenario, feature: ParsedFeature): void {
        if (!this.publisher.isEnabled()) {
            return;
        }

        // Extract ADO metadata from tags
        const metadata = this.tagExtractor.extractMetadata(scenario, feature);

        // Log if scenario has ADO mapping
        if (metadata.testCaseIds.length > 0) {
            CSReporter.info(`Scenario mapped to ADO test cases: ${metadata.testCaseIds.join(', ')}`);
        }
    }

    /**
     * Called after a scenario completes
     */
    public async afterScenario(
        scenario: ParsedScenario,
        feature: ParsedFeature,
        status: 'passed' | 'failed' | 'skipped',
        duration: number,
        errorMessage?: string,
        artifacts?: any
    ): Promise<void> {
        if (!this.publisher.isEnabled()) {
            return;
        }

        const result: ScenarioResult = {
            scenario,
            feature,
            status,
            duration,
            errorMessage,
            artifacts
        };

        if (this.isParallelMode) {
            // In parallel mode, accumulate results for batch publishing
            this.publisher.addScenarioResult(result);
        } else {
            // In sequential mode, publish immediately
            await this.publisher.publishScenarioResult(result);
        }
    }

    /**
     * Called after all tests complete
     */
    public async afterAllTests(): Promise<void> {
        if (!this.publisher.isEnabled()) {
            return;
        }

        try {
            // In parallel mode, publish all accumulated results
            if (this.isParallelMode) {
                await this.publisher.publishAllResults();
            }

            // Complete the test run
            await this.publisher.completeTestRun();
        } catch (error) {
            CSReporter.error(`Failed to complete ADO test run: ${error}`);
        }
    }

    /**
     * Check if a scenario has ADO mapping
     */
    public hasADOMapping(scenario: ParsedScenario, feature: ParsedFeature): boolean {
        return this.tagExtractor.hasADOMapping(scenario, feature);
    }

    /**
     * Get ADO metadata for a scenario
     */
    public getADOMetadata(scenario: ParsedScenario, feature: ParsedFeature) {
        return this.tagExtractor.extractMetadata(scenario, feature);
    }

    /**
     * Create result object from worker result (for parallel execution)
     */
    public createScenarioResultFromWorker(
        workerResult: any,
        scenario: ParsedScenario,
        feature: ParsedFeature
    ): ScenarioResult {
        return {
            scenario,
            feature,
            status: workerResult.status || 'skipped',
            duration: workerResult.duration || 0,
            errorMessage: workerResult.error,
            artifacts: workerResult.artifacts
        };
    }

    /**
     * Check if ADO integration is enabled
     */
    public isEnabled(): boolean {
        return this.publisher.isEnabled();
    }
}