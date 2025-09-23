import * as fs from 'fs';
import * as path from 'path';
import { CSConfigurationManager } from '../core/CSConfigurationManager';
import { CSReporter } from './CSReporter';

// Test result types
interface TestStep {
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    duration?: number;
    error?: string;
    logs?: string[];
    screenshot?: string;
}

interface TestScenario {
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    feature?: string;
    tags?: string[];
    steps: TestStep[];
    duration?: number;
    startTime?: Date;
    endTime?: Date;
}

interface TestSuite {
    name: string;
    scenarios: TestScenario[];
    startTime: Date;
    endTime: Date;
    duration?: number;
    totalScenarios?: number;
    passedScenarios?: number;
    failedScenarios?: number;
}

interface Artifact {
    name: string;
    path: string;
    size: number;
}

interface Artifacts {
    screenshots: Artifact[];
    videos: Artifact[];
    har: Artifact[];
    traces: Artifact[];
    consoleLogs: Artifact[];
}

/**
 * CS World-Class Professional Report Generator
 * Generates a stunning HTML report that rivals and exceeds Allure and ExtentReports
 * 
 * Features:
 * - Multi-page navigation with smooth transitions
 * - Rich interactive dashboard with multiple chart types
 * - Detailed test execution timeline with Gantt chart
 * - Complete environment information
 * - Full test hierarchy (Feature → Scenario → Step)
 * - Step-by-step execution details with timestamps, duration, logs, screenshots
 * - Failure analysis with stack traces
 * - Search and filter capabilities
 * - Categories and tags organization
 * - Beautiful modern UI with brand colors
 * - Responsive design for all devices
 * - Export and print capabilities
 */
export class CSWorldClassReportGenerator {
    private static config = CSConfigurationManager.getInstance();
    private static brandColor = '#93186C';
    private static brandColorLight = '#b83395';
    private static brandColorDark = '#6b1150';
    
    /**
     * Generate the world-class HTML report
     */
    public static generateReport(suite: TestSuite, outputDir: string): void {
        try {
            // Ensure output directory exists
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // Collect all artifacts
            const artifacts = this.collectArtifacts(outputDir);
            
            // Generate the main HTML report
            const htmlContent = this.generateCompleteHTML(suite, artifacts);
            const reportPath = path.join(outputDir, 'index.html');
            fs.writeFileSync(reportPath, htmlContent);
            
            // Generate supporting JSON data file
            const jsonData = this.generateJSONData(suite, artifacts);
            const jsonPath = path.join(outputDir, 'report-data.json');
            fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
            
            CSReporter.info(`✨ World-class report generated: ${reportPath}`);
        } catch (error) {
            CSReporter.error(`Failed to generate report: ${error}`);
        }
    }

    /**
     * Collect all test artifacts (screenshots, videos, HAR, traces)
     */
    private static collectArtifacts(baseDir: string): Artifacts {
        const parentDir = path.dirname(baseDir);
        const artifacts: Artifacts = {
            screenshots: [],
            videos: [],
            har: [],
            traces: [],
            consoleLogs: []
        };

        // Collect screenshots
        const screenshotsDir = path.join(parentDir, 'screenshots');
        if (fs.existsSync(screenshotsDir)) {
            artifacts.screenshots = fs.readdirSync(screenshotsDir)
                .filter(f => f.endsWith('.png'))
                .map(f => ({
                    name: f,
                    path: path.join('..', 'screenshots', f),
                    size: fs.statSync(path.join(screenshotsDir, f)).size
                }));
        }

        // Collect videos
        const videosDir = path.join(parentDir, 'videos');
        if (fs.existsSync(videosDir)) {
            artifacts.videos = fs.readdirSync(videosDir)
                .filter(f => f.endsWith('.webm') || f.endsWith('.mp4'))
                .map(f => ({
                    name: f,
                    path: path.join('..', 'videos', f),
                    size: fs.statSync(path.join(videosDir, f)).size
                }));
        }

        // Collect HAR files
        const harDir = path.join(parentDir, 'har');
        if (fs.existsSync(harDir)) {
            artifacts.har = fs.readdirSync(harDir)
                .filter(f => f.endsWith('.har'))
                .map(f => ({
                    name: f,
                    path: path.join('..', 'har', f),
                    size: fs.statSync(path.join(harDir, f)).size
                }));
        }

        // Collect traces
        const tracesDir = path.join(parentDir, 'traces');
        if (fs.existsSync(tracesDir)) {
            artifacts.traces = fs.readdirSync(tracesDir)
                .filter(f => f.endsWith('.zip'))
                .map(f => ({
                    name: f,
                    path: path.join('..', 'traces', f),
                    size: fs.statSync(path.join(tracesDir, f)).size
                }));
        }

        return artifacts;
    }

    /**
     * Generate JSON data for the report
     */
    private static generateJSONData(suite: TestSuite, artifacts: Artifacts): any {
        const stats = this.calculateStatistics(suite);
        const environment = this.getEnvironmentInfo(suite);
        
        return {
            suite,
            statistics: stats,
            environment,
            artifacts,
            generatedAt: new Date().toISOString(),
            framework: {
                name: this.config.get('FRAMEWORK_NAME', 'CS Test Automation'),
                version: this.config.get('FRAMEWORK_VERSION', '3.0.0')
            }
        };
    }

