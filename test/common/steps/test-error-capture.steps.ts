import { When, Then } from '../../../src/bdd/decorators';

export class TestErrorCaptureSteps {
    @When('I test with {string}')
    async testAction(action: string): Promise<void> {
        if (action === 'fail') {
            throw new Error('Deliberate test failure for testing error capture');
        } else if (action === 'error') {
            throw new Error('Simulated error with stack trace');
        }
        // 'pass' does nothing - test passes
    }

    @Then('the test should {string}')
    async testResult(expectedResult: string): Promise<void> {
        if (expectedResult === 'fail') {
            throw new Error(`Expected failure - This is the error message that should appear in ADO`);
        } else if (expectedResult === 'error') {
            const error = new Error('Expected error with detailed stack trace');
            error.stack = `Error: Expected error with detailed stack trace
    at TestErrorCaptureSteps.testResult (/test/common/steps/test-error-capture.steps.ts:18:23)
    at async CSBDDRunner.executeStep (/src/bdd/CSBDDRunner.ts:1234:15)
    at async CSBDDRunner.executeScenario (/src/bdd/CSBDDRunner.ts:987:20)`;
            throw error;
        }
        // 'pass' does nothing - test passes
    }
}