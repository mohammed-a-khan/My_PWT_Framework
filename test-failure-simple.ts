import { CSBDDRunner } from './src/bdd/CSBDDRunner';
import { CSConfigurationManager } from './src/core/CSConfigurationManager';

async function testFailure() {
    const config = CSConfigurationManager.getInstance();
    await config.initialize({
        PROJECT: 'orangehrm',
        HEADLESS: 'true',
        BROWSER_VIDEO: 'off',
        SCREENSHOT_CAPTURE_MODE: 'on-failure-only',
        SCREENSHOT_ON_FAILURE: 'true',
        SCREENSHOT_FULL_PAGE: 'false'
    });

    const runner = CSBDDRunner.getInstance();
    await runner.run({
        features: 'test/orangehrm/features/test-failure.feature',
        parallel: false
    });
}

testFailure().catch(console.error);