    /**
     * Calculate comprehensive statistics
     */
    private static calculateStatistics(suite: TestSuite): any {
        let totalSteps = 0;
        let passedSteps = 0;
        let failedSteps = 0;
        let skippedSteps = 0;
        let totalDuration = 0;
        const featureStats = new Map<string, any>();
        const tagStats = new Map<string, number>();
        const statusDistribution = { passed: 0, failed: 0, skipped: 0 };

        suite.scenarios.forEach(scenario => {
            // Update status distribution
            if (scenario.status === 'passed') statusDistribution.passed++;
            else if (scenario.status === 'failed') statusDistribution.failed++;
            else statusDistribution.skipped++;

            // Calculate step statistics
            scenario.steps.forEach(step => {
                totalSteps++;
                if (step.status === 'passed') passedSteps++;
                else if (step.status === 'failed') failedSteps++;
                else skippedSteps++;
                totalDuration += step.duration || 0;
            });

            // Track feature statistics
            const featureName = scenario.feature || 'Unknown Feature';
            if (!featureStats.has(featureName)) {
                featureStats.set(featureName, { passed: 0, failed: 0, total: 0, duration: 0 });
            }
            const fStats = featureStats.get(featureName);
            fStats.total++;
            if (scenario.status === 'passed') fStats.passed++;
            else if (scenario.status === 'failed') fStats.failed++;
            fStats.duration += scenario.duration || 0;

            // Track tag statistics
            scenario.tags?.forEach(tag => {
                tagStats.set(tag, (tagStats.get(tag) || 0) + 1);
            });
        });

        return {
            totalScenarios: suite.scenarios.length,
            passedScenarios: statusDistribution.passed,
            failedScenarios: statusDistribution.failed,
            skippedScenarios: statusDistribution.skipped,
            totalSteps,
            passedSteps,
            failedSteps,
            skippedSteps,
            totalDuration,
            averageDuration: totalDuration / suite.scenarios.length,
            passRate: ((statusDistribution.passed / suite.scenarios.length) * 100).toFixed(2),
            featureStats: Array.from(featureStats.entries()).map(([name, stats]) => ({ name, ...stats })),
            tagStats: Array.from(tagStats.entries()).map(([tag, count]) => ({ tag, count })),
            statusDistribution
        };
    }

    /**
     * Get comprehensive environment information
     */
    private static getEnvironmentInfo(suite?: TestSuite): any {
        return {
            framework: {
                name: this.config.get('FRAMEWORK_NAME', 'CS Test Automation'),
                version: this.config.get('FRAMEWORK_VERSION', '3.0.0'),
                mode: this.config.get('FRAMEWORK_MODE', 'optimized')
            },
            execution: {
                project: this.config.get('PROJECT', 'unknown'),
                environment: this.config.get('ENVIRONMENT', 'unknown'),
                browser: this.config.get('BROWSER', 'chrome'),
                headless: this.config.get('HEADLESS', 'false'),
                parallel: this.config.get('PARALLEL', 'false'),
                workers: this.config.get('WORKERS', '1')
            },
            system: {
                platform: process.platform,
                arch: process.arch,
                nodeVersion: process.version,
                memory: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
                cpus: require('os').cpus().length
            },
            timestamp: {
                startTime: suite?.startTime || new Date(),
                endTime: suite?.endTime || new Date(),
                duration: suite?.duration || 0,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                locale: this.config.get('BROWSER_LOCALE', 'en-US')
            },
            configuration: {
                baseUrl: this.config.get('BASE_URL', ''),
                timeout: this.config.get('TIMEOUT', '30000'),
                retryCount: this.config.get('RETRY_COUNT', '2'),
                screenshotOnFailure: this.config.get('SCREENSHOT_ON_FAILURE', 'true'),
                videoCapture: this.config.get('VIDEO_CAPTURE_MODE', 'on-failure'),
                harCapture: this.config.get('HAR_CAPTURE_MODE', 'always')
            }
        };
    }

    /**
     * Generate the complete HTML report with all features
     */
    private static generateCompleteHTML(suite: TestSuite, artifacts: Artifacts): string {
        const stats = this.calculateStatistics(suite);
        const environment = this.getEnvironmentInfo(suite);
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CS Test Automation - World-Class Test Report</title>
    
    <!-- External Libraries -->
    <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/plugin/duration.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/plugin/relativeTime.js"></script>

    <!-- Custom Chart Library (embedded) -->
    <script>
${fs.readFileSync(path.join(__dirname, 'CSCustomChartsEmbedded.js'), 'utf8')}
    </script>
    
    <style>
        ${this.generateCSS()}
    </style>
</head>
<body>
    <div id="app">
        ${this.generateHeader(suite, stats)}
        ${this.generateNavigation()}
        
        <main class="main-content">
            <!-- Dashboard View -->
            <div id="dashboard-view" class="view active">
                ${this.generateDashboard(stats, environment, artifacts)}
            </div>
            
            <!-- Tests View -->
            <div id="tests-view" class="view">
                ${this.generateTestsView(suite)}
            </div>
            
            <!-- Timeline View -->
            <div id="timeline-view" class="view">
                ${this.generateTimelineView(suite)}
            </div>
            
            <!-- Categories View -->
            <div id="categories-view" class="view">
                ${this.generateCategoriesView(suite, stats)}
            </div>
            
            <!-- Environment View -->
            <div id="environment-view" class="view">
                ${this.generateEnvironmentView(environment)}
            </div>
            
            <!-- Artifacts View -->
            <div id="artifacts-view" class="view">
                ${this.generateArtifactsView(artifacts)}
            </div>
        </main>
        
        ${this.generateFooter()}
    </div>
    
    <!-- Test Details Modal -->
    <div id="test-modal" class="modal">
        <div class="modal-content">
            <span class="modal-close">&times;</span>
            <div id="modal-body"></div>
        </div>
    </div>
    
    <!-- Screenshot Viewer Modal -->
    <div id="screenshot-modal" class="modal">
        <div class="modal-content modal-large">
            <span class="modal-close">&times;</span>
            <img id="screenshot-img" src="" alt="Screenshot">
        </div>
    </div>
    
    <script>
        ${this.generateJavaScript(suite, stats, artifacts)}
    </script>
</body>
</html>`;
    }

    /**
     * Generate comprehensive CSS styling
     */
    private static generateCSS(): string {
        return `
        :root {
            --brand-color: ${this.brandColor};
            --brand-color-light: ${this.brandColorLight};
            --brand-color-dark: ${this.brandColorDark};
            --success-color: #10b981;
            --danger-color: #ef4444;
            --warning-color: #f59e0b;
            --info-color: #3b82f6;
            --background: #ffffff;
            --surface: #f9fafb;
            --surface-hover: #f3f4f6;
            --text-primary: #111827;
            --text-secondary: #6b7280;
            --border: #e5e7eb;
            --shadow: rgba(0, 0, 0, 0.1);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            color: var(--text-primary);
            line-height: 1.6;
            min-height: 100vh;
        }

        #app {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        /* Header Styles */
        .header {
            background: linear-gradient(135deg, var(--brand-color) 0%, var(--brand-color-dark) 100%);
            color: white;
            padding: 2rem;
            box-shadow: 0 4px 6px var(--shadow);
        }

        .header-content {
            max-width: 1400px;
            margin: 0 auto;
        }

        .header-title {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1.5rem;
        }

        .header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .logo {
            width: 50px;
            height: 50px;
            background: white;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            color: var(--brand-color);
            font-weight: bold;
        }

        .header-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
        }

