import * as fs from 'fs';
import * as glob from 'glob';

// Quick test to verify screenshot capture in report
async function verifyScreenshots() {
    console.log('\n=== Checking Latest Test Report ===\n');

    // Get the latest test results directory
    const resultDirs = glob.sync('reports/test-results-*/').sort();
    const latestDir = resultDirs[resultDirs.length - 1];

    if (!latestDir) {
        console.log('No test results found');
        return;
    }

    console.log(`Latest test results: ${latestDir}\n`);

    // Check report data
    const reportDataPath = `${latestDir}/reports/report-data.json`;
    if (fs.existsSync(reportDataPath)) {
        const reportData = JSON.parse(fs.readFileSync(reportDataPath, 'utf-8'));

        console.log(`Total Scenarios: ${reportData.suite.scenarios.length}`);

        reportData.suite.scenarios.forEach((scenario: any, sIndex: number) => {
            console.log(`\nScenario ${sIndex + 1}: ${scenario.name}`);
            console.log(`  Status: ${scenario.status}`);

            scenario.steps.forEach((step: any, index: number) => {
                console.log(`\n  Step ${index + 1}: ${step.name}`);
                console.log(`    - Status: ${step.status}`);
                console.log(`    - Screenshot: ${step.screenshot || '❌ MISSING'}`);
                console.log(`    - Actions: ${step.actions?.length || 0}`);

                if (step.status === 'failed' && !step.screenshot) {
                    console.log(`    ⚠️  ISSUE: Failed step has no screenshot!`);
                }

                if (step.actions && step.actions.length > 0) {
                    step.actions.slice(0, 3).forEach((action: any) => {
                        console.log(`      * ${action.name || action}`);
                    });
                    if (step.actions.length > 3) {
                        console.log(`      ... and ${step.actions.length - 3} more`);
                    }
                }
            });
        });

        // Check actual screenshot files
        const screenshots = glob.sync(`${latestDir}/screenshots/*.png`);
        console.log(`\n\nActual screenshot files: ${screenshots.length}`);
        screenshots.forEach(s => {
            console.log(`  - ${s.split('/').pop()}`);
        });
    } else {
        console.log('No report data found');
    }
}

verifyScreenshots().catch(console.error);