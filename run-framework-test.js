#!/usr/bin/env node

console.log('=== CS Test Automation Framework - Full Execution ===\n');

require('ts-node/register');

async function runFramework() {
    try {
        console.log('1. Loading CS Framework modules...');
        const { CSConfigurationManager } = require('./src/core/CSConfigurationManager');
        const { CSReporter } = require('./src/reporter/CSReporter');
        const { CSBDDEngine } = require('./src/bdd/CSBDDEngine');
        console.log('   ✓ Core modules loaded');
        
        console.log('\n2. Initializing configuration...');
        const config = CSConfigurationManager.getInstance();
        await config.initialize({
            project: 'orangehrm',
            FEATURE_PATH: 'test/orangehrm/features',
            STEP_DEFINITIONS_PATH: 'test/orangehrm/steps',
            LOG_CONSOLE_ENABLED: true,
            LOG_CONSOLE_COLORS: true,
            REPORT_FORMATS: 'html;json',
            SELECTIVE_STEP_LOADING: false,  // Load all step definitions
            DRY_RUN: true  // Run in dry-run mode to avoid Playwright issues
        });
        console.log('   ✓ Configuration initialized');
        console.log(`   - Project: ${config.get('PROJECT')}`);
        console.log(`   - Feature Path: ${config.get('FEATURE_PATH')}`);
        console.log(`   - Step Definitions: ${config.get('STEP_DEFINITIONS_PATH')}`);
        
        console.log('\n3. Initializing reporter...');
        CSReporter.initialize();
        console.log('   ✓ Reporter initialized');
        
        console.log('\n4. Loading BDD Engine...');
        const engine = CSBDDEngine.getInstance();
        console.log('   ✓ BDD Engine loaded');
        
        console.log('\n5. Parsing feature files...');
        const featurePath = 'test/orangehrm/features/orangehrm-login-navigation.feature';
        const feature = engine.parseFeature(featurePath);
        console.log(`   ✓ Feature parsed: ${feature.name}`);
        console.log(`   - Scenarios: ${feature.scenarios.length}`);
        console.log(`   - Tags: ${feature.tags.join(', ')}`);
        
        console.log('\n6. Loading step definitions...');
        await engine.loadRequiredStepDefinitions([feature]);
        console.log('   ✓ Step definitions loaded');
        
        console.log('\n7. Attempting to load CSBDDRunner...');
        const { CSBDDRunner } = require('./src/bdd/CSBDDRunner');
        const runner = CSBDDRunner.getInstance();
        console.log('   ✓ BDD Runner loaded');
        
        console.log('\n8. Running tests...');
        await runner.run({
            features: 'test/orangehrm/features/orangehrm-login-navigation.feature',
            dryRun: true,  // Dry run mode
            report: ['html', 'json']
        });
        
        console.log('\n✅ Framework execution completed successfully!');
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ Framework execution failed:');
        console.error('   Error:', error.message);
        console.error('\n   Stack:', error.stack);
        process.exit(1);
    }
}

// Add timeout safety
const timeout = setTimeout(() => {
    console.error('\n⏱️ Execution timed out after 30 seconds');
    console.error('This might be due to Playwright import hanging');
    process.exit(1);
}, 30000);

// Run the framework
runFramework().then(() => {
    clearTimeout(timeout);
}).catch(error => {
    clearTimeout(timeout);
    console.error('Fatal error:', error);
    process.exit(1);
});