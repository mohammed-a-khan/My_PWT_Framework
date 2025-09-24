#!/usr/bin/env node

import minimist from 'minimist';
import { CSConfigurationManager } from './core/CSConfigurationManager';
import { CSReporter } from './reporter/CSReporter';

// Export all framework components for external use
export * from './core/CSConfigurationManager';
export * from './core/CSBasePage';
// export * from './core/CSPageFactory'; // Has conflict with CSElements
export * from './browser/CSBrowserManager';
export * from './browser/CSBrowserPool';
export * from './element/CSWebElement';
// export * from './reporter/CSReporter'; // Has conflict with TestResult
export * from './bdd/CSBDDRunner';
// export * from './bdd/CSStepRegistry'; // Has conflict with CSDataProvider
export * from './api/CSAPIClient';
export * from './database/CSDatabaseManager';
// export * from './data/CSDataProvider'; // Commented to avoid conflict
export * from './ado/CSADOClient';
export * from './ai/CSAIEngine';
export * from './dashboard/CSLiveDashboard';
export * from './evidence/CSEvidenceCollector';

// Export specific items to avoid conflicts
export { CSPageFactory } from './core/CSPageFactory';
export { CSReporter } from './reporter/CSReporter';
export { CSStepRegistry, CSBDDStepDef } from './bdd/CSStepRegistry';
export { CSDataProvider } from './data/CSDataProvider';

// Export new framework components
export { CSPipelineOrchestrator } from './pipeline/CSPipelineOrchestrator';
export { CSTokenManager } from './auth/CSTokenManager';
export { CSPerformanceMonitor } from './monitoring/CSPerformanceMonitor';
export { CSElementResolver } from './element/CSElementResolver';

// Lightning-fast startup - minimal core loading
const startTime = Date.now();

async function main() {
    try {
        // Parse command line arguments
        const args = minimist(process.argv.slice(2));
        
        // Initialize configuration (< 100ms)
        const config = CSConfigurationManager.getInstance();
        await config.initialize(args);
        
        // Check startup time
        const configTime = Date.now() - startTime;
        if (configTime > 100) {
            console.warn(`Configuration loading: ${configTime}ms (target: <100ms)`);
        }
        
        // Determine execution scope (< 20ms)
        const scopeStart = Date.now();
        const executionMode = determineExecutionMode(args, config);
        
        const scopeTime = Date.now() - scopeStart;
        if (scopeTime > 20) {
            console.warn(`Scope determination: ${scopeTime}ms (target: <20ms)`);
        }
        
        // Selective module loading (< 200ms)
        const moduleStart = Date.now();
        await loadRequiredModules(executionMode, config);
        
        const moduleTime = Date.now() - moduleStart;
        if (moduleTime > 200) {
            console.warn(`Module loading: ${moduleTime}ms (target: <200ms)`);
        }
        
        // Total startup check
        const totalStartupTime = Date.now() - startTime;
        if (totalStartupTime < 1000) {
            CSReporter.debug(`⚡ Lightning-fast startup: ${totalStartupTime}ms`);
        } else {
            CSReporter.warn(`Startup time: ${totalStartupTime}ms (target: <1000ms)`);
        }
        
        // Execute based on mode
        await execute(executionMode);
        
    } catch (error: any) {
        console.error('Framework initialization failed:', error.message);
        process.exit(1);
    }
}

function determineExecutionMode(args: any, config: CSConfigurationManager): string {
    // Check if running specific tests
    if (args.feature || args.features || config.get('FEATURES')) {
        return 'bdd';
    }
    
    // Check if running API tests
    if (args.api || config.get('API_TESTS')) {
        return 'api';
    }
    
    // Check if running database tests
    if (args.db || config.get('DB_TESTS')) {
        return 'database';
    }
    
    // Default to BDD
    return 'bdd';
}

