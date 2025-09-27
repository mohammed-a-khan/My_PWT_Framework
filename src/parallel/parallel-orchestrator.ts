/**
 * Parallel test orchestrator
 * Manages child processes for parallel test execution
 */

import { ChildProcess, fork } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import { ParsedFeature, ParsedScenario, ParsedExamples } from '../bdd/CSBDDEngine';
import { CSReporter } from '../reporter/CSReporter';
import { CSConfigurationManager } from '../core/CSConfigurationManager';
import { CSDataProvider } from '../data/CSDataProvider';
import { CSADOIntegration } from '../ado/CSADOIntegration';

interface WorkItem {
    id: string;
    feature: ParsedFeature;
    scenario: ParsedScenario;
    scenarioIndex: number;
    exampleRow?: string[];
    exampleHeaders?: string[];
    iterationNumber?: number;
    totalIterations?: number;
}

interface Worker {
    id: number;
    process: ChildProcess;
    busy: boolean;
    currentWork?: WorkItem;
}

export class ParallelOrchestrator {
    private workers: Map<number, Worker> = new Map();
    private workQueue: WorkItem[] = [];
    private results: Map<string, any> = new Map();
    private config = CSConfigurationManager.getInstance();
    private completedCount = 0;
    private totalCount = 0;
    private maxWorkers: number;
    private adoIntegration: any;

    constructor(maxWorkers?: number) {
        this.maxWorkers = maxWorkers || parseInt(process.env.PARALLEL_WORKERS || '0') || os.cpus().length;
    }

    /**
     * Execute features in parallel
     */
    public async execute(features: ParsedFeature[]): Promise<Map<string, any>> {
        CSReporter.info(`Starting parallel execution with ${this.maxWorkers} workers`);

        // Initialize ADO integration for parallel mode
        this.adoIntegration = CSADOIntegration.getInstance();
        await this.adoIntegration.initialize(true);

        // Collect all scenarios for ADO test point mapping BEFORE creating test run
        const allScenarios: Array<{scenario: ParsedScenario, feature: ParsedFeature}> = [];
        for (const feature of features) {
            for (const scenario of feature.scenarios || []) {
                allScenarios.push({scenario, feature});
            }
        }
        await this.adoIntegration.collectScenarios(allScenarios);

        // Now start the test run with collected test points
        await this.adoIntegration.beforeAllTests(`PTF Parallel Run - ${new Date().toISOString()}`);

        // Create work items (now async to handle data loading)
        await this.createWorkItems(features);
        this.totalCount = this.workQueue.length;
        CSReporter.info(`Total scenarios to execute: ${this.totalCount}`);

        if (this.totalCount === 0) {
            return this.results;
        }

        // Start workers
        await this.startWorkers();

        // Wait for completion
        await this.waitForCompletion();

        // Cleanup
        await this.cleanup();

        // Note: ADO test run completion is now handled in CSBDDRunner after reports are generated
        // to ensure all artifacts (including HTML reports) are included in the zip

        CSReporter.info(`Parallel execution completed: ${this.completedCount}/${this.totalCount} scenarios`);
        return this.results;
    }

    /**
     * Load external data for scenario examples
     */
    private async loadExamplesData(examples: ParsedExamples): Promise<ParsedExamples> {
        // If no external data source, return as is
        if (!examples.dataSource) {
            return examples;
        }

        const dataProvider = CSDataProvider.getInstance();
        const source = examples.dataSource;

        try {
            CSReporter.info(`Loading external data from ${source.type}: ${source.source}`);

            // Build data provider options
            const options: any = {
                source: source.source,
                type: source.type
            };

            // Add type-specific options
            if (source.sheet) options.sheet = source.sheet;
            if (source.delimiter) options.delimiter = source.delimiter;
            if (source.filter) {
                // Parse and apply filter expression
                options.filter = this.createFilterFunction(source.filter);
            }

            // Load data
            const data = await dataProvider.loadData(options);

            if (data.length === 0) {
                CSReporter.warn(`No data loaded from external source: ${source.source}`);
                return examples;
            }

            // Extract headers and rows
            const headers = Object.keys(data[0]);
            const rows = data.map(item => headers.map(h => String(item[h] || '')));

            CSReporter.info(`Loaded ${rows.length} rows with headers: ${headers.join(', ')}`);

            return {
                ...examples,
                headers,
                rows
            };
        } catch (error: any) {
            CSReporter.error(`Failed to load external data: ${error.message}`);
            // Return original examples as fallback
            return examples;
        }
    }

