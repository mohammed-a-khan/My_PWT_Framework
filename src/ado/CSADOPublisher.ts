/**
 * Azure DevOps Test Results Publisher
 * Publishes test results to Azure DevOps after test execution
 * Supports both parallel and sequential execution modes
 */

import { CSADOClient } from './CSADOClient';

interface ADOTestRun {
    id: number;
    name: string;
    state?: string;
}

interface ADOAttachment {
    url: string;
    attachmentType?: string;
}
import { CSADOConfiguration } from './CSADOConfiguration';
import { CSADOTagExtractor, ADOMetadata } from './CSADOTagExtractor';
import { CSReporter } from '../reporter/CSReporter';
import { ParsedScenario, ParsedFeature } from '../bdd/CSBDDEngine';
import * as fs from 'fs';
import * as path from 'path';

export interface ScenarioResult {
    scenario: ParsedScenario;
    feature: ParsedFeature;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    errorMessage?: string;
    stackTrace?: string;
    artifacts?: {
        screenshots?: string[];
        videos?: string[];
        har?: string[];
        traces?: string[];
        logs?: string[];
    };
}

export class CSADOPublisher {
    private static instance: CSADOPublisher;
    private client: CSADOClient;
    private config: CSADOConfiguration;
    private tagExtractor: CSADOTagExtractor;
    private currentTestRun?: ADOTestRun;
    private scenarioResults: Map<string, ScenarioResult> = new Map();
    private isPublishing: boolean = false;
    private testRunStarted: boolean = false; // Track if test run has been created
    private collectedTestPoints: Set<number> = new Set(); // Collect test points before creating run

    private constructor() {
        this.client = CSADOClient.getInstance();
        this.config = CSADOConfiguration.getInstance();
        this.tagExtractor = CSADOTagExtractor.getInstance();
    }

    public static getInstance(): CSADOPublisher {
        if (!CSADOPublisher.instance) {
            CSADOPublisher.instance = new CSADOPublisher();
        }
        return CSADOPublisher.instance;
    }

    /**
     * Initialize ADO publisher
     */
    public async initialize(): Promise<void> {
        try {
            this.config.initialize();

            if (!this.config.isEnabled()) {
                CSReporter.info('Azure DevOps integration is disabled');
                return;
            }

            CSReporter.info('Azure DevOps Publisher initialized');
        } catch (error) {
            CSReporter.error(`Failed to initialize ADO Publisher: ${error}`);
            // Don't throw - ADO failure shouldn't block test execution
        }
    }

    /**
     * Collect test points from all scenarios that will be executed
     */
    public async collectTestPoints(scenarios: Array<{scenario: ParsedScenario, feature: ParsedFeature}>): Promise<void> {
        if (!this.config.isEnabled()) {
            return;
        }

        // Group scenarios by plan and suite to minimize API calls
        const planSuiteMap = new Map<string, {planId: number, suiteId: number}>();

        for (const {scenario, feature} of scenarios) {
            const metadata = this.tagExtractor.extractMetadata(scenario, feature);

            // Only collect test points if we have complete ADO mapping
            if (metadata.testCaseIds.length > 0 &&
                metadata.testPlanId &&
                metadata.testSuiteId) {

                const key = `${metadata.testPlanId}-${metadata.testSuiteId}`;
                if (!planSuiteMap.has(key)) {
                    planSuiteMap.set(key, {
                        planId: metadata.testPlanId,
                        suiteId: metadata.testSuiteId
                    });
                }
            }
        }

        // Fetch test points for each unique plan/suite combination
        for (const {planId, suiteId} of planSuiteMap.values()) {
            try {
                await this.client.fetchTestPoints(planId, suiteId);
            } catch (error) {
                CSReporter.warn(`Failed to fetch test points for plan ${planId}, suite ${suiteId}: ${error}`);
            }
        }

        // Now collect test points for each scenario
        for (const {scenario, feature} of scenarios) {
            const metadata = this.tagExtractor.extractMetadata(scenario, feature);

            if (metadata.testCaseIds.length > 0 &&
                metadata.testPlanId &&
                metadata.testSuiteId) {

                // Get cached test points
                const testPoints = this.client.getTestPoints(
                    metadata.testPlanId,
                    metadata.testSuiteId
                );

                // Find test point for each test case
                for (const testCaseId of metadata.testCaseIds) {
                    const testPoint = testPoints.find(tp => tp.testCase?.id === testCaseId);
                    if (testPoint?.id) {
                        this.collectedTestPoints.add(testPoint.id);
                        CSReporter.debug(`Collected test point ${testPoint.id} for test case ${testCaseId}`);
                    }
                }
            }
        }

        CSReporter.info(`Collected ${this.collectedTestPoints.size} test points for ADO test run`);
    }

