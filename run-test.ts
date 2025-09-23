#!/usr/bin/env node

import { CSConfigurationManager } from './src/core/CSConfigurationManager';
import { CSBDDRunner } from './src/bdd/CSBDDRunner';

async function runTest() {
    console.log('🚀 Starting CS Test Automation Framework...\n');
    
    try {
        // Initialize configuration
        const config = CSConfigurationManager.getInstance();
        await config.initialize({
            project: 'orangehrm',
            BROWSER: 'chromium',
            HEADLESS: true,
            BASE_URL: 'https://opensource-demo.orangehrmlive.com',
            REPORT_FORMATS: 'html;json'
        });
        
        console.log('✓ Configuration initialized');
        console.log(`  Project: ${config.get('PROJECT')}`);
        console.log(`  Browser: ${config.get('BROWSER')}`);
        console.log(`  Base URL: ${config.get('BASE_URL')}\n`);
        
        // Run tests
        const runner = CSBDDRunner.getInstance();
        console.log('🏃 Running orangehrm-login-navigation.feature...\n');
        
        await runner.run({
            features: 'test/orangehrm/features/orangehrm-login-navigation.feature',
            report: ['html', 'json']
        });
        
        console.log('\n✅ Test execution completed!');
        console.log('📊 Reports available in ./reports/');
        
    } catch (error: any) {
        console.error('❌ Test execution failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run with timeout protection
const timeout = setTimeout(() => {
    console.error('\n⏱️ Test execution timed out after 60 seconds');
    process.exit(1);
}, 60000);

runTest().then(() => {
    clearTimeout(timeout);
    process.exit(0);
}).catch(error => {
    clearTimeout(timeout);
    console.error('Fatal error:', error);
    process.exit(1);
});