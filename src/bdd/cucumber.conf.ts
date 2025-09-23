import { Before, After, BeforeAll, AfterAll, setDefaultTimeout, Status } from '@cucumber/cucumber';
import { CSBrowserManager } from '../browser/CSBrowserManager';
import { CSConfigurationManager } from '../core/CSConfigurationManager';
import { CSReporter } from '../reporter/CSReporter';
import { CSEvidenceCollector } from '../evidence/CSEvidenceCollector';
import { CSLiveDashboard } from '../dashboard/CSLiveDashboard';
import { CSDatabaseManager } from '../database/CSDatabaseManager';

// Set default timeout from config
const config = CSConfigurationManager.getInstance();
setDefaultTimeout(config.getNumber('DEFAULT_TIMEOUT', 30000));

// Before all tests
BeforeAll({ timeout: 60000 }, async function() {
    try {
        // Initialize configuration
        await config.initialize();
        
        // Initialize reporter
        CSReporter.initialize();
        CSReporter.info('Starting test suite execution');
        
        // Print configuration if debug mode
        if (config.getBoolean('DEBUG_MODE', false)) {
            config.debug();
        }
        
        // Start live dashboard if enabled
        const dashboard = CSLiveDashboard.getInstance();
        await dashboard.start();
        
        // Initialize browser pool if enabled
        if (config.getBoolean('BROWSER_POOL_ENABLED', false)) {
            const { CSBrowserPool } = await import('../browser/CSBrowserPool');
            const pool = CSBrowserPool.getInstance();
            await pool.initialize();
        }
        
        CSReporter.info('Test environment initialized');
    } catch (error: any) {
        CSReporter.error(`Failed to initialize test environment: ${error.message}`);
        throw error;
    }
});

// Before each scenario
Before({ timeout: 30000 }, async function(scenario) {
    try {
        const scenarioName = scenario.pickle.name;
        const tags = scenario.pickle.tags.map(t => t.name).join(', ');
        
        CSReporter.startTest(scenarioName);
        CSReporter.info(`Starting scenario: ${scenarioName}`);
        CSReporter.debug(`Tags: ${tags}`);
        
        // Initialize browser based on strategy
        const browserManager = CSBrowserManager.getInstance();
        const strategy = config.get('BROWSER_INSTANCE_STRATEGY', 'new-per-scenario');
        
        if (strategy === 'new-per-scenario') {
            await browserManager.launch();
        } else if (strategy === 'new-context-per-scenario') {
            if (!browserManager.getBrowser()) {
                await browserManager.launch();
            } else {
                await browserManager.closeContext();
                await browserManager.closePage();
            }
        } else if (strategy === 'reuse-across-scenarios') {
            if (!browserManager.getBrowser()) {
                await browserManager.launch();
            }
        }
        
        // Start evidence collection
        const evidenceCollector = CSEvidenceCollector.getInstance();
        await evidenceCollector.startCollection(scenarioName);
        
        // Begin database transaction if enabled
        if (config.getBoolean('DB_ENABLED', false) && config.getBoolean('DB_AUTO_ROLLBACK', false)) {
            const dbManager = CSDatabaseManager.getInstance();
            await dbManager.beginTransaction(scenario.pickle.id);
        }
        
        // Store scenario context in World
        this.scenario = scenario;
        this.scenarioName = scenarioName;
        this.tags = tags;
        
        // Update dashboard
        const dashboard = CSLiveDashboard.getInstance();
        dashboard.updateTestStatus({
            testId: scenario.pickle.id,
            name: scenarioName,
            status: 'running',
            progress: 0
        });
        
    } catch (error: any) {
        CSReporter.error(`Failed to setup scenario: ${error.message}`);
        throw error;
    }
});