async function loadRequiredModules(mode: string, config: CSConfigurationManager) {
    const lazyLoading = config.getBoolean('LAZY_LOADING', true);
    const parallel = config.getBoolean('PARALLEL_INITIALIZATION', true);
    
    if (!lazyLoading) {
        // Load all modules (slower)
        await Promise.all([
            import('./browser/CSBrowserManager'),
            import('./bdd/CSBDDRunner'),
            import('./reporter/CSReporter')
        ]);
        return;
    }
    
    // Selective loading based on mode
    const loadPromises: Promise<any>[] = [];
    
    // Always need reporter
    loadPromises.push(import('./reporter/CSReporter'));
    
    switch (mode) {
        case 'bdd':
            if (parallel) {
                // Parallel loading for speed
                loadPromises.push(
                    import('./bdd/CSBDDRunner'),
                    import('./browser/CSBrowserManager'),
                    import('./element/CSWebElement')
                );
            } else {
                // Sequential loading
                await import('./bdd/CSBDDRunner');
                await import('./browser/CSBrowserManager');
                await import('./element/CSWebElement');
            }
            break;
            
        case 'api':
            loadPromises.push(import('./api/CSAPIClient'));
            break;
            
        case 'database':
            loadPromises.push(import('./database/CSDatabaseManager'));
            break;
    }
    
    if (parallel && loadPromises.length > 0) {
        await Promise.all(loadPromises);
    }
}

async function execute(mode: string) {
    const args = minimist(process.argv.slice(2));
    const config = CSConfigurationManager.getInstance();
    
    switch (mode) {
        case 'bdd':
            const { CSBDDRunner } = await import('./bdd/CSBDDRunner');
            const runner = CSBDDRunner.getInstance();
            
            // Pass CLI options to the runner
            const options: any = {};
            
            // Pass the project parameter - CRITICAL for loading project config
            if (args.project) {
                options.project = args.project;
            }
            
            // Handle features/feature path
            if (args.features || args.feature || args.f) {
                const featurePath = args.features || args.feature || args.f;
                options.features = featurePath;
                // Also set it in config for compatibility
                config.set('FEATURE_PATH', featurePath);
            }
            
            // Handle tags
            if (args.tags || args.t) {
                const tags = args.tags || args.t;
                options.tags = tags;
                config.set('TAGS', tags);
            }
            
            // Handle scenario
            if (args.scenario || args.s) {
                const scenario = args.scenario || args.s;
                options.scenario = scenario;
                config.set('SCENARIO', scenario);
            }
            
            // Handle headless mode
            if (args.headless !== undefined) {
                options.headless = args.headless;
                config.set('HEADLESS', String(args.headless));
            }
            
            // Handle browser
            if (args.browser) {
                options.browser = args.browser;
                config.set('BROWSER', args.browser);
            }
            
            // Handle parallel execution with workers
            if (args.parallel !== undefined || args.workers !== undefined) {
                const workerCount = args.workers ? parseInt(args.workers) : 3;

                if (args.parallel === true || args.parallel === 'true') {
                    // When parallel is true, set it to the number of workers
                    options.parallel = workerCount;
                    config.set('PARALLEL', String(workerCount));
                    config.set('MAX_PARALLEL_WORKERS', String(workerCount));
                } else if (args.parallel === false || args.parallel === 'false') {
                    // Explicitly disabled
                    options.parallel = 1;
                    config.set('PARALLEL', '1');
                } else if (typeof args.parallel === 'number' || typeof args.parallel === 'string') {
                    // Numeric value provided
                    options.parallel = typeof args.parallel === 'number' ? args.parallel : parseInt(args.parallel);
                    config.set('PARALLEL', String(options.parallel));
                } else if (args.workers && !args.parallel) {
                    // Only workers specified, treat as parallel
                    options.parallel = workerCount;
                    config.set('PARALLEL', String(workerCount));
                }
            }

            // Handle retry count
            if (args.retry !== undefined) {
                options.retry = args.retry;
                config.set('RETRY_COUNT', String(args.retry));
            }
            
            // Handle environment
            if (args.env || args.environment) {
                const env = args.env || args.environment;
                options.env = env;
                options.environment = env;
                config.set('ENVIRONMENT', env);
            }
            
            await runner.run(options);
            break;
            
        case 'api':
            const { CSAPIRunner } = await import('./api/CSAPIRunner');
            const apiRunner = new CSAPIRunner();
            await apiRunner.run();
            break;
            
        case 'database':
            const { CSDatabaseRunner } = await import('./database/CSDatabaseRunner');
            const dbRunner = new CSDatabaseRunner();
            await dbRunner.run();
            break;
            
        default:
            throw new Error(`Unknown execution mode: ${mode}`);
    }
}

// Run if executed directly
if (require.main === module) {
    main()
        .then(() => {
            // Ensure process exits after successful completion
            process.exit(0);
        })
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

export { main };