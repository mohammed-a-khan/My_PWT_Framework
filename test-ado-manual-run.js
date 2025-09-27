/**
 * Test script to check if Azure DevOps accepts iterationDetails
 * when creating a MANUAL test run (not from test points)
 */

const https = require('https');

// Configuration
const ADO_ORGANIZATION = process.env.ADO_ORGANIZATION || 'mdakhan';
const ADO_PROJECT = process.env.ADO_PROJECT || 'myproject';
const ADO_PAT = process.env.ADO_PAT || '';
const TEST_PLAN_ID = 417;
const TEST_CASE_ID = 419;

if (!ADO_PAT) {
    console.error('Please set ADO_PAT environment variable');
    process.exit(1);
}

const baseUrl = `https://dev.azure.com/${ADO_ORGANIZATION}/${ADO_PROJECT}/_apis`;
const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Basic ${Buffer.from(`:${ADO_PAT}`).toString('base64')}`
};

function makeRequest(method, endpoint, data) {
    return new Promise((resolve, reject) => {
        const url = `${baseUrl}${endpoint}?api-version=7.0`;
        console.log(`Making ${method} request to: ${url}`);

        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: method,
            headers: headers
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(responseData));
                    } catch {
                        resolve(responseData);
                    }
                } else {
                    console.error(`Error ${res.statusCode}: ${responseData}`);
                    reject(new Error(`API error: ${res.statusCode} - ${responseData}`));
                }
            });
        });

        req.on('error', reject);
        if (data) {
            const payload = JSON.stringify(data);
            console.log('Request payload:', JSON.stringify(data, null, 2));
            req.write(payload);
        }
        req.end();
    });
}

async function testManualRunWithIterations() {
    try {
        console.log('===========================================');
        console.log('Testing Manual Run with Iteration Details');
        console.log('===========================================\n');

        // Step 1: Create an AUTOMATED STANDALONE test run (no plan association)
        console.log('Step 1: Creating automated standalone test run (no plan)...');
        const runData = {
            name: `Automated Standalone Test Run with Iterations - ${new Date().toISOString()}`,
            automated: true,  // AUTOMATED run
            state: 'InProgress',
            startedDate: new Date().toISOString()
            // NO plan field - making it completely standalone
        };

        const testRun = await makeRequest('POST', '/test/runs', runData);
        console.log(`✅ Manual test run created with ID: ${testRun.id}\n`);

        // Step 2: Add test result with iteration details
        console.log('Step 2: Adding test result with iteration details...');
        const resultData = [{
            testCase: { id: TEST_CASE_ID },
            testCaseTitle: `Data-Driven Test with 3 Iterations`,
            automatedTestName: `DataDrivenTest.TestCase${TEST_CASE_ID}`,
            outcome: 'Failed',
            state: 'Completed',
            completedDate: new Date().toISOString(),
            durationInMs: 5000,
            errorMessage: '2 of 3 iterations failed',
            comment: 'Testing iteration details in manual run',
            // Try adding iteration details
            iterationDetails: [
                {
                    id: 1,
                    outcome: 'Passed',
                    durationInMs: 1500,
                    startedDate: new Date(Date.now() - 5000).toISOString(),
                    completedDate: new Date(Date.now() - 3500).toISOString(),
                    parameters: [
                        { parameterName: 'username', value: 'Admin' },
                        { parameterName: 'password', value: 'admin123' },
                        { parameterName: 'result', value: 'success' }
                    ]
                },
                {
                    id: 2,
                    outcome: 'Failed',
                    errorMessage: 'Invalid credentials',
                    durationInMs: 1800,
                    startedDate: new Date(Date.now() - 3500).toISOString(),
                    completedDate: new Date(Date.now() - 1700).toISOString(),
                    parameters: [
                        { parameterName: 'username', value: 'InvalidUser' },
                        { parameterName: 'password', value: 'wrongpass' },
                        { parameterName: 'result', value: 'failure' }
                    ]
                },
                {
                    id: 3,
                    outcome: 'Failed',
                    errorMessage: 'Empty password',
                    durationInMs: 1700,
                    startedDate: new Date(Date.now() - 1700).toISOString(),
                    completedDate: new Date().toISOString(),
                    parameters: [
                        { parameterName: 'username', value: 'User1' },
                        { parameterName: 'password', value: '' },
                        { parameterName: 'result', value: 'failure' }
                    ]
                }
            ]
        }];

        const addResult = await makeRequest('POST', `/test/runs/${testRun.id}/results`, resultData);
        console.log('✅ Test result added successfully!\n');

        // Step 3: Get the test results to verify iterations
        console.log('Step 3: Fetching test results to verify iterations...');
        const getResults = await makeRequest('GET', `/test/runs/${testRun.id}/results`);

        if (getResults.value && getResults.value.length > 0) {
            const result = getResults.value[0];
            console.log(`Test Result ID: ${result.id}`);
            console.log(`Test Case: ${result.testCase?.id || result.testCaseReference?.id}`);
            console.log(`Outcome: ${result.outcome}`);
            console.log(`Has iterationDetails: ${!!result.iterationDetails}`);

            if (result.iterationDetails && result.iterationDetails.length > 0) {
                console.log(`\n🎉 SUCCESS! Iteration details are present:`);
                console.log(`Number of iterations: ${result.iterationDetails.length}`);
                result.iterationDetails.forEach((iter, idx) => {
                    console.log(`  Iteration ${idx + 1}: ${iter.outcome} - ${iter.parameters?.map(p => `${p.parameterName}=${p.value}`).join(', ')}`);
                });
            } else {
                console.log('\n❌ No iteration details found in the result');
            }
        }

        // Step 4: Complete the test run
        console.log('\nStep 4: Completing test run...');
        await makeRequest('PATCH', `/test/runs/${testRun.id}`, {
            state: 'Completed',
            completedDate: new Date().toISOString()
        });
        console.log('✅ Test run completed\n');

        console.log('===========================================');
        console.log('SUMMARY:');
        console.log(`Test Run ID: ${testRun.id}`);
        console.log(`View in ADO: https://dev.azure.com/${ADO_ORGANIZATION}/${ADO_PROJECT}/_testPlans/runs/${testRun.id}`);
        console.log('===========================================');

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Run the test
testManualRunWithIterations();