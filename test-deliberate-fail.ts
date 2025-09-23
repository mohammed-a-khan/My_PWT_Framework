import { CSBDDRunner } from './src/bdd/CSBDDRunner';
import { CSConfigurationManager } from './src/core/CSConfigurationManager';
import * as fs from 'fs';

// Create a feature file with a step that will fail
const featureContent = `
Feature: Test Failure
  Testing screenshot and action capture

  Scenario: Test with deliberate failure
    Given I navigate to "https://opensource-demo.orangehrmlive.com/"
    When I wait for 2 seconds
    Then I verify page title contains "WRONG TITLE THAT WILL FAIL"
`;

// Write feature file
fs.writeFileSync('/mnt/e/PTF-main/test/orangehrm/features/test-deliberate-fail.feature', featureContent);

async function testFailure() {
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
        await runner.run({
            features: 'test/orangehrm/features/test-deliberate-fail.feature',
            parallel: false
        });
    } catch (error) {
        console.log('Test failed as expected');
    }

    // Check if screenshot was captured
    const screenshotDir = 'test-results/test-results-*/screenshots';
    console.log('\nChecking for screenshots...');
    const screenshots = require('glob').sync(`${screenshotDir}/*.png`);
    console.log('Screenshots found:', screenshots);

    // Check HTML report
    const reportPath = require('glob').sync('test-results/test-results-*/reports/index.html')[0];
    if (reportPath && fs.existsSync(reportPath)) {
        const reportContent = fs.readFileSync(reportPath, 'utf-8');
        const hasScreenshot = reportContent.includes('screenshot') || reportContent.includes('.png');
        const hasActions = reportContent.includes('action') || reportContent.includes('Action');
        console.log('\nReport analysis:');
        console.log('- Has screenshot references:', hasScreenshot);
        console.log('- Has action references:', hasActions);
    }
}

testFailure().catch(console.error);