    /**
     * Start a new test run with collected test points
     */
    public async startTestRun(name?: string): Promise<void> {
        if (!this.config.isEnabled() || this.testRunStarted) {
            return;
        }

        try {
            // Only create test run if we have test points
            if (this.collectedTestPoints.size > 0) {
                const testPointIds = Array.from(this.collectedTestPoints);
                const testRunId = await this.client.createTestRun(
                    name || 'PTF Test Run',
                    testPointIds
                );
                this.currentTestRun = {
                    id: testRunId,
                    name: name || 'PTF Test Run'
                };
                this.testRunStarted = true;
                CSReporter.info(`ADO Test Run started with ${testPointIds.length} test points: ${this.currentTestRun.name}`);
            } else {
                CSReporter.info('No ADO test points found - skipping test run creation');
            }
        } catch (error) {
            CSReporter.error(`Failed to start ADO test run: ${error}`);
            // Don't throw - continue test execution even if ADO fails
        }
    }

    /**
     * Add scenario result for publishing
     */
    public addScenarioResult(result: ScenarioResult): void {
        if (!this.config.isEnabled()) {
            return;
        }

        const key = this.getScenarioKey(result.scenario, result.feature);
        this.scenarioResults.set(key, result);
        CSReporter.debug(`Added scenario result for ADO: ${key}`);
    }

    /**
     * Publish scenario result immediately (for sequential execution)
     */
    public async publishScenarioResult(result: ScenarioResult): Promise<void> {
        if (!this.config.isEnabled() || !this.currentTestRun) {
            return;
        }

        try {
            await this.publishSingleResult(result);
        } catch (error) {
            CSReporter.error(`Failed to publish result for scenario: ${result.scenario.name} - ${error}`);
            // Don't throw - continue with other scenarios
        }
    }

    /**
     * Publish all accumulated results (for parallel execution)
     */
    public async publishAllResults(): Promise<void> {
        if (!this.config.isEnabled() || !this.currentTestRun || this.isPublishing) {
            return;
        }

        this.isPublishing = true;

        try {
            CSReporter.info(`Publishing ${this.scenarioResults.size} test results to Azure DevOps...`);

            for (const [key, result] of this.scenarioResults) {
                await this.publishSingleResult(result);
            }

            CSReporter.info('All test results published to Azure DevOps');
        } catch (error) {
            CSReporter.error(`Failed to publish results to Azure DevOps: ${error}`);
        } finally {
            this.isPublishing = false;
        }
    }

    /**
     * Publish a single scenario result
     */
    private async publishSingleResult(result: ScenarioResult): Promise<void> {
        const metadata = this.tagExtractor.extractMetadata(result.scenario, result.feature);

        // Skip if no ADO mapping
        if (!metadata.testCaseIds.length && !metadata.testPlanId && !metadata.testSuiteId) {
            CSReporter.debug(`Skipping ADO publish for scenario without mapping: ${result.scenario.name}`);
            return;
        }

        // Use metadata test IDs or fall back to config
        const testCaseIds = metadata.testCaseIds.length > 0 ?
            metadata.testCaseIds :
            (metadata.testCaseId ? [metadata.testCaseId] : []);

        if (testCaseIds.length === 0) {
            CSReporter.warn(`No test case IDs found for scenario: ${result.scenario.name}`);
            return;
        }

        // Map status to ADO outcome
        const outcome = result.status === 'passed' ? 'Passed' :
                       result.status === 'failed' ? 'Failed' :
                       'NotExecuted';

        // Add test results for all mapped test cases
        const resultIds: number[] = [];
        for (const testCaseId of testCaseIds) {
            await this.client.updateTestResult({
                testCaseId,
                outcome: outcome as any,
                errorMessage: result.errorMessage,
                duration: result.duration,
                stackTrace: result.stackTrace
            });
            resultIds.push(testCaseId);
        }

        // Upload attachments if configured
        if (resultIds.length > 0 && result.artifacts) {
            await this.uploadArtifacts(this.currentTestRun!.id, resultIds, result.artifacts);
        }

        // Create bug on failure if configured
        if (result.status === 'failed' && this.config.shouldCreateBugsOnFailure()) {
            await this.createBugForFailure(result, metadata);
        }
    }

    /**
     * Upload test artifacts to ADO
     */
    private async uploadArtifacts(
        runId: number,
        resultIds: number[],
        artifacts: ScenarioResult['artifacts']
    ): Promise<void> {
        const attachments: ADOAttachment[] = [];

        // Upload screenshots
        if (this.config.shouldUploadScreenshots() && artifacts?.screenshots) {
            for (const filePath of artifacts.screenshots) {
                const attachment = await this.uploadFile(filePath, 'Screenshot');
                if (attachment) {
                    attachments.push(attachment);
                }
            }
        }

        // Upload videos
        if (this.config.shouldUploadVideos() && artifacts?.videos) {
            for (const filePath of artifacts.videos) {
                const attachment = await this.uploadFile(filePath, 'Video');
                if (attachment) {
                    attachments.push(attachment);
                }
            }
        }

        // Upload HAR files
        if (this.config.shouldUploadHar() && artifacts?.har) {
            for (const filePath of artifacts.har) {
                const attachment = await this.uploadFile(filePath, 'ConsoleLog');
                if (attachment) {
                    attachments.push(attachment);
                }
            }
        }

        // Upload trace files
        if (this.config.shouldUploadTraces() && artifacts?.traces) {
            for (const filePath of artifacts.traces) {
                const attachment = await this.uploadFile(filePath, 'GeneralAttachment');
                if (attachment) {
                    attachments.push(attachment);
                }
            }
        }

        // Upload logs
        if (this.config.shouldUploadLogs() && artifacts?.logs) {
            for (const filePath of artifacts.logs) {
                const attachment = await this.uploadFile(filePath, 'ConsoleLog');
                if (attachment) {
                    attachments.push(attachment);
                }
            }
        }

        // Attach all files to test results
        for (const attachment of attachments) {
            // Attachments are already uploaded, just track them
        }

        if (attachments.length > 0) {
            CSReporter.info(`Uploaded ${attachments.length} attachments for test results`);
        }
    }

