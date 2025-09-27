# Azure DevOps Iteration Details Issue Analysis

## Problem
Azure DevOps API returns 500 Internal Server Error (TF400898) when trying to update test results with `iterationDetails`, even with only 3 parameters.

## Root Cause Analysis
1. The Azure DevOps Test API has undocumented limitations on iteration details
2. The API endpoint for updating test results with iterations might require specific prerequisites:
   - Test case must be configured as data-driven in ADO
   - Test run must be created with specific configuration
   - Iterations might need to be added through a different API endpoint

## Current Implementation
- ✅ Correctly using `iterationDetails` field (not `subResults`)
- ✅ Filtering to only send used columns (3 instead of 31)
- ✅ Proper test run naming with feature name
- ❌ API still returns 500 error despite correct structure

## Potential Solutions

### Solution 1: Use Separate Test Results per Iteration
Instead of using `iterationDetails`, create individual test results for each iteration:
```javascript
// Instead of one result with multiple iterations
// Create multiple results, one per iteration
for (const iteration of iterations) {
    await createTestResult({
        testCaseId: 419,
        testRunId: runId,
        outcome: iteration.outcome,
        testCaseTitle: `${testCaseName} - Iteration ${iteration.id}`,
        iterationId: iteration.id
    });
}
```

### Solution 2: Use Test Points API
The Test Points API might handle iterations differently:
```
POST /test/Plans/{planId}/Suites/{suiteId}/TestPoint
```

### Solution 3: Pre-configure Test Cases in ADO
Ensure test cases are properly configured as data-driven in Azure DevOps:
1. Mark test case as "Automated"
2. Add parameter data to test case
3. Link to test suite with iteration support

### Solution 4: Use Different API Version
Try API version 6.0 or 5.0 which might have different iteration handling:
```
?api-version=6.0
```

## Workaround Implemented
Since Azure DevOps has issues with `iterationDetails`, we've implemented:
1. **Column filtering** - Only send used columns to reduce payload
2. **Proper naming** - Test runs use feature names
3. **Iteration tracking** - Aggregate results with detailed logging

## Recommendations
1. **For now**: The iteration data is being collected and logged. Even though ADO can't display it properly, the test results are still being recorded.
2. **Future**: Consider using Azure DevOps Test Plans UI to configure data-driven tests properly before automation
3. **Alternative**: Use test result comments or attachments to include iteration details as a workaround

## Microsoft Documentation Gaps
The official documentation doesn't clearly specify:
- Maximum number of parameters per iteration
- Required test case configuration for iterations
- Why `iterationDetails` causes 500 errors
- Alternative methods for recording data-driven test results