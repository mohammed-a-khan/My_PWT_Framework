/**
 * Azure DevOps Tag Extractor
 * Extracts ADO metadata from scenario tags
 * Supports multiple test case IDs per scenario
 */

import { ParsedScenario, ParsedFeature } from '../bdd/CSBDDEngine';
import { CSReporter } from '../reporter/CSReporter';

export interface ADOMetadata {
    testPlanId?: number;
    testSuiteId?: number;
    testCaseId?: number;  // Primary test case ID
    testCaseIds: number[];  // All test case IDs (supports multiple)
    buildId?: string;
    releaseId?: string;
}

export class CSADOTagExtractor {
    private static instance: CSADOTagExtractor;

    // Patterns for extracting IDs from tags
    private static readonly PATTERNS = {
        // @TestCaseId:419 or @TestCaseId:{419,420,421}
        TEST_CASE: /@TestCaseId:(?:\{([^}]+)\}|(\d+))/i,
        // @TestPlanId:417
        TEST_PLAN: /@TestPlanId:(\d+)/i,
        // @TestSuiteId:418
        TEST_SUITE: /@TestSuiteId:(\d+)/i,
        // @BuildId:123
        BUILD: /@BuildId:(\d+)/i,
        // @ReleaseId:456
        RELEASE: /@ReleaseId:(\d+)/i,
    };

    private constructor() {}

    public static getInstance(): CSADOTagExtractor {
        if (!CSADOTagExtractor.instance) {
            CSADOTagExtractor.instance = new CSADOTagExtractor();
        }
        return CSADOTagExtractor.instance;
    }

    /**
     * Extract ADO metadata from scenario and feature tags
     * Supports multiple test case IDs in format: @TestCaseId:{419,420,421}
     */
    public extractMetadata(scenario: ParsedScenario, feature?: ParsedFeature): ADOMetadata {
        const metadata: ADOMetadata = {
            testCaseIds: []
        };

        // Combine tags from scenario and feature (scenario takes precedence)
        const scenarioTags = scenario.tags || [];
        const featureTags = feature?.tags || [];
        const allTags = [...scenarioTags, ...featureTags];

        CSReporter.debug(`Extracting ADO metadata from tags: ${allTags.join(', ')}`);

        // Process each tag
        for (const tag of allTags) {
            this.extractTestCaseIds(tag, metadata);
            this.extractTestPlanId(tag, metadata);
            this.extractTestSuiteId(tag, metadata);
            this.extractBuildId(tag, metadata);
            this.extractReleaseId(tag, metadata);
        }

        // Set primary test case ID (first one in the list)
        if (metadata.testCaseIds.length > 0) {
            metadata.testCaseId = metadata.testCaseIds[0];
        }

        if (metadata.testCaseIds.length > 0 || metadata.testPlanId || metadata.testSuiteId) {
            CSReporter.info(`ADO Metadata extracted: Plan=${metadata.testPlanId}, Suite=${metadata.testSuiteId}, TestCases=[${metadata.testCaseIds.join(', ')}]`);
        }

        return metadata;
    }

    /**
     * Extract test case IDs from tag
     * Supports both single ID and multiple IDs in curly braces
     */
    private extractTestCaseIds(tag: string, metadata: ADOMetadata): void {
        const match = tag.match(CSADOTagExtractor.PATTERNS.TEST_CASE);
        if (match) {
            if (match[1]) {
                // Multiple IDs in format: {419,420,421}
                const ids = match[1].split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
                for (const id of ids) {
                    if (!metadata.testCaseIds.includes(id)) {
                        metadata.testCaseIds.push(id);
                    }
                }
                CSReporter.debug(`Found multiple test case IDs: ${ids.join(', ')}`);
            } else if (match[2]) {
                // Single ID
                const id = parseInt(match[2]);
                if (!isNaN(id) && !metadata.testCaseIds.includes(id)) {
                    metadata.testCaseIds.push(id);
                    CSReporter.debug(`Found test case ID: ${id}`);
                }
            }
        }
    }

    /**
     * Extract test plan ID from tag
     */
    private extractTestPlanId(tag: string, metadata: ADOMetadata): void {
        if (!metadata.testPlanId) {
            const match = tag.match(CSADOTagExtractor.PATTERNS.TEST_PLAN);
            if (match) {
                metadata.testPlanId = parseInt(match[1]);
                CSReporter.debug(`Found test plan ID: ${metadata.testPlanId}`);
            }
        }
    }

    /**
     * Extract test suite ID from tag
     */
    private extractTestSuiteId(tag: string, metadata: ADOMetadata): void {
        if (!metadata.testSuiteId) {
            const match = tag.match(CSADOTagExtractor.PATTERNS.TEST_SUITE);
            if (match) {
                metadata.testSuiteId = parseInt(match[1]);
                CSReporter.debug(`Found test suite ID: ${metadata.testSuiteId}`);
            }
        }
    }

    /**
     * Extract build ID from tag
     */
    private extractBuildId(tag: string, metadata: ADOMetadata): void {
        if (!metadata.buildId) {
            const match = tag.match(CSADOTagExtractor.PATTERNS.BUILD);
            if (match) {
                metadata.buildId = match[1];
                CSReporter.debug(`Found build ID: ${metadata.buildId}`);
            }
        }
    }

    /**
     * Extract release ID from tag
     */
    private extractReleaseId(tag: string, metadata: ADOMetadata): void {
        if (!metadata.releaseId) {
            const match = tag.match(CSADOTagExtractor.PATTERNS.RELEASE);
            if (match) {
                metadata.releaseId = match[1];
                CSReporter.debug(`Found release ID: ${metadata.releaseId}`);
            }
        }
    }

    /**
     * Check if scenario has ADO mapping
     */
    public hasADOMapping(scenario: ParsedScenario, feature?: ParsedFeature): boolean {
        const metadata = this.extractMetadata(scenario, feature);
        return metadata.testCaseIds.length > 0 ||
               !!metadata.testPlanId ||
               !!metadata.testSuiteId;
    }

    /**
     * Format ADO tags for display
     */
    public formatADOTags(metadata: ADOMetadata): string[] {
        const tags: string[] = [];

        if (metadata.testPlanId) {
            tags.push(`@TestPlanId:${metadata.testPlanId}`);
        }

        if (metadata.testSuiteId) {
            tags.push(`@TestSuiteId:${metadata.testSuiteId}`);
        }

        if (metadata.testCaseIds.length > 0) {
            if (metadata.testCaseIds.length === 1) {
                tags.push(`@TestCaseId:${metadata.testCaseIds[0]}`);
            } else {
                tags.push(`@TestCaseId:{${metadata.testCaseIds.join(',')}}`);
            }
        }

        return tags;
    }

    /**
     * Parse test case IDs from string (supports various formats)
     */
    public parseTestCaseIds(value: string): number[] {
        const ids: number[] = [];

        // Remove surrounding braces if present
        value = value.replace(/^\{|\}$/g, '');

        // Split by comma and parse each ID
        const parts = value.split(',');
        for (const part of parts) {
            const id = parseInt(part.trim());
            if (!isNaN(id) && !ids.includes(id)) {
                ids.push(id);
            }
        }

        return ids;
    }

    /**
     * Create a combined tag for multiple test cases
     */
    public createMultipleTestCaseTag(ids: number[]): string {
        if (ids.length === 0) {
            return '';
        }
        if (ids.length === 1) {
            return `@TestCaseId:${ids[0]}`;
        }
        return `@TestCaseId:{${ids.join(',')}}`;
    }
}