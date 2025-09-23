/**
 * Parallel test orchestrator
 * Manages child processes for parallel test execution
 */

import { ChildProcess, fork } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import { ParsedFeature, ParsedScenario } from '../bdd/CSBDDEngine';
import { CSReporter } from '../reporter/CSReporter';
import { CSConfigurationManager } from '../core/CSConfigurationManager';

interface WorkItem {
    id: string;
    feature: ParsedFeature;
    scenario: ParsedScenario;
    scenarioIndex: number;
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

    constructor(maxWorkers?: number) {
        this.maxWorkers = maxWorkers || parseInt(process.env.PARALLEL_WORKERS || '0') || os.cpus().length;
    }

    /**
     * Execute features in parallel
     */
    public async execute(features: ParsedFeature[]): Promise<Map<string, any>> {
        CSReporter.info(`Starting parallel execution with ${this.maxWorkers} workers`);

        // Create work items
        this.createWorkItems(features);
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

        CSReporter.info(`Parallel execution completed: ${this.completedCount}/${this.totalCount} scenarios`);
        return this.results;
    }

    private createWorkItems(features: ParsedFeature[]) {
        let workId = 0;

        for (const feature of features) {
            for (let i = 0; i < feature.scenarios.length; i++) {
                const scenario = feature.scenarios[i];

                // Include background steps in the scenario
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

            const workerProcess = fork(script, [], {
                execArgv: ['-r', 'ts-node/register'],
                env: {
                    ...process.env,
                    WORKER_ID: String(id),
                    TS_NODE_TRANSPILE_ONLY: 'true'
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

            // Timeout if worker doesn't respond
            setTimeout(() => {
                reject(new Error(`Worker ${id} failed to start`));
            }, 10000);
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

    private handleResult(worker: Worker, result: any) {
        if (worker.currentWork) {
            const work = worker.currentWork;

            this.results.set(work.id, {
                scenarioName: work.scenario.name,
                featureName: work.feature.name,
                workerId: worker.id,  // Add worker ID for timeline
                ...result
            });

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
            config
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
        for (const worker of this.workers.values()) {
            try {
                worker.process.send({ type: 'terminate' });

                // Give worker time to cleanup
                setTimeout(() => {
                    if (worker.process.connected) {
                        worker.process.kill();
                    }
                }, 1000);
            } catch (e) {
                // Ignore errors during cleanup
            }
        }
        this.workers.clear();
    }
}