import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { CSConfigurationManager } from '../core/CSConfigurationManager';
import { CSReporter } from './CSReporter';

export type CaptureMode = 'always' | 'on-failure' | 'on-success' | 'never';

export interface TestResultsConfig {
    baseDir: string;
    createTimestampFolder: boolean;
    zipResults: boolean;
    keepUnzipped: boolean;
    captureSettings: {
        video: CaptureMode;
        screenshot: CaptureMode;
        trace: CaptureMode;
        har: CaptureMode;
        consoleLog: boolean;
    };
}

export class CSTestResultsManager {
    private static instance: CSTestResultsManager;
    private config: CSConfigurationManager;
    private currentTestRunDir: string = '';
    private timestamp: string = '';
    private consoleLogs: any[] = [];
    
    private constructor() {
        this.config = CSConfigurationManager.getInstance();
    }
    
    public static getInstance(): CSTestResultsManager {
        if (!CSTestResultsManager.instance) {
            CSTestResultsManager.instance = new CSTestResultsManager();
        }
        return CSTestResultsManager.instance;
    }
    
    /**
     * Initialize test results directory for current test run
     */
    public initializeTestRun(project?: string): string {
        const baseDir = this.config.get('REPORTS_BASE_DIR', './reports');
        const createTimestampFolder = this.config.getBoolean('REPORTS_CREATE_TIMESTAMP_FOLDER', true);
        
        // Ensure base directory exists
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true });
        }
        
        // Create timestamp folder
        if (createTimestampFolder) {
            this.timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, -5);
            this.currentTestRunDir = path.join(baseDir, `test-results-${this.timestamp}`);
        } else {
            this.currentTestRunDir = baseDir;
        }
        
        // Create directory structure
        this.createDirectoryStructure();

        // Store the directory in config so it can be accessed by other components
        CSConfigurationManager.getInstance().set('TEST_RESULTS_DIR', this.currentTestRunDir);

        CSReporter.info(`Test results directory initialized: ${this.currentTestRunDir}`);
        return this.currentTestRunDir;
    }
    
    /**
     * Create standard directory structure for test results
     */
    private createDirectoryStructure(): void {
        const directories = [
            this.currentTestRunDir,
            path.join(this.currentTestRunDir, 'videos'),
            path.join(this.currentTestRunDir, 'screenshots'),
            path.join(this.currentTestRunDir, 'traces'),
            path.join(this.currentTestRunDir, 'har'),
            path.join(this.currentTestRunDir, 'console-logs'),
            path.join(this.currentTestRunDir, 'reports')
        ];
        
        directories.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }
    
    /**
     * Get directory paths for different artifact types
     */
    public getDirectories() {
        // Use currentTestRunDir if available, otherwise get from config (for worker processes)
        let baseDir = this.currentTestRunDir;
        if (!baseDir) {
            baseDir = this.config.get('TEST_RESULTS_DIR', '');
            if (!baseDir) {
                // Fallback: create a default directory if none exists
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, -5);
                baseDir = path.join(process.cwd(), 'reports', `test-results-${timestamp}`);
                CSReporter.debug(`Test results directory not set, using fallback: ${baseDir}`);
            }
        }

        return {
            base: baseDir,
            videos: path.join(baseDir, 'videos'),
            screenshots: path.join(baseDir, 'screenshots'),
            traces: path.join(baseDir, 'traces'),
            har: path.join(baseDir, 'har'),
            consoleLogs: path.join(baseDir, 'console-logs'),
            reports: path.join(baseDir, 'reports')
        };
    }
    
    /**
     * Get artifact paths with proper naming
     */
    public getArtifactPath(type: 'video' | 'screenshot' | 'trace' | 'har', scenarioName: string, status?: 'pass' | 'fail'): string {
        const dirs = this.getDirectories();
        const sanitizedName = scenarioName.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const statusPrefix = status ? `${status}-` : '';
        
        switch (type) {
            case 'video':
                return path.join(dirs.videos, `${statusPrefix}${sanitizedName}-${timestamp}.webm`);
            case 'screenshot':
                return path.join(dirs.screenshots, `${statusPrefix}${sanitizedName}-${timestamp}.png`);
            case 'trace':
                return path.join(dirs.traces, `${statusPrefix}${sanitizedName}-${timestamp}.zip`);
            case 'har':
                return path.join(dirs.har, `${statusPrefix}${sanitizedName}-${timestamp}.har`);
            default:
                return path.join(this.currentTestRunDir, `${statusPrefix}${sanitizedName}-${timestamp}`);
        }
    }
    
    /**
     * Determine if artifact should be captured based on mode and test status
     */
    public shouldCaptureArtifact(artifactType: 'video' | 'screenshot' | 'trace' | 'har', testPassed: boolean): boolean {
        const modeConfig = {
            video: this.config.get('VIDEO_CAPTURE_MODE', 'on-failure'),
            screenshot: this.config.get('SCREENSHOT_CAPTURE_MODE', 'on-failure'),
            trace: this.config.get('TRACE_CAPTURE_MODE', 'on-failure'),
            har: this.config.get('HAR_CAPTURE_MODE', 'always')
        };
        
        const mode = modeConfig[artifactType] as CaptureMode;
        
        switch (mode) {
            case 'always':
                return true;
            case 'on-failure':
                return !testPassed;
            case 'on-success':
                return testPassed;
            case 'never':
                return false;
            default:
                return !testPassed; // Default to on-failure
        }
    }
    
    /**
     * Add console log entry
     */
    public addConsoleLog(type: string, message: string, timestamp?: Date): void {
        if (this.config.getBoolean('CONSOLE_LOG_CAPTURE', true)) {
            this.consoleLogs.push({
                timestamp: timestamp || new Date(),
                type,
                message
            });
        }
    }
    
    /**
     * Save console logs to file
     */
    public saveConsoleLogs(scenarioName?: string): void {
        if (this.consoleLogs.length === 0) return;
        
        const dirs = this.getDirectories();
        const filename = scenarioName 
            ? `${scenarioName.replace(/[^a-zA-Z0-9]/g, '-')}-console.log`
            : 'console.log';
        const filepath = path.join(dirs.consoleLogs, filename);
        
        const content = this.consoleLogs
            .map(log => `[${log.timestamp.toISOString()}] [${log.type.toUpperCase()}] ${log.message}`)
            .join('\n');
        
        fs.writeFileSync(filepath, content);
        CSReporter.debug(`Console logs saved: ${filepath}`);
        
        // Clear logs after saving
        this.consoleLogs = [];
    }
    
    /**
     * Clean up artifacts based on test status
     */
    public async cleanupArtifacts(testPassed: boolean): Promise<void> {
        const cleanupPass = this.config.getBoolean('ARTIFACTS_CLEANUP_PASS', true);
        const cleanupFail = this.config.getBoolean('ARTIFACTS_CLEANUP_FAIL', false);
        
        if ((testPassed && !cleanupPass) || (!testPassed && !cleanupFail)) {
            return; // No cleanup needed
        }
        
        // Determine which artifacts to keep based on capture mode
        const artifactsToClean = ['video', 'screenshot', 'trace', 'har'] as const;
        
        for (const artifact of artifactsToClean) {
            if (!this.shouldCaptureArtifact(artifact, testPassed)) {
                // Clean up this artifact type
                const dir = path.join(this.currentTestRunDir, `${artifact}s`);
                if (fs.existsSync(dir)) {
                    const files = fs.readdirSync(dir);
                    files.forEach(file => {
                        if (file.includes(testPassed ? 'pass-' : 'fail-')) {
                            fs.unlinkSync(path.join(dir, file));
                            CSReporter.debug(`Cleaned up ${artifact}: ${file}`);
                        }
                    });
                }
            }
        }
    }
    
    /**
     * Finalize test run and optionally zip results
     */
    public async finalizeTestRun(): Promise<string> {
        const zipResults = this.config.getBoolean('REPORTS_ZIP_RESULTS', false);
        const keepUnzipped = this.config.getBoolean('REPORTS_KEEP_UNZIPPED', true);
        
        if (!zipResults) {
            CSReporter.info(`Test results available at: ${this.currentTestRunDir}`);
            return this.currentTestRunDir;
        }
        
        // Create zip file
        const zipPath = `${this.currentTestRunDir}.zip`;
        await this.zipDirectory(this.currentTestRunDir, zipPath);
        
        // Remove unzipped folder if configured
        if (!keepUnzipped) {
            this.removeDirectory(this.currentTestRunDir);
            CSReporter.info(`Test results zipped and original folder removed: ${zipPath}`);
        } else {
            CSReporter.info(`Test results zipped: ${zipPath}`);
            CSReporter.info(`Original results folder kept: ${this.currentTestRunDir}`);
        }
        
        return zipPath;
    }
    
    /**
     * Zip a directory
     */
    private zipDirectory(sourceDir: string, outPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(outPath);
            const archive = archiver('zip', { zlib: { level: 9 } });
            
            output.on('close', () => {
                CSReporter.debug(`Zip created: ${archive.pointer()} bytes`);
                resolve();
            });
            
            archive.on('error', (err: any) => {
                reject(err);
            });
            
            archive.pipe(output);
            archive.directory(sourceDir, false);
            archive.finalize();
        });
    }
    
    /**
     * Remove directory recursively
     */
    private removeDirectory(dir: string): void {
        if (fs.existsSync(dir)) {
            fs.readdirSync(dir).forEach(file => {
                const curPath = path.join(dir, file);
                if (fs.lstatSync(curPath).isDirectory()) {
                    this.removeDirectory(curPath);
                } else {
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(dir);
        }
    }
    
    /**
     * Get current test run directory
     */
    public getCurrentTestRunDir(): string {
        return this.currentTestRunDir;
    }
    
    /**
     * Get timestamp of current test run
     */
    public getTimestamp(): string {
        return this.timestamp;
    }
}