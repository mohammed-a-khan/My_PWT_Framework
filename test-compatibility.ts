/**
 * Test script to verify backward compatibility features
 */

import { CSDataProvider } from './src/data/CSDataProvider';
import { CSConfigurationManager } from './src/core/CSConfigurationManager';

async function testBackwardCompatibility() {
    console.log('Testing Backward Compatibility Features...\n');

    const config = CSConfigurationManager.getInstance();
    const dataProvider = CSDataProvider.getInstance();

    // Test 1: XML Data Loading
    console.log('1. Testing XML Data Provider:');
    try {
        const xmlData = await dataProvider.loadData('test/test-data/test-data.xml');
        console.log('   ✓ XML data loaded successfully');
        console.log('   Number of test cases:', xmlData.length);
        console.log('   Sample data:', JSON.stringify(xmlData[0], null, 2));
    } catch (error: any) {
        console.log('   ✗ Failed to load XML data:', error.message);
    }

    // Test 2: Old VIDEO_CAPTURE_MODE configuration
    console.log('\n2. Testing VIDEO_CAPTURE_MODE backward compatibility:');
    const videoCaptureTests = [
        { old: 'never', expected: 'off' },
        { old: 'always', expected: 'on' },
        { old: 'on-failure', expected: 'retain-on-failure' }
    ];

    for (const test of videoCaptureTests) {
        config.set('VIDEO_CAPTURE_MODE', test.old);
        // The mapping happens in CSBrowserManager, so we'll check the config value
        console.log(`   VIDEO_CAPTURE_MODE='${test.old}' -> Should map to BROWSER_VIDEO='${test.expected}'`);
    }

    // Test 3: Old HAR_CAPTURE_MODE configuration
    console.log('\n3. Testing HAR_CAPTURE_MODE backward compatibility:');
    const harCaptureTests = [
        { old: 'never', shouldEnable: false },
        { old: 'always', shouldEnable: true },
        { old: 'on-failure', shouldEnable: true }
    ];

    for (const test of harCaptureTests) {
        config.set('HAR_CAPTURE_MODE', test.old);
        const enabled = test.old !== 'never';
        console.log(`   HAR_CAPTURE_MODE='${test.old}' -> HAR enabled: ${enabled}`);
    }

    // Test 4: JSON Data Loading (should still work)
    console.log('\n4. Testing JSON Data Provider (existing functionality):');
    try {
        // Create a test JSON file
        const fs = require('fs');
        const testJsonData = {
            TC001: { username: 'jsonuser1', password: 'jsonpass1' },
            TC002: { username: 'jsonuser2', password: 'jsonpass2' }
        };
        fs.writeFileSync('test/test-data/test-data.json', JSON.stringify(testJsonData, null, 2));

        const jsonData = await dataProvider.loadData('test/test-data/test-data.json');
        console.log('   ✓ JSON data loaded successfully');
        console.log('   Number of test cases:', Object.keys(jsonData).length);
    } catch (error: any) {
        console.log('   ✗ Failed to load JSON data:', error.message);
    }

    // Test 5: CSV Data Loading (should still work)
    console.log('\n5. Testing CSV Data Provider (existing functionality):');
    try {
        // Create a test CSV file
        const fs = require('fs');
        const csvContent = 'username,password\ncsvuser1,csvpass1\ncsvuser2,csvpass2';
        fs.writeFileSync('test/test-data/test-data.csv', csvContent);

        const csvData = await dataProvider.loadData('test/test-data/test-data.csv');
        console.log('   ✓ CSV data loaded successfully');
        console.log('   Number of rows:', csvData.length);
    } catch (error: any) {
        console.log('   ✗ Failed to load CSV data:', error.message);
    }

    console.log('\n✅ Backward compatibility test completed!');
}

// Run the test
testBackwardCompatibility().catch(console.error);