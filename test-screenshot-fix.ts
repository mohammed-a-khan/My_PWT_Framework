import { CSBDDRunner } from './src/bdd/CSBDDRunner';
import { CSConfigurationManager } from './src/core/CSConfigurationManager';
import * as fs from 'fs';
import * as glob from 'glob';

// Test configuration
async function testScreenshotCapture() {
    console.log('\n=== Testing Screenshot and Action Capture ===\n');

    const config = CSConfigurationManager.getInstance();
    await config.initialize({
        PROJECT: 'orangehrm',
        HEADLESS: 'true',
        BROWSER_VIDEO: 'off',
        SCREENSHOT_CAPTURE_MODE: 'on-failure-only',
        SCREENSHOT_ON_FAILURE: 'true'
    });

    const runner = CSBDDRunner.getInstance();

    try {
        // Run test that has a deliberate failure
        await runner.run({
            features: 'test/orangehrm/features/test-failure.feature',
            parallel: false
        });
    } catch (error) {
        console.log('Test failed as expected');
    }

    // Check test results
    const resultDirs = glob.sync('reports/test-results-*/');
    const latestDir = resultDirs.sort().pop();

    if (latestDir) {
        // Check for screenshots
        const screenshots = glob.sync(`${latestDir}/screenshots/*.png`);
        console.log(`\n✅ Screenshots captured: ${screenshots.length}`);
        screenshots.forEach(s => console.log(`   - ${s}`));

        // Check report data
        const reportDataPath = `${latestDir}/reports/report-data.json`;
        if (fs.existsSync(reportDataPath)) {
            const reportData = JSON.parse(fs.readFileSync(reportDataPath, 'utf-8'));
            const scenario = reportData.suite.scenarios[0];

            if (scenario) {
                console.log(`\n✅ Scenario: ${scenario.name}`);
                console.log(`   Status: ${scenario.status}`);

                scenario.steps.forEach((step: any, index: number) => {
                    console.log(`\n   Step ${index + 1}: ${step.name}`);
                    console.log(`     - Status: ${step.status}`);
                    console.log(`     - Screenshot: ${step.screenshot || 'None'}`);
                    console.log(`     - Actions: ${step.actions?.length || 0}`);

                    if (step.actions && step.actions.length > 0) {
                        step.actions.forEach((action: any) => {
                            console.log(`       * ${action.name || action}`);
                        });
                    }
                });
            }
        }
    }
}

testScreenshotCapture().catch(console.error);