        .stat-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 1rem;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 0.25rem;
        }

        .stat-label {
            font-size: 0.875rem;
            opacity: 0.9;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        /* Navigation */
        .navigation {
            background: white;
            box-shadow: 0 1px 3px var(--shadow);
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .nav-container {
            max-width: 1400px;
            margin: 0 auto;
            display: flex;
            gap: 2rem;
            padding: 0 2rem;
        }

        .nav-item {
            padding: 1rem 1.5rem;
            cursor: pointer;
            position: relative;
            transition: all 0.3s ease;
            font-weight: 500;
            color: var(--text-secondary);
            border-bottom: 3px solid transparent;
        }

        .nav-item:hover {
            color: var(--brand-color);
            background: var(--surface);
        }

        .nav-item.active {
            color: var(--brand-color);
            border-bottom-color: var(--brand-color);
        }

        /* Main Content */
        .main-content {
            flex: 1;
            max-width: 1400px;
            margin: 2rem auto;
            padding: 0 2rem;
            width: 100%;
        }

        .view {
            display: none;
            animation: fadeIn 0.3s ease;
        }

        .view.active {
            display: block;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Dashboard Grid */
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
        }

        .card {
            background: white;
            border-radius: 16px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px var(--shadow);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 12px var(--shadow);
        }

        .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid var(--surface);
        }

        .card-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
        }

        .card-icon {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
        }

        .icon-success { background: rgba(16, 185, 129, 0.1); color: var(--success-color); }
        .icon-danger { background: rgba(239, 68, 68, 0.1); color: var(--danger-color); }
        .icon-warning { background: rgba(245, 158, 11, 0.1); color: var(--warning-color); }
        .icon-info { background: rgba(59, 130, 246, 0.1); color: var(--info-color); }

        /* Charts Container */
        .chart-container {
            position: relative;
            height: 300px;
            margin-top: 1rem;
        }

        /* Test Results Table */
        .tests-container {
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px var(--shadow);
        }

        .tests-header {
            background: var(--surface);
            padding: 1.5rem;
            border-bottom: 2px solid var(--border);
        }

        .tests-filters {
            display: flex;
            gap: 1rem;
            margin-bottom: 1rem;
        }

        .filter-btn {
            padding: 0.5rem 1rem;
            border-radius: 8px;
            border: 1px solid var(--border);
            background: white;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .filter-btn:hover {
            background: var(--surface);
            border-color: var(--brand-color);
            color: var(--brand-color);
        }

        .filter-btn.active {
            background: var(--brand-color);
            color: white;
            border-color: var(--brand-color);
        }

        .search-box {
            flex: 1;
            padding: 0.75rem 1rem;
            border: 2px solid var(--border);
            border-radius: 8px;
            font-size: 1rem;
            transition: border-color 0.3s ease;
        }

        .search-box:focus {
            outline: none;
            border-color: var(--brand-color);
        }

        /* Test Items */
        .test-item {
            padding: 1.5rem;
            border-bottom: 1px solid var(--border);
            transition: background 0.3s ease;
            cursor: pointer;
        }

        .test-item:hover {
            background: var(--surface);
        }

        .test-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 0.5rem;
        }

        .test-name {
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--text-primary);
        }

        .test-status {
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.875rem;
            font-weight: 500;
            text-transform: uppercase;
        }

        .status-passed {
            background: rgba(16, 185, 129, 0.1);
            color: var(--success-color);
        }

        .status-failed {
            background: rgba(239, 68, 68, 0.1);
            color: var(--danger-color);
        }

        .status-skipped {
            background: rgba(245, 158, 11, 0.1);
            color: var(--warning-color);
        }

        .test-meta {
            display: flex;
            gap: 2rem;
            color: var(--text-secondary);
            font-size: 0.875rem;
        }

        .test-meta-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        /* Steps */
        .steps-container {
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid var(--border);
        }

        .step-item {
            display: flex;
            align-items: start;
            gap: 1rem;
            padding: 0.75rem;
            margin-bottom: 0.5rem;
            border-radius: 8px;
            transition: background 0.3s ease;
        }

        .step-item:hover {
            background: var(--surface);
        }

        .step-icon {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            font-size: 0.75rem;
            font-weight: bold;
        }

        .step-content {
            flex: 1;
        }

        .step-name {
            font-weight: 500;
            margin-bottom: 0.25rem;
        }

        .step-details {
            display: flex;
            gap: 1rem;
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        .step-log {
            margin-top: 0.5rem;
            padding: 0.5rem;
            background: var(--surface);
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 0.875rem;
            max-height: 200px;
            overflow-y: auto;
        }

        /* Attachments */
        .attachments {
            display: flex;
            gap: 0.5rem;
            margin-top: 0.5rem;
            flex-wrap: wrap;
        }

        .attachment-btn {
            padding: 0.25rem 0.75rem;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 6px;
            font-size: 0.875rem;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 0.25rem;
        }

        .attachment-btn:hover {
            background: var(--brand-color);
            color: white;
            border-color: var(--brand-color);
        }

        /* Timeline */
        .timeline-container {
            background: white;
            border-radius: 16px;
            padding: 2rem;
            box-shadow: 0 4px 6px var(--shadow);
        }

        .timeline-chart {
            width: 100%;
            height: 500px;
            position: relative;
        }

        /* Environment Table */
        .env-table {
            width: 100%;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px var(--shadow);
        }

        .env-table th {
            background: var(--surface);
            padding: 1rem;
            text-align: left;
            font-weight: 600;
            color: var(--text-primary);
            border-bottom: 2px solid var(--border);
        }

        .env-table td {
            padding: 1rem;
            border-bottom: 1px solid var(--border);
        }

        .env-table tr:hover {
            background: var(--surface);
        }

        .env-category {
            background: var(--surface);
            font-weight: 600;
            color: var(--brand-color);
        }

        /* Modals */
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(5px);
        }

        .modal.active {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .modal-content {
            background: white;
            border-radius: 16px;
            padding: 2rem;
            max-width: 800px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
            animation: slideUp 0.3s ease;
        }

        .modal-large {
            max-width: 1200px;
        }

        @keyframes slideUp {
            from { transform: translateY(50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        .modal-close {
            position: absolute;
            top: 1rem;
            right: 1rem;
            font-size: 2rem;
            cursor: pointer;
            color: var(--text-secondary);
            transition: color 0.3s ease;
        }

        .modal-close:hover {
            color: var(--danger-color);
        }

        /* Footer */
        .footer {
            background: white;
            padding: 2rem;
            text-align: center;
            border-top: 1px solid var(--border);
            margin-top: 4rem;
        }

        .footer-content {
            max-width: 1400px;
            margin: 0 auto;
            color: var(--text-secondary);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .header h1 { font-size: 1.5rem; }
            .dashboard-grid { grid-template-columns: 1fr; }
            .nav-container { overflow-x: auto; }
            .test-meta { flex-direction: column; gap: 0.5rem; }
        }

        /* Print Styles */
        @media print {
            .navigation, .footer { display: none; }
            .card { break-inside: avoid; }
            .modal { display: none !important; }
        }

        /* Custom Scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }

        ::-webkit-scrollbar-track {
            background: var(--surface);
            border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb {
            background: var(--brand-color);
            border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: var(--brand-color-dark);
        }
        `;
    }

    /**
     * Generate header section
     */
    private static generateHeader(suite: TestSuite, stats: any): string {
        const duration = this.formatDuration(suite.duration || 0);
        const passRate = stats.passRate;
        
        return `
        <header class="header">
            <div class="header-content">
                <div class="header-title">
                    <h1>
                        <div class="logo">CS</div>
                        Test Automation Report
                    </h1>
                    <div class="execution-time">
                        <div>${new Date(suite.startTime).toLocaleString()}</div>
                        <div>Duration: ${duration}</div>
                    </div>
                </div>
                <div class="header-stats">
                    <div class="stat-card">
                        <div class="stat-value">${stats.totalScenarios}</div>
                        <div class="stat-label">Total Tests</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" style="color: #10b981;">${stats.passedScenarios}</div>
                        <div class="stat-label">Passed</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" style="color: #ef4444;">${stats.failedScenarios}</div>
                        <div class="stat-label">Failed</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${passRate}%</div>
                        <div class="stat-label">Pass Rate</div>
                    </div>
                </div>
            </div>
        </header>
        `;
    }

    /**
     * Generate navigation
     */
    private static generateNavigation(): string {
        return `
        <nav class="navigation">
            <div class="nav-container">
                <div class="nav-item active" data-view="dashboard">📊 Dashboard</div>
                <div class="nav-item" data-view="tests">🧪 Tests</div>
                <div class="nav-item" data-view="timeline">⏱️ Timeline</div>
                <div class="nav-item" data-view="categories">🏷️ Categories</div>
                <div class="nav-item" data-view="environment">🖥️ Environment</div>
                <div class="nav-item" data-view="artifacts">📎 Artifacts</div>
            </div>
        </nav>
        `;
    }

    /**
     * Generate dashboard view
     */
    private static generateDashboard(stats: any, environment: any, artifacts: Artifacts): string {
        return `
        <div class="dashboard-grid">
            <!-- Test Status Distribution -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Test Status Distribution</h3>
                    <div class="card-icon icon-info">📊</div>
                </div>
                <div class="chart-container">
                    <canvas id="status-chart"></canvas>
                </div>
            </div>

            <!-- Pass/Fail Trend -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Execution Timeline</h3>
                    <div class="card-icon icon-success">📈</div>
                </div>
                <div class="chart-container">
                    <canvas id="timeline-chart"></canvas>
                </div>
            </div>

            <!-- Feature Performance -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Feature Performance</h3>
                    <div class="card-icon icon-warning">⚡</div>
                </div>
                <div class="chart-container">
                    <canvas id="feature-chart"></canvas>
                </div>
            </div>

            <!-- Duration Analysis -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Duration Analysis</h3>
                    <div class="card-icon icon-info">⏱️</div>
                </div>
                <div class="chart-container">
                    <canvas id="duration-chart"></canvas>
                </div>
            </div>

            <!-- Execution Heat Map -->
            <div class="card" style="grid-column: span 2;">
                <div class="card-header">
                    <h3 class="card-title">Execution Heat Map</h3>
                    <div class="card-icon icon-warning">🔥</div>
                </div>
                <div class="chart-container" style="height: 400px;">
                    <canvas id="heatmap-chart"></canvas>
                </div>
            </div>

            <!-- Tag Distribution -->
            <div class="card" style="grid-column: span 2;">
                <div class="card-header">
                    <h3 class="card-title">Tag Distribution</h3>
                    <div class="card-icon icon-info">📊</div>
                </div>
                <div class="chart-container">
                    <canvas id="tag-distribution-chart"></canvas>
                </div>
            </div>

            <!-- Quick Stats -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Execution Summary</h3>
                    <div class="card-icon icon-success">📋</div>
                </div>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-label">Total Steps</div>
                        <div class="stat-value">${stats.totalSteps}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Avg Duration</div>
                        <div class="stat-value">${this.formatDuration(stats.averageDuration)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Browser</div>
                        <div class="stat-value">${environment.execution.browser}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Environment</div>
                        <div class="stat-value">${environment.execution.environment}</div>
                    </div>
                </div>
            </div>

            <!-- Top Tags -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Top Tags</h3>
                    <div class="card-icon icon-info">🏷️</div>
                </div>
                <div class="tags-container">
                    ${stats.tagStats.slice(0, 10).map((tag: any) => `
                        <span class="tag-badge">${tag.tag} (${tag.count})</span>
                    `).join('')}
                </div>
            </div>
        </div>
        `;
    }

    /**
     * Generate tests view with detailed information
     */
    private static generateTestsView(suite: TestSuite): string {
        return `
        <div class="tests-container">
            <div class="tests-header">
                <div class="tests-filters">
                    <button class="filter-btn active" data-filter="all">All</button>
                    <button class="filter-btn" data-filter="passed">Passed</button>
                    <button class="filter-btn" data-filter="failed">Failed</button>
                    <button class="filter-btn" data-filter="skipped">Skipped</button>
                    <input type="text" class="search-box" placeholder="Search tests..." id="test-search">
                </div>
            </div>
            <div class="tests-list">
                ${suite.scenarios.map((scenario: TestScenario, index: number) => this.generateTestItem(scenario, index)).join('')}
            </div>
        </div>
        `;
    }

    /**
     * Generate individual test item
     */
    private static generateTestItem(scenario: TestScenario, index: number): string {
        const statusClass = `status-${scenario.status}`;
        const duration = this.formatDuration(scenario.duration || 0);
        
        return `
        <div class="test-item" data-status="${scenario.status}" data-index="${index}">
            <div class="test-header">
                <div class="test-name">${scenario.name}</div>
                <div class="test-status ${statusClass}">${scenario.status}</div>
            </div>
            <div class="test-meta">
                <div class="test-meta-item">
                    <span>📂</span> ${scenario.feature || 'Unknown Feature'}
                </div>
                <div class="test-meta-item">
                    <span>⏱️</span> ${duration}
                </div>
                <div class="test-meta-item">
                    <span>📝</span> ${scenario.steps.length} steps
                </div>
                ${scenario.tags && scenario.tags.length > 0 ? `
                <div class="test-meta-item">
                    <span>🏷️</span> ${scenario.tags.join(', ')}
                </div>
                ` : ''}
            </div>
            <div class="steps-container" style="display: none;">
                ${scenario.steps.map((step: TestStep) => this.generateStepItem(step)).join('')}
            </div>
        </div>
        `;
    }

    /**
     * Generate step item with details
     */
    private static generateStepItem(step: TestStep): string {
        const statusColor = step.status === 'passed' ? '#10b981' : 
                           step.status === 'failed' ? '#ef4444' : '#f59e0b';
        
        return `
        <div class="step-item">
            <div class="step-icon" style="background: ${statusColor}20; color: ${statusColor};">
                ${step.status === 'passed' ? '✓' : step.status === 'failed' ? '✗' : '○'}
            </div>
            <div class="step-content">
                <div class="step-name">${step.name}</div>
                <div class="step-details">
                    <span>Duration: ${this.formatDuration(step.duration || 0)}</span>
                    ${step.error ? `<span style="color: var(--danger-color);">Error: ${step.error}</span>` : ''}
                </div>
                ${step.logs && step.logs.length > 0 ? `
                <div class="step-log">
                    ${step.logs.join('<br>')}
                </div>
                ` : ''}
                ${step.screenshot ? `
                <div class="attachments">
                    <button class="attachment-btn" onclick="viewScreenshot('${step.screenshot}')">
                        📷 Screenshot
                    </button>
                </div>
                ` : ''}
            </div>
        </div>
        `;
    }

    /**
     * Generate timeline view
     */
    private static generateTimelineView(suite: TestSuite): string {
        return `
        <div class="timeline-container">
            <h2>Test Execution Timeline</h2>
            <div class="timeline-chart">
                <canvas id="gantt-chart"></canvas>
            </div>
        </div>
        `;
    }

    /**
     * Generate categories view
     */
    private static generateCategoriesView(suite: TestSuite, stats: any): string {
        return `
        <div class="categories-container">
            <h2>Test Categories & Features</h2>
            <div class="dashboard-grid">
                ${stats.featureStats.map((feature: any) => `
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">${feature.name}</h3>
                        <div class="card-icon icon-info">📁</div>
                    </div>
                    <div class="feature-stats">
                        <div class="stat-row">
                            <span>Total:</span> <strong>${feature.total}</strong>
                        </div>
                        <div class="stat-row">
                            <span>Passed:</span> <strong style="color: var(--success-color);">${feature.passed}</strong>
                        </div>
                        <div class="stat-row">
                            <span>Failed:</span> <strong style="color: var(--danger-color);">${feature.failed}</strong>
                        </div>
                        <div class="stat-row">
                            <span>Duration:</span> <strong>${this.formatDuration(feature.duration)}</strong>
                        </div>
                    </div>
                </div>
                `).join('')}
            </div>
        </div>
        `;
    }

    /**
     * Generate environment view
     */
    private static generateEnvironmentView(environment: any): string {
        return `
        <div class="environment-container">
            <h2>Environment Information</h2>
            <table class="env-table">
                <tr class="env-category">
                    <td colspan="2">Framework Information</td>
                </tr>
                <tr>
                    <th>Framework Name</th>
                    <td>${environment.framework.name}</td>
                </tr>
                <tr>
                    <th>Framework Version</th>
                    <td>${environment.framework.version}</td>
                </tr>
                <tr>
                    <th>Execution Mode</th>
                    <td>${environment.framework.mode}</td>
                </tr>
                
                <tr class="env-category">
                    <td colspan="2">Execution Details</td>
                </tr>
                <tr>
                    <th>Project</th>
                    <td>${environment.execution.project}</td>
                </tr>
                <tr>
                    <th>Environment</th>
                    <td>${environment.execution.environment}</td>
                </tr>
                <tr>
                    <th>Browser</th>
                    <td>${environment.execution.browser}</td>
                </tr>
                <tr>
                    <th>Headless</th>
                    <td>${environment.execution.headless}</td>
                </tr>
                <tr>
                    <th>Parallel Execution</th>
                    <td>${environment.execution.parallel}</td>
                </tr>
                <tr>
                    <th>Workers</th>
                    <td>${environment.execution.workers}</td>
                </tr>
                
                <tr class="env-category">
                    <td colspan="2">System Information</td>
                </tr>
                <tr>
                    <th>Platform</th>
                    <td>${environment.system.platform}</td>
                </tr>
                <tr>
                    <th>Architecture</th>
                    <td>${environment.system.arch}</td>
                </tr>
                <tr>
                    <th>Node Version</th>
                    <td>${environment.system.nodeVersion}</td>
                </tr>
                <tr>
                    <th>Memory Usage</th>
                    <td>${environment.system.memory}</td>
                </tr>
                <tr>
                    <th>CPUs</th>
                    <td>${environment.system.cpus}</td>
                </tr>
                
                <tr class="env-category">
                    <td colspan="2">Configuration</td>
                </tr>
                <tr>
                    <th>Base URL</th>
                    <td>${environment.configuration.baseUrl}</td>
                </tr>
                <tr>
                    <th>Default Timeout</th>
                    <td>${environment.configuration.timeout}ms</td>
                </tr>
                <tr>
                    <th>Retry Count</th>
                    <td>${environment.configuration.retryCount}</td>
                </tr>
                <tr>
                    <th>Screenshot on Failure</th>
                    <td>${environment.configuration.screenshotOnFailure}</td>
                </tr>
                <tr>
                    <th>Video Capture Mode</th>
                    <td>${environment.configuration.videoCapture}</td>
                </tr>
                <tr>
                    <th>HAR Capture Mode</th>
                    <td>${environment.configuration.harCapture}</td>
                </tr>
            </table>
        </div>
        `;
    }

    /**
     * Generate artifacts view
     */
    private static generateArtifactsView(artifacts: Artifacts): string {
        return `
        <div class="artifacts-container">
            <h2>Test Artifacts</h2>
            
            <div class="dashboard-grid">
                <!-- Screenshots -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Screenshots (${artifacts.screenshots.length})</h3>
                        <div class="card-icon icon-info">📷</div>
                    </div>
                    <div class="artifacts-list">
                        ${artifacts.screenshots.map((s: Artifact) => `
                            <div class="artifact-item">
                                <a href="${s.path}" target="_blank">${s.name}</a>
                                <span class="artifact-size">(${this.formatFileSize(s.size)})</span>
                            </div>
                        `).join('') || '<p>No screenshots captured</p>'}
                    </div>
                </div>

                <!-- Videos -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Videos (${artifacts.videos.length})</h3>
                        <div class="card-icon icon-success">🎬</div>
                    </div>
                    <div class="artifacts-list">
                        ${artifacts.videos.map((v: Artifact) => `
                            <div class="artifact-item">
                                <a href="${v.path}" target="_blank">${v.name}</a>
                                <span class="artifact-size">(${this.formatFileSize(v.size)})</span>
                            </div>
                        `).join('') || '<p>No videos captured</p>'}
                    </div>
                </div>

                <!-- HAR Files -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">HAR Files (${artifacts.har.length})</h3>
                        <div class="card-icon icon-warning">🌐</div>
                    </div>
                    <div class="artifacts-list">
                        ${artifacts.har.map((h: Artifact) => `
                            <div class="artifact-item">
                                <a href="${h.path}" target="_blank">${h.name}</a>
                                <span class="artifact-size">(${this.formatFileSize(h.size)})</span>
                            </div>
                        `).join('') || '<p>No HAR files captured</p>'}
                    </div>
                </div>

                <!-- Traces -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Traces (${artifacts.traces.length})</h3>
                        <div class="card-icon icon-danger">🔍</div>
                    </div>
                    <div class="artifacts-list">
                        ${artifacts.traces.map((t: Artifact) => `
                            <div class="artifact-item">
                                <a href="${t.path}" target="_blank">${t.name}</a>
                                <span class="artifact-size">(${this.formatFileSize(t.size)})</span>
                            </div>
                        `).join('') || '<p>No traces captured</p>'}
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    /**
     * Generate footer
     */
    private static generateFooter(): string {
        return `
        <footer class="footer">
            <div class="footer-content">
                <p>Generated by <strong>CS Test Automation Framework v3.0</strong> | 
                   ${new Date().toLocaleString()} | 
                   <a href="#" onclick="window.print()">🖨️ Print Report</a> | 
                   <a href="report-data.json" download>💾 Export JSON</a>
                </p>
            </div>
        </footer>
        `;
    }

    /**
     * Generate JavaScript for interactivity
     */
    private static generateJavaScript(suite: TestSuite, stats: any, artifacts: Artifacts): string {
        return `
        // Initialize dayjs plugins
        dayjs.extend(dayjs_plugin_duration);
        dayjs.extend(dayjs_plugin_relativeTime);

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', function() {
                const viewName = this.dataset.view;
                
                // Update active nav
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                this.classList.add('active');
                
                // Update active view
                document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
                document.getElementById(viewName + '-view').classList.add('active');
                
                // Initialize charts if dashboard
                if (viewName === 'dashboard') {
                    setTimeout(initializeCharts, 100);
                }
            });
        });

        // Test item expansion
        document.querySelectorAll('.test-item').forEach(item => {
            item.addEventListener('click', function() {
                const stepsContainer = this.querySelector('.steps-container');
                if (stepsContainer) {
                    stepsContainer.style.display = 
                        stepsContainer.style.display === 'none' ? 'block' : 'none';
                }
            });
        });

        // Test filtering
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const filter = this.dataset.filter;
                
                // Update active filter
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // Filter tests
                document.querySelectorAll('.test-item').forEach(test => {
                    if (filter === 'all' || test.dataset.status === filter) {
                        test.style.display = 'block';
                    } else {
                        test.style.display = 'none';
                    }
                });
            });
        });

        // Search functionality
        const searchBox = document.getElementById('test-search');
        if (searchBox) {
            searchBox.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase();
                
                document.querySelectorAll('.test-item').forEach(test => {
                    const testName = test.querySelector('.test-name').textContent.toLowerCase();
                    if (testName.includes(searchTerm)) {
                        test.style.display = 'block';
                    } else {
                        test.style.display = 'none';
                    }
                });
            });
        }

        // Initialize Charts
        function initializeCharts() {
            // Status Distribution Chart
            const statusCtx = document.getElementById('status-chart');
            if (statusCtx && !statusCtx.chart) {
                statusCtx.chart = new CSChart(statusCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Passed', 'Failed', 'Skipped'],
                        datasets: [{
                            data: [${stats.passedScenarios}, ${stats.failedScenarios}, ${stats.skippedScenarios}],
                            backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom'
                            }
                        }
                    }
                });
            }

            // Timeline Chart
            const timelineCtx = document.getElementById('timeline-chart');
            if (timelineCtx && !timelineCtx.chart) {
                const scenarios = ${JSON.stringify(suite.scenarios.map((s: TestScenario) => ({
                    name: s.name.substring(0, 20),
                    duration: s.duration || 0,
                    status: s.status
                })))};
                
                timelineCtx.chart = new CSChart(timelineCtx, {
                    type: 'bar',
                    data: {
                        labels: scenarios.map(s => s.name),
                        datasets: [{
                            label: 'Duration (ms)',
                            data: scenarios.map(s => s.duration),
                            backgroundColor: scenarios.map(s => 
                                s.status === 'passed' ? '#10b98180' : 
                                s.status === 'failed' ? '#ef444480' : '#f59e0b80'
                            ),
                            borderColor: scenarios.map(s => 
                                s.status === 'passed' ? '#10b981' : 
                                s.status === 'failed' ? '#ef4444' : '#f59e0b'
                            ),
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            }

            // Feature Performance Chart
            const featureCtx = document.getElementById('feature-chart');
            if (featureCtx && !featureCtx.chart) {
                const featureData = ${JSON.stringify(stats.featureStats)};
                
                featureCtx.chart = new CSChart(featureCtx, {
                    type: 'bar',
                    data: {
                        labels: featureData.map(f => f.name),
                        datasets: [{
                            label: 'Passed',
                            data: featureData.map(f => f.passed),
                            backgroundColor: '#10b98140',
                            borderColor: '#10b981',
                            borderWidth: 2
                        }, {
                            label: 'Failed',
                            data: featureData.map(f => f.failed),
                            backgroundColor: '#ef444440',
                            borderColor: '#ef4444',
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false
                    }
                });
            }

            // Duration Analysis Chart
            const durationCtx = document.getElementById('duration-chart');
            if (durationCtx && !durationCtx.chart) {
                const durations = ${JSON.stringify(suite.scenarios.map((s: TestScenario) => s.duration || 0).sort((a: number, b: number) => a - b))};
                
                durationCtx.chart = new CSChart(durationCtx, {
                    type: 'line',
                    data: {
                        labels: durations.map((_, i) => 'Test ' + (i + 1)),
                        datasets: [{
                            label: 'Duration (ms)',
                            data: durations,
                            backgroundColor: '${this.brandColor}20',
                            borderColor: '${this.brandColor}',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            }

            // Heat Map Chart
            const heatmapCtx = document.getElementById('heatmap-chart');
            if (heatmapCtx && !heatmapCtx.chart) {
                const heatmapData = generateHeatmapData();
                if (heatmapData && heatmapData.data.length > 0) {
                    renderHeatMap(heatmapCtx, heatmapData);
                }
            }

            // Tag Distribution Chart
            const tagDistCtx = document.getElementById('tag-distribution-chart');
            if (tagDistCtx && !tagDistCtx.chart) {
                const tagStats = ${JSON.stringify(stats.tagStats || [])};
                if (tagStats.length > 0) {
                    tagDistCtx.chart = new CSChart(tagDistCtx, {
                        type: 'bar',
                        data: {
                            labels: tagStats.map(t => t.tag),
                            datasets: [{
                                label: 'Count',
                                data: tagStats.map(t => t.count),
                                backgroundColor: '#6366f1'
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false
                        }
                    });
                }
            }
        }

        // Generate heat map data
        function generateHeatmapData() {
            const scenarios = ${JSON.stringify(suite.scenarios || [])};
            if (!scenarios || scenarios.length === 0) return null;

            // Group scenarios by hour of execution
            const hourlyData = {};
            const dayMap = {};

            scenarios.forEach(scenario => {
                const date = new Date(scenario.startTime);
                const hour = date.getHours();
                const day = date.toLocaleDateString('en-US', { weekday: 'short' });

                if (!hourlyData[day]) hourlyData[day] = {};
                if (!hourlyData[day][hour]) hourlyData[day][hour] = { passed: 0, failed: 0, total: 0 };

                hourlyData[day][hour].total++;
                if (scenario.status === 'passed') hourlyData[day][hour].passed++;
                else if (scenario.status === 'failed') hourlyData[day][hour].failed++;
            });

            // Convert to heat map format
            const days = Object.keys(hourlyData);
            const hours = Array.from({length: 24}, (_, i) => i);
            const data = [];

            days.forEach((day, dayIndex) => {
                hours.forEach(hour => {
                    if (hourlyData[day] && hourlyData[day][hour]) {
                        const stats = hourlyData[day][hour];
                        const passRate = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;
                        data.push({
                            x: hour,
                            y: dayIndex,
                            value: stats.total,
                            passRate: passRate
                        });
                    }
                });
            });

            return {
                days: days,
                hours: hours,
                data: data
            };
        }

        // Render heat map
        function renderHeatMap(canvas, heatmapData) {
            const ctx = canvas.getContext('2d');
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;

            const cellWidth = (canvas.width - 60) / 24;
            const cellHeight = (canvas.height - 40) / heatmapData.days.length;
            const margin = { left: 60, top: 20, right: 20, bottom: 20 };

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw cells
            heatmapData.data.forEach(cell => {
                const x = margin.left + cell.x * cellWidth;
                const y = margin.top + cell.y * cellHeight;

                // Color based on pass rate
                const intensity = cell.passRate / 100;
                const color = cell.value === 0 ? '#f3f4f6' :
                              intensity > 0.8 ? '#10b981' :
                              intensity > 0.5 ? '#f59e0b' : '#ef4444';

                ctx.fillStyle = color;
                ctx.fillRect(x, y, cellWidth - 2, cellHeight - 2);

                // Draw value text
                if (cell.value > 0) {
                    ctx.fillStyle = '#fff';
                    ctx.font = '10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(cell.value.toString(), x + cellWidth/2, y + cellHeight/2);
                }
            });

            // Draw hour labels
            ctx.fillStyle = '#666';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'center';
            heatmapData.hours.forEach((hour, i) => {
                if (i % 3 === 0) { // Show every 3rd hour
                    const x = margin.left + i * cellWidth + cellWidth/2;
                    ctx.fillText(hour + ':00', x, canvas.height - 5);
                }
            });

            // Draw day labels
            ctx.textAlign = 'right';
            heatmapData.days.forEach((day, i) => {
                const y = margin.top + i * cellHeight + cellHeight/2;
                ctx.fillText(day, margin.left - 5, y);
            });

            // Draw legend
            const legendY = 5;
            const legendItems = [
                { color: '#10b981', label: '>80% Pass' },
                { color: '#f59e0b', label: '50-80% Pass' },
                { color: '#ef4444', label: '<50% Pass' }
            ];

            ctx.font = '10px sans-serif';
            let legendX = canvas.width - 200;
            legendItems.forEach(item => {
                ctx.fillStyle = item.color;
                ctx.fillRect(legendX, legendY, 12, 12);
                ctx.fillStyle = '#666';
                ctx.textAlign = 'left';
                ctx.fillText(item.label, legendX + 15, legendY + 9);
                legendX += 65;
            });
        }

        // Initialize charts on load
        setTimeout(initializeCharts, 500);

        // Screenshot viewer
        function viewScreenshot(path) {
            const modal = document.getElementById('screenshot-modal');
            const img = document.getElementById('screenshot-img');
            img.src = path;
            modal.classList.add('active');
        }

        // Modal close handlers
        document.querySelectorAll('.modal-close').forEach(close => {
            close.addEventListener('click', function() {
                this.closest('.modal').classList.remove('active');
            });
        });

        // Close modal on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.remove('active');
                }
            });
        });
        `;
    }

    /**
     * Utility function to format duration
     */
    private static formatDuration(ms: number): string {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
        const minutes = Math.floor(ms / 60000);
        const seconds = ((ms % 60000) / 1000).toFixed(0);
        return `${minutes}m ${seconds}s`;
    }

    /**
     * Utility function to format file size
     */
    private static formatFileSize(bytes: number): string {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
}