    /**
     * Create a filter function from filter expression
     */
    private createFilterFunction(filterExpr: string): (row: any) => boolean {
        // Simple filter implementation
        // Format: "column=value" or "column!=value" or "column>value" etc.
        const match = filterExpr.match(/^(\w+)\s*(=|!=|>|<|>=|<=)\s*(.+)$/);
        if (!match) {
            CSReporter.warn(`Invalid filter expression: ${filterExpr}`);
            return () => true;
        }

        const [, column, operator, value] = match;
        const cleanValue = value.replace(/^["']|["']$/g, ''); // Remove quotes

        return (row: any) => {
            const cellValue = String(row[column] || '');
            switch (operator) {
                case '=':
                    return cellValue === cleanValue;
                case '!=':
                    return cellValue !== cleanValue;
                case '>':
                    return Number(cellValue) > Number(cleanValue);
                case '<':
                    return Number(cellValue) < Number(cleanValue);
                case '>=':
                    return Number(cellValue) >= Number(cleanValue);
                case '<=':
                    return Number(cellValue) <= Number(cleanValue);
                default:
                    return true;
            }
        };
    }

    private async createWorkItems(features: ParsedFeature[]) {
        let workId = 0;

        for (const feature of features) {
            for (let i = 0; i < feature.scenarios.length; i++) {
                const scenario = feature.scenarios[i];

                // Check if scenario has examples (scenario outline)
                if (scenario.examples) {
                    // Load external data if configured
                    const examples = await this.loadExamplesData(scenario.examples);

                    if (examples.rows.length > 0) {
                        // Create a work item for each example row
                        let iterationNumber = 1;
                        for (const row of examples.rows) {
                            const scenarioWithBackground = {
                                ...scenario,
                                background: feature.background
                            };

                            this.workQueue.push({
                                id: `work-${++workId}`,
                                feature,
                                scenario: scenarioWithBackground as ParsedScenario,
                                scenarioIndex: i,
                                exampleRow: row,
                                exampleHeaders: examples.headers,
                                iterationNumber,
                                totalIterations: examples.rows.length
                            });
                            iterationNumber++;
                        }
                    } else {
                        // No data rows, treat as regular scenario
                        const scenarioWithBackground = {
                            ...scenario,
                            background: feature.background
                        };

                        this.workQueue.push({
                            id: `work-${++workId}`,
                            feature,
                            scenario: scenarioWithBackground as ParsedScenario,
                            scenarioIndex: i
                        });
                    }
                } else {
                    // Regular scenario (not a scenario outline)
                    const scenarioWithBackground = {
                        ...scenario,
                        background: feature.background
                    };

                    this.workQueue.push({
                        id: `work-${++workId}`,
                        feature,
                        scenario: scenarioWithBackground as ParsedScenario,
                        scenarioIndex: i
                    });
                }
            }
        }
    }

    private async startWorkers(): Promise<void> {
        const workerScript = path.join(__dirname, 'worker-process.ts');

        const promises = [];
        for (let i = 1; i <= Math.min(this.maxWorkers, this.totalCount); i++) {
            promises.push(this.createWorker(i, workerScript));
        }

        const workers = await Promise.all(promises);
        workers.forEach(worker => {
            this.workers.set(worker.id, worker);
            this.assignWork(worker);
        });
    }

    private createWorker(id: number, script: string): Promise<Worker> {
        return new Promise((resolve, reject) => {
            CSReporter.debug(`Creating worker ${id}`);

            // Get project info from config to pass to worker for early initialization
            const project = this.config.get('PROJECT') || this.config.get('project') || 'common';

            const workerProcess = fork(script, [], {
                execArgv: ['-r', 'ts-node/register'],
                env: {
                    ...process.env,
                    WORKER_ID: String(id),
                    TS_NODE_TRANSPILE_ONLY: 'true',
                    PROJECT: project  // Pass project for early step loading
                },
                silent: false
            });

            const worker: Worker = {
                id,
                process: workerProcess,
                busy: false
            };

            workerProcess.on('message', (message: any) => {
                this.handleWorkerMessage(worker, message);
            });

            workerProcess.on('error', (error) => {
                CSReporter.error(`Worker ${id} error: ${error.message}`);
                reject(error);
            });

            workerProcess.on('exit', (code) => {
                if (code !== 0 && code !== null) {
                    CSReporter.warn(`Worker ${id} exited with code ${code}`);
                }
                this.workers.delete(id);
            });

            // Wait for ready message
            const onReady = (message: any) => {
                if (message.type === 'ready') {
                    workerProcess.removeListener('message', onReady);
                    CSReporter.debug(`Worker ${id} ready`);
                    resolve(worker);
                }
            };
            workerProcess.on('message', onReady);

            // Timeout if worker doesn't respond - increased to 30s for slower systems
            setTimeout(() => {
                reject(new Error(`Worker ${id} failed to start`));
            }, 30000);
        });
    }

    private handleWorkerMessage(worker: Worker, message: any) {
        switch (message.type) {
            case 'result':
                this.handleResult(worker, message);
                break;
            case 'error':
                CSReporter.error(`Worker ${worker.id} error: ${message.error}`);
                break;
            case 'log':
                CSReporter.debug(`[Worker ${worker.id}] ${message.message}`);
                break;
        }
    }

    private async handleResult(worker: Worker, result: any) {
        if (worker.currentWork) {
            const work = worker.currentWork;

            this.results.set(work.id, {
                scenarioName: result.name || work.scenario.name,  // Use the interpolated name from worker if available
                featureName: work.feature.name,
                workerId: worker.id,  // Add worker ID for timeline
                ...result
            });

            // Process ADO result if metadata exists
            if (result.adoMetadata && this.adoIntegration?.isEnabled()) {
                const status = result.status === 'passed' ? 'passed' :
                              result.status === 'failed' ? 'failed' : 'skipped';

                // Add result for batch publishing
                await this.adoIntegration.afterScenario(
                    work.scenario,
                    work.feature,
                    status,
                    result.duration,
                    result.error,
                    result.artifacts,
                    undefined, // stack trace (could be extracted from error if needed)
                    result.iterationNumber,
                    result.iterationData
                );
            }

            this.completedCount++;

            const statusSymbol = result.status === 'passed' ? '✓' : '✗';
            CSReporter.info(
                `[${this.completedCount}/${this.totalCount}] ${statusSymbol} ${work.scenario.name} (${result.duration}ms)`
            );

            worker.busy = false;
            worker.currentWork = undefined;

            // Assign next work
            this.assignWork(worker);
        }
    }

    private assignWork(worker: Worker) {
        if (worker.busy || this.workQueue.length === 0) {
            return;
        }

        const work = this.workQueue.shift()!;
        worker.busy = true;
        worker.currentWork = work;

        const config = Object.fromEntries(this.config.getAll());

        worker.process.send({
            type: 'execute',
            scenarioId: work.id,
            feature: work.feature,
            scenario: work.scenario,
            config,
            exampleRow: work.exampleRow,
            exampleHeaders: work.exampleHeaders,
            iterationNumber: work.iterationNumber,
            totalIterations: work.totalIterations
        });

        CSReporter.debug(`Worker ${worker.id} assigned: ${work.scenario.name}`);
    }

    private waitForCompletion(): Promise<void> {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (this.completedCount >= this.totalCount) {
                    clearInterval(checkInterval);
                    resolve();
                }

                // Check for stuck workers
                for (const worker of this.workers.values()) {
                    if (!worker.process.connected && worker.busy) {
                        CSReporter.warn(`Worker ${worker.id} disconnected while busy`);
                        worker.busy = false;
                        this.completedCount++;
                    }
                }
            }, 100);

            // Timeout after 5 minutes
            setTimeout(() => {
                clearInterval(checkInterval);
                CSReporter.warn('Parallel execution timed out');
                resolve();
            }, 300000);
        });
    }

    private async cleanup() {
        // Send terminate message to all workers
        const terminationPromises: Promise<void>[] = [];

        for (const worker of this.workers.values()) {
            try {
                const terminationPromise = new Promise<void>((resolve) => {
                    // Set up a timeout in case worker doesn't exit cleanly
                    const timeout = setTimeout(() => {
                        if (worker.process.connected) {
                            worker.process.kill();
                        }
                        resolve();
                    }, 5000); // Give workers 5 seconds to cleanup and save HAR files

                    // Listen for worker exit
                    worker.process.once('exit', () => {
                        clearTimeout(timeout);
                        resolve();
                    });

                    // Send terminate message
                    worker.process.send({ type: 'terminate' });
                });

                terminationPromises.push(terminationPromise);
            } catch (e) {
                // Ignore errors during cleanup
            }
        }

        // Wait for all workers to terminate
        await Promise.all(terminationPromises);
        this.workers.clear();
    }
}