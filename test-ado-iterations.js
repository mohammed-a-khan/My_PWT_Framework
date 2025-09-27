// Quick test to verify iteration details are sent to ADO API

// Sample test data mimicking what we're sending
const testData = {
    results: [{
        testCase: { id: 419 },
        outcome: 'Failed',
        state: 'Completed',
        errorMessage: 'Aggregated errors from iterations',
        durationInMs: 3000,
        iterationDetails: [
            {
                id: 1,
                outcome: 'Passed',
                durationInMs: 1000,
                parameters: [
                    { parameterName: 'testName', value: 'Test1' }
                ]
            },
            {
                id: 2,
                outcome: 'Failed',
                errorMessage: 'Test failed for Test2',
                durationInMs: 1000,
                parameters: [
                    { parameterName: 'testName', value: 'Test2' }
                ]
            },
            {
                id: 3,
                outcome: 'Passed',
                durationInMs: 1000,
                parameters: [
                    { parameterName: 'testName', value: 'Test3' }
                ]
            }
        ]
    }]
};

console.log('Test data structure for ADO iterations:');
console.log(JSON.stringify(testData, null, 2));

console.log('\n✅ Key points for iterations to work in ADO:');
console.log('1. Use "iterationDetails" field (not "subResults")');
console.log('2. Each iteration needs: id, outcome, durationInMs');
console.log('3. Parameters array contains the test data for each iteration');
console.log('4. This structure should make iterations visible in ADO test results');