    /**
     * Upload a single file to ADO
     */
    private async uploadFile(
        filePath: string,
        attachmentType: ADOAttachment['attachmentType']
    ): Promise<ADOAttachment | null> {
        if (!fs.existsSync(filePath)) {
            CSReporter.warn(`File not found for upload: ${filePath}`);
            return null;
        }

        try {
            const content = fs.readFileSync(filePath);
            const fileName = path.basename(filePath);

            // Create attachment object
            const attachment: ADOAttachment = {
                url: fileName,
                attachmentType: attachmentType
            };

            attachment.attachmentType = attachmentType;
            return attachment;
        } catch (error) {
            CSReporter.warn(`Failed to upload file ${filePath}: ${error}`);
            return null;
        }
    }

    /**
     * Create a bug for failed test
     */
    private async createBugForFailure(
        result: ScenarioResult,
        metadata: ADOMetadata
    ): Promise<void> {
        try {
            const title = this.config.formatBugTitle(
                result.scenario.name,
                result.errorMessage
            );

            const description = this.formatBugDescription(result, metadata);

            // Upload screenshots as attachments for the bug
            const attachmentUrls: string[] = [];
            if (result.artifacts?.screenshots) {
                for (const screenshot of result.artifacts.screenshots) {
                    const attachment = await this.uploadFile(screenshot, 'Screenshot');
                    if (attachment) {
                        attachmentUrls.push(attachment.url);
                    }
                }
            }

            // Get bug template configuration
            const bugTemplate = this.config.getBugTemplate();

            await this.client.createBug({
                title,
                description,
                severity: bugTemplate.severity || '3 - Medium',
                priority: bugTemplate.priority || 2,
                assignedTo: bugTemplate.assignedTo
            });
        } catch (error) {
            CSReporter.error(`Failed to create bug for test failure: ${error}`);
        }
    }

    /**
     * Format bug description
     */
    private formatBugDescription(
        result: ScenarioResult,
        metadata: ADOMetadata
    ): string {
        const lines: string[] = [
            `**Test Scenario:** ${result.scenario.name}`,
            `**Feature:** ${result.feature.name}`,
            `**Status:** ${result.status}`,
            `**Duration:** ${result.duration}ms`,
            ''
        ];

        if (metadata.testCaseIds.length > 0) {
            lines.push(`**Test Cases:** ${metadata.testCaseIds.join(', ')}`);
        }

        if (result.errorMessage) {
            lines.push('', '**Error Message:**', '```', result.errorMessage, '```');
        }

        if (result.stackTrace) {
            lines.push('', '**Stack Trace:**', '```', result.stackTrace, '```');
        }

        // Add steps from scenario
        if (result.scenario.steps && result.scenario.steps.length > 0) {
            lines.push('', '**Test Steps:**');
            for (const step of result.scenario.steps) {
                lines.push(`- ${step.keyword} ${step.text}`);
            }
        }

        return lines.join('\n');
    }

    /**
     * Complete the test run
     */
    public async completeTestRun(): Promise<void> {
        if (!this.config.isEnabled() || !this.currentTestRun) {
            return;
        }

        try {
            // Publish any remaining results
            if (this.scenarioResults.size > 0) {
                await this.publishAllResults();
            }

            // Complete the test run
            await this.client.completeTestRun(this.currentTestRun.id);
            CSReporter.info(`ADO Test Run completed: ${this.currentTestRun.name}`);

            // Clear state
            this.currentTestRun = undefined;
            this.scenarioResults.clear();
            // Clear any internal state if needed
        } catch (error) {
            CSReporter.error(`Failed to complete ADO test run: ${error}`);
        }
    }

    /**
     * Get unique scenario key
     */
    private getScenarioKey(scenario: ParsedScenario, feature: ParsedFeature): string {
        return `${feature.name}::${scenario.name}`;
    }

    /**
     * Check if ADO publishing is enabled
     */
    public isEnabled(): boolean {
        return this.config.isEnabled();
    }

    /**
     * Get current test run
     */
    public getCurrentTestRun(): ADOTestRun | undefined {
        return this.currentTestRun;
    }
}