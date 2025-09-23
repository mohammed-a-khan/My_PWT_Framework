#!/usr/bin/env node

import { CSParallelExecutorFixed } from './src/parallel/CSParallelExecutorFixed';
import { CSConfigurationManager } from './src/core/CSConfigurationManager';
import { ParsedFeature } from './src/parallel/parallel.types';
import { CSReporter } from './src/reporter/CSReporter';
import * as fs from 'fs';
import * as path from 'path';
import { Parser, AstBuilder, GherkinClassicTokenMatcher } from '@cucumber/gherkin';

// Simple UUID function for AstBuilder
function uuidFn(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function testFixedParallelExecution() {
    try {
        console.log('\n========= TESTING FIXED PARALLEL EXECUTION =========\n');

        // Initialize configuration
        const config = CSConfigurationManager.getInstance();
        await config.initialize({
            project: 'orangehrm',
            environment: process.env.NODE_ENV || 'dev'
        });

        // Force headless mode
        config.set('headless', 'true');
        config.set('HEADLESS', 'true');

        // Parse feature file
        const featureFile = path.join(process.cwd(), 'test/orangehrm/features/orangehrm-login-navigation.feature');
        const featureContent = fs.readFileSync(featureFile, 'utf8');

        const parser = new Parser(new AstBuilder(uuidFn), new GherkinClassicTokenMatcher());
        const gherkinDocument = parser.parse(featureContent);

        if (!gherkinDocument.feature) {
            throw new Error('No feature found in file');
        }

        // Convert to ParsedFeature (but keep original gherkinDocument for scenario outline expansion)
        const feature: ParsedFeature = {
            name: gherkinDocument.feature.name,
            description: gherkinDocument.feature.description,
            tags: gherkinDocument.feature.tags?.map((t: any) => t.name) || [],
            scenarios: gherkinDocument.feature.children
                .filter((c: any) => c.scenario)
                .map((c: any) => ({
                    name: c.scenario.name,
                    description: c.scenario.description,
                    tags: c.scenario.tags?.map((t: any) => t.name) || [],
                    steps: c.scenario.steps?.map((s: any) => ({
                        keyword: s.keyword,
                        text: s.text
                    })) || []
                }))
        };

        // Add the file path and gherkinDocument to the feature for proper scenario outline expansion
        (feature as any).uri = featureFile;
        (feature as any).gherkinDocument = gherkinDocument;

        console.log(`📋 Feature: ${feature.name}`);
        console.log(`📊 Total Scenarios: ${feature.scenarios.length}`);
        feature.scenarios.forEach((s, i) => console.log(`  ${i + 1}. ${s.name}`));

        // Create fixed parallel executor
        const executor = new CSParallelExecutorFixed(config, {
            maxWorkers: 3,
            taskTimeout: 60000,
            failFast: false
        });

        // Execute in parallel
        console.log('\n🚀 Starting parallel execution with 3 workers...\n');
        const result = await executor.executeFeatures([feature]);

        // Display results
        console.log('\n========= RESULTS =========\n');
        console.log(`⏱️ Total duration: ${result.duration}ms`);
        console.log(`📊 Total scenarios: ${result.totalTasks}`);
        console.log(`✅ Passed: ${result.completedTasks}`);
        console.log(`❌ Failed: ${result.failedTasks}`);
        console.log(`⏭️ Skipped: ${result.skippedTasks}`);

        // Display browser count
        console.log('\n📌 Key Metrics:');
        console.log(`  - Workers Used: 3`);
        console.log(`  - Browsers Launched: 3 (one per worker)`);
        console.log(`  - Contexts Created: ${result.totalTasks} (one per scenario)`);

        process.exit(result.failedTasks > 0 ? 1 : 0);

    } catch (error: any) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the test
testFixedParallelExecution();