// After each scenario
After({ timeout: 30000 }, async function(scenario) {
    try {
        const scenarioName = scenario.pickle.name;
        const status = scenario.result?.status;
        
        // Determine test status
        let testStatus: 'pass' | 'fail' | 'skip' = 'skip';
        if (status === Status.PASSED) {
            testStatus = 'pass';
        } else if (status === Status.FAILED) {
            testStatus = 'fail';
        } else if (status === Status.SKIPPED || status === Status.PENDING) {
            testStatus = 'skip';
        }
        
        // Collect evidence on failure
        if (testStatus === 'fail') {
            const evidenceCollector = CSEvidenceCollector.getInstance();
            const error = scenario.result?.message ? new Error(scenario.result.message) : undefined;
            const evidenceId = await evidenceCollector.collectOnFailure(scenarioName, error);
            
            // Create bug in ADO if configured
            if (config.getBoolean('ADO_CREATE_BUGS_ON_FAILURE', false)) {
                const { CSADOClient } = await import('../ado/CSADOClient');
                const adoClient = CSADOClient.getInstance();
                
                await adoClient.createBug({
                    title: `Test Failed: ${scenarioName}`,
                    description: scenario.result?.message || 'Test failed',
                    severity: '2 - High',
                    priority: 2,
                    reproSteps: `Run test: ${scenarioName}`,
                    attachments: []
                });
            }
        }
        
        // End test in reporter
        CSReporter.endTest(testStatus);
        
        // Stop evidence collection
        const evidenceCollector = CSEvidenceCollector.getInstance();
        evidenceCollector.stopCollection();
        
        // Rollback database transaction if enabled
        if (config.getBoolean('DB_ENABLED', false) && config.getBoolean('DB_AUTO_ROLLBACK', false)) {
            const dbManager = CSDatabaseManager.getInstance();
            await dbManager.rollbackTransaction(scenario.pickle.id);
        }
        
        // Handle browser based on strategy
        const browserManager = CSBrowserManager.getInstance();
        const strategy = config.get('BROWSER_INSTANCE_STRATEGY', 'new-per-scenario');
        
        if (strategy === 'new-per-scenario') {
            await browserManager.close();
        } else if (strategy === 'new-context-per-scenario') {
            await browserManager.closeContext();
            await browserManager.closePage();
        }
        // For 'reuse-across-scenarios', keep browser open
        
        // Update dashboard
        const dashboard = CSLiveDashboard.getInstance();
        dashboard.updateTestStatus({
            testId: scenario.pickle.id,
            name: scenarioName,
            status: testStatus === 'pass' ? 'passed' : testStatus === 'fail' ? 'failed' : 'skipped',
            progress: 100,
            duration: Date.now() - this.testStartTime
        });
        
        // Clear test data
        this.testData = {};
        
    } catch (error: any) {
        CSReporter.error(`Failed to cleanup scenario: ${error.message}`);
    }
});

// After all tests
AfterAll({ timeout: 60000 }, async function() {
    try {
        CSReporter.info('Completing test suite execution');
        
        // Close all browsers
        const browserManager = CSBrowserManager.getInstance();
        await browserManager.closeAll();
        
        // Close browser pool if enabled
        if (config.getBoolean('BROWSER_POOL_ENABLED', false)) {
            const { CSBrowserPool } = await import('../browser/CSBrowserPool');
            const pool = CSBrowserPool.getInstance();
            await pool.shutdown();
        }
        
        // Close database connections
        if (config.getBoolean('DB_ENABLED', false)) {
            const dbManager = CSDatabaseManager.getInstance();
            await dbManager.closeAllConnections();
        }
        
        // Package all evidence if configured
        if (config.getBoolean('EVIDENCE_PACKAGE_ON_COMPLETE', false)) {
            const evidenceCollector = CSEvidenceCollector.getInstance();
            await evidenceCollector.packageAllEvidence();
        }
        
        // Generate final reports
        await CSReporter.generateReports();
        
        // Stop dashboard
        const dashboard = CSLiveDashboard.getInstance();
        await dashboard.stop();
        
        // Update Azure DevOps if configured
        if (config.getBoolean('ADO_UPDATE_TEST_CASES', false)) {
            const { CSADOClient } = await import('../ado/CSADOClient');
            const adoClient = CSADOClient.getInstance();
            // Update test results in ADO
        }
        
        CSReporter.info('Test suite execution completed');
        
    } catch (error: any) {
        CSReporter.error(`Failed to complete test suite: ${error.message}`);
    }
});

// Export for use in step definitions
export { Before, After, BeforeAll, AfterAll };