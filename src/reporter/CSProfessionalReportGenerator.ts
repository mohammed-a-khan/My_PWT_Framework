import * as fs from 'fs';
import * as path from 'path';
import { CSReporter } from './CSReporter';
import { htmlEscape, attrEscape } from './utils/HtmlSanitizer';

/**
 * Enhanced Step interface with detailed execution information
 */
export interface TestStep {
    id: string;
    name: string;
    keyword: string;
    status: 'passed' | 'failed' | 'skipped' | 'pending';
    duration: number;
    startTime: Date;
    endTime: Date;
    order: number;
    error?: {
        message: string;
        stack?: string;
        diff?: string;
        type?: string;
        actual?: any;
        expected?: any;
    };
    attachments: Array<{
        type: 'screenshot' | 'video' | 'log' | 'har' | 'trace';
        path: string;
        relativePath: string;
        name: string;
        size: number;
        timestamp: Date;
        description?: string;
    }>;
    logs: Array<{
        level: 'info' | 'warn' | 'error' | 'debug' | 'trace';
        message: string;
        timestamp: Date;
        source?: string;
        category?: string;
    }>;
    actions: Array<{
        name: string;
        status: 'passed' | 'failed' | 'skipped';
        duration: number;
        timestamp: Date;
        details?: any;
    }>;
    performance?: {
        memory: number;
        cpu: number;
        networkRequests: number;
        domSize: number;
    };
    metadata?: {
        url?: string;
        element?: string;
        coordinates?: { x: number; y: number };
        viewport?: { width: number; height: number };
    };
}

/**
 * Enhanced Scenario interface with comprehensive test execution details
 */
export interface TestScenario {
    id: string;
    name: string;
    description?: string;
    feature: string;
    featureFile: string;
    tags: string[];
    status: 'passed' | 'failed' | 'skipped' | 'broken';
    severity: 'blocker' | 'critical' | 'major' | 'minor' | 'trivial';
    priority: 'high' | 'medium' | 'low';
    startTime: Date;
    endTime: Date;
    duration: number;
    steps: TestStep[];
    beforeHooks: TestStep[];
    afterHooks: TestStep[];
    retries: number;
    maxRetries: number;
    flaky: boolean;
    knownIssue?: string;
    owner?: string;
    epic?: string;
    story?: string;
    testCaseId?: string;
    automationPercent: number;
    attachments: Array<{
        type: 'screenshot' | 'video' | 'har' | 'trace' | 'log';
        path: string;
        relativePath: string;
        name: string;
        size: number;
        timestamp: Date;
        description?: string;
    }>;
    environment: {
        browser: string;
        browserVersion: string;
        os: string;
        viewport: string;
        device?: string;
    };
    performance: {
        averageResponseTime: number;
        totalMemoryUsage: number;
        networkRequests: number;
        domComplexity: number;
        pageLoadTime?: number;
    };
    categories: string[];
    labels: string[];
    links: Array<{
        name: string;
        url: string;
        type: 'issue' | 'requirement' | 'documentation' | 'other';
    }>;
}

export interface TestFeature {
    name: string;
    description?: string;
    scenarios: TestScenario[];
    tags: string[];
    startTime: Date;
    endTime: Date;
    duration: number;
}

export interface TestEnvironment {
    os: string;
    browser: string;
    browserVersion: string;
    playwright: string;
    node: string;
    ci?: string;
    buildNumber?: string;
    branch?: string;
    commit?: string;
}

export interface TestSuite {
    id: string;
    name: string;
    project: string;
    environment: TestEnvironment;
    startTime: Date;
    endTime: Date;
    duration: number;
    features: TestFeature[];
    categories: Array<{
        name: string;
        type: 'product-defect' | 'test-defect' | 'flaky' | 'known-issue';
        items: string[];
    }>;
    timeline: Array<{
        name: string;
        startTime: Date;
        endTime: Date;
        status: string;
    }>;
    history?: Array<{
        date: Date;
        passed: number;
        failed: number;
        skipped: number;
        passRate: number;
    }>;
}

export class CSProfessionalReportGenerator {
    
    public static generateReport(suite: TestSuite, outputDir: string): void {
        // Create output directory structure
        const dirs = {
            base: outputDir,
            data: path.join(outputDir, 'data'),
            widgets: path.join(outputDir, 'widgets'),
            assets: path.join(outputDir, 'assets')
        };
        
        Object.values(dirs).forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
        
        // Generate main HTML report
        const htmlContent = this.generateMainHtml(suite);
        fs.writeFileSync(path.join(outputDir, 'index.html'), htmlContent);
        
        // Generate data files for dynamic loading
        fs.writeFileSync(path.join(dirs.data, 'suite.json'), JSON.stringify(suite, null, 2));
        fs.writeFileSync(path.join(dirs.data, 'summary.json'), JSON.stringify(this.generateSummary(suite), null, 2));
        fs.writeFileSync(path.join(dirs.data, 'timeline.json'), JSON.stringify(suite.timeline || [], null, 2));
        
        CSReporter.info(`Professional report generated: ${path.join(outputDir, 'index.html')}`);
    }
    
    private static generateSummary(suite: TestSuite): any {
        let totalScenarios = 0;
        let passedScenarios = 0;
        let failedScenarios = 0;
        let skippedScenarios = 0;
        let brokenScenarios = 0;
        let totalSteps = 0;
        let passedSteps = 0;
        let failedSteps = 0;
        
        suite.features.forEach(feature => {
            feature.scenarios.forEach(scenario => {
                totalScenarios++;
                if (scenario.status === 'passed') passedScenarios++;
                else if (scenario.status === 'failed') failedScenarios++;
                else if (scenario.status === 'skipped') skippedScenarios++;
                else if (scenario.status === 'broken') brokenScenarios++;
                
                scenario.steps.forEach(step => {
                    totalSteps++;
                    if (step.status === 'passed') passedSteps++;
                    else if (step.status === 'failed') failedSteps++;
                });
            });
        });
        
        return {
            totalScenarios,
            passedScenarios,
            failedScenarios,
            skippedScenarios,
            brokenScenarios,
            totalSteps,
            passedSteps,
            failedSteps,
            passRate: totalScenarios > 0 ? (passedScenarios / totalScenarios * 100) : 0,
            duration: suite.duration,
            features: suite.features.length
        };
    }
    
    private static generateMainHtml(suite: TestSuite): string {
        const summary = this.generateSummary(suite);
        
        return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${suite.project} - CS Test Automation Report</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" rel="stylesheet">
    <style>
        ${this.generateStyles()}
    </style>
</head>
<body>
    <div class="app">
        ${this.generateHeader(suite, summary)}
        ${this.generateSidebar(suite, summary)}
        
        <main class="main-content">
            <div class="content-wrapper">
                <!-- Overview Dashboard -->
                <section id="overview" class="section active">
                    ${this.generateOverviewSection(suite, summary)}
                </section>
                
                <!-- Features Section -->
                <section id="features" class="section">
                    ${this.generateFeaturesSection(suite)}
                </section>
                
                <!-- Timeline Section -->
                <section id="timeline" class="section">
                    ${this.generateTimelineSection(suite)}
                </section>
                
                <!-- Categories Section -->
                <section id="categories" class="section">
                    ${this.generateCategoriesSection(suite)}
                </section>
                
                <!-- History Section -->
                <section id="history" class="section">
                    ${this.generateHistorySection(suite)}
                </section>
                
                <!-- Environment Section -->
                <section id="environment" class="section">
                    ${this.generateEnvironmentSection(suite)}
                </section>
            </div>
        </main>
    </div>
    
    <script>
        ${this.generateJavaScript()}
    </script>
</body>
</html>`;
    }
    
    private static generateStyles(): string {
        return `
        :root {
            --primary-color: #93186C;
            --primary-dark: #6b1250;
            --primary-light: #b54a94;
            --primary-ultralight: #f5e6f1;
            --sidebar-bg: #93186C;
            --sidebar-hover: #b54a94;
            --sidebar-active: #6b1250;
            --bg-color: #f8f9fa;
            --card-bg: #ffffff;
            --text-primary: #1f2937;
            --text-secondary: #6b7280;
            --text-muted: #9ca3af;
            --border-color: #e5e7eb;
            --success-color: #10b981;
            --danger-color: #ef4444;
            --warning-color: #f59e0b;
            --info-color: #3b82f6;
            --purple-color: #8b5cf6;
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
            --transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
            --transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        [data-theme="dark"] {
            --bg-color: #0f172a;
            --card-bg: #1e293b;
            --text-primary: #f1f5f9;
            --text-secondary: #cbd5e1;
            --text-muted: #64748b;
            --border-color: #334155;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg-color);
            color: var(--text-primary);
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        
        .app {
            display: flex;
            min-height: 100vh;
            position: relative;
        }
        
        /* Header */
        .header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 64px;
            background: var(--card-bg);
            border-bottom: 1px solid var(--border-color);
            z-index: 100;
            display: flex;
            align-items: center;
            padding: 0 2rem;
            box-shadow: var(--shadow-sm);
        }
        
        .header-brand {
            display: flex;
            align-items: center;
            gap: 1rem;
            min-width: 280px;
        }
        
        .header-logo {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 700;
            font-size: 1.25rem;
        }
        
        .header-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--primary-color);
        }
        
        .header-nav {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 2rem;
        }
        
        .header-actions {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        
        .theme-toggle {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
            background: var(--card-bg);
            color: var(--text-secondary);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all var(--transition-fast);
        }
        
        .theme-toggle:hover {
            background: var(--primary-ultralight);
            color: var(--primary-color);
            border-color: var(--primary-light);
        }
        
        /* Sidebar */
        .sidebar {
            position: fixed;
            top: 64px;
            left: 0;
            width: 280px;
            height: calc(100vh - 64px);
            background: var(--sidebar-bg);
            overflow-y: auto;
            z-index: 90;
            padding: 1.5rem 0;
        }
        
        .sidebar::-webkit-scrollbar {
            width: 6px;
        }
        
        .sidebar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
        }
        
        .sidebar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
            border-radius: 3px;
        }
        
        .nav-section {
            margin-bottom: 2rem;
        }
        
        .nav-section-title {
            padding: 0 1.5rem;
            margin-bottom: 0.5rem;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: rgba(255, 255, 255, 0.6);
        }
        
        .nav-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1.5rem;
            color: rgba(255, 255, 255, 0.9);
            text-decoration: none;
            transition: all var(--transition-fast);
            cursor: pointer;
            border-left: 3px solid transparent;
            position: relative;
        }
        
        .nav-item:hover {
            background: var(--sidebar-hover);
            border-left-color: rgba(255, 255, 255, 0.5);
        }
        
        .nav-item.active {
            background: var(--sidebar-active);
            border-left-color: white;
            color: white;
        }
        
        .nav-item-icon {
            width: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .nav-item-badge {
            margin-left: auto;
            padding: 0.125rem 0.5rem;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 100px;
            font-size: 0.75rem;
            font-weight: 600;
        }
        
        /* Main Content */
        .main-content {
            margin-left: 280px;
            margin-top: 64px;
            flex: 1;
            min-height: calc(100vh - 64px);
        }
        
        .content-wrapper {
            padding: 2rem;
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .section {
            display: none;
            animation: fadeIn var(--transition-base);
        }
        
        .section.active {
            display: block;
        }
        
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        /* Cards */
        .card {
            background: var(--card-bg);
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            box-shadow: var(--shadow-sm);
            border: 1px solid var(--border-color);
            transition: all var(--transition-base);
        }
        
        .card:hover {
            box-shadow: var(--shadow-md);
        }
        
        .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid var(--border-color);
        }
        
        .card-title {
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .card-actions {
            display: flex;
            gap: 0.5rem;
        }
        
        /* Stats Grid */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .stat-card {
            background: var(--card-bg);
            border-radius: 12px;
            padding: 1.5rem;
            border: 1px solid var(--border-color);
            box-shadow: var(--shadow-sm);
            transition: all var(--transition-base);
            position: relative;
            overflow: hidden;
        }
        
        .stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, var(--primary-color), var(--primary-light));
        }
        
        .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }
        
        .stat-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            margin-bottom: 1rem;
        }
        
        .stat-card.success .stat-icon {
            background: rgba(16, 185, 129, 0.1);
            color: var(--success-color);
        }
        
        .stat-card.danger .stat-icon {
            background: rgba(239, 68, 68, 0.1);
            color: var(--danger-color);
        }
        
        .stat-card.warning .stat-icon {
            background: rgba(245, 158, 11, 0.1);
            color: var(--warning-color);
        }
        
        .stat-card.info .stat-icon {
            background: rgba(59, 130, 246, 0.1);
            color: var(--info-color);
        }
        
        .stat-value {
            font-size: 2rem;
            font-weight: 700;
            line-height: 1;
            margin-bottom: 0.5rem;
        }
        
        .stat-label {
            font-size: 0.875rem;
            color: var(--text-secondary);
            margin-bottom: 1rem;
        }
        
        .stat-change {
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            padding: 0.25rem 0.75rem;
            border-radius: 100px;
            font-size: 0.75rem;
            font-weight: 600;
        }
        
        .stat-change.positive {
            background: rgba(16, 185, 129, 0.1);
            color: var(--success-color);
        }
        
        .stat-change.negative {
            background: rgba(239, 68, 68, 0.1);
            color: var(--danger-color);
        }
        
        /* Charts */
        .chart-container {
            position: relative;
            height: 300px;
            margin: 1rem 0;
        }
        
        .chart-canvas {
            width: 100%;
            height: 100%;
        }
        
        /* Timeline */
        .timeline {
            position: relative;
            padding: 1rem 0;
        }
        
        .timeline-item {
            display: flex;
            gap: 1rem;
            margin-bottom: 2rem;
            position: relative;
        }
        
        .timeline-marker {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            font-size: 1.25rem;
            color: white;
            position: relative;
            z-index: 2;
        }
        
        .timeline-item::before {
            content: '';
            position: absolute;
            left: 20px;
            top: 40px;
            bottom: -20px;
            width: 2px;
            background: var(--border-color);
            z-index: 1;
        }
        
        .timeline-item:last-child::before {
            display: none;
        }
        
        .timeline-marker.success {
            background: var(--success-color);
        }
        
        .timeline-marker.failed {
            background: var(--danger-color);
        }
        
        .timeline-marker.running {
            background: var(--info-color);
        }
        
        .timeline-content {
            flex: 1;
            background: var(--card-bg);
            border-radius: 8px;
            padding: 1rem;
            border: 1px solid var(--border-color);
        }
        
        .timeline-title {
            font-weight: 600;
            margin-bottom: 0.5rem;
        }
        
        .timeline-meta {
            display: flex;
            gap: 1rem;
            font-size: 0.875rem;
            color: var(--text-secondary);
        }
        
        /* Progress Bars */
        .progress-bar {
            height: 8px;
            background: var(--border-color);
            border-radius: 100px;
            overflow: hidden;
            position: relative;
        }
        
        .progress-fill {
            height: 100%;
            border-radius: 100px;
            transition: width var(--transition-slow);
            position: relative;
            overflow: hidden;
        }
        
        .progress-fill::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(
                90deg,
                rgba(255, 255, 255, 0) 0%,
                rgba(255, 255, 255, 0.3) 50%,
                rgba(255, 255, 255, 0) 100%
            );
            animation: shimmer 2s infinite;
        }
        
        @keyframes shimmer {
            0% {
                transform: translateX(-100%);
            }
            100% {
                transform: translateX(100%);
            }
        }
        
        .progress-fill.success {
            background: var(--success-color);
        }
        
        .progress-fill.danger {
            background: var(--danger-color);
        }
        
        .progress-fill.warning {
            background: var(--warning-color);
        }
        
        /* Feature Cards */
        .feature-card {
            background: var(--card-bg);
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            border: 1px solid var(--border-color);
            transition: all var(--transition-base);
        }
        
        .feature-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1rem;
            cursor: pointer;
        }
        
        .feature-title {
            font-size: 1.125rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .feature-toggle {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform var(--transition-fast);
        }
        
        .feature-card.expanded .feature-toggle {
            transform: rotate(90deg);
        }
        
        .feature-content {
            display: none;
        }
        
        .feature-card.expanded .feature-content {
            display: block;
        }
        
        .scenario-list {
            margin-top: 1rem;
        }
        
        .scenario-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            margin-bottom: 0.5rem;
            background: var(--bg-color);
            border-radius: 8px;
            border: 1px solid var(--border-color);
            cursor: pointer;
            transition: all var(--transition-fast);
        }
        
        .scenario-item:hover {
            background: var(--primary-ultralight);
            border-color: var(--primary-light);
        }
        
        .scenario-status {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
            color: white;
        }
        
        .scenario-status.passed {
            background: var(--success-color);
        }
        
        .scenario-status.failed {
            background: var(--danger-color);
        }
        
        .scenario-status.skipped {
            background: var(--warning-color);
        }
        
        .scenario-status.broken {
            background: var(--purple-color);
        }
        
        .scenario-info {
            flex: 1;
        }
        
        .scenario-name {
            font-weight: 500;
            margin-bottom: 0.25rem;
        }
        
        .scenario-meta {
            display: flex;
            gap: 1rem;
            font-size: 0.875rem;
            color: var(--text-secondary);
        }
        
        .scenario-duration {
            margin-left: auto;
            font-size: 0.875rem;
            color: var(--text-secondary);
        }
        
        /* Modal */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        }
        
        .modal.active {
            display: flex;
        }
        
        .modal-content {
            background: var(--card-bg);
            border-radius: 16px;
            max-width: 900px;
            width: 100%;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: var(--shadow-xl);
        }
        
        .modal-header {
            padding: 1.5rem;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .modal-title {
            font-size: 1.25rem;
            font-weight: 600;
        }
        
        .modal-close {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            border: none;
            background: transparent;
            color: var(--text-secondary);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all var(--transition-fast);
        }
        
        .modal-close:hover {
            background: var(--border-color);
        }
        
        .modal-body {
            flex: 1;
            overflow-y: auto;
            padding: 1.5rem;
        }
        
        /* Steps */
        .step-list {
            margin: 1rem 0;
        }
        
        .step-item {
            display: flex;
            align-items: flex-start;
            gap: 1rem;
            margin-bottom: 1rem;
            padding: 1rem;
            background: var(--bg-color);
            border-radius: 8px;
            border: 1px solid var(--border-color);
        }
        
        .step-status {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.75rem;
            color: white;
            flex-shrink: 0;
            margin-top: 0.125rem;
        }
        
        .step-status.passed {
            background: var(--success-color);
        }
        
        .step-status.failed {
            background: var(--danger-color);
        }
        
        .step-status.skipped {
            background: var(--warning-color);
        }
        
        .step-content {
            flex: 1;
        }
        
        .step-name {
            font-weight: 500;
            margin-bottom: 0.5rem;
        }
        
        .step-keyword {
            color: var(--primary-color);
            font-weight: 600;
        }
        
        .step-error {
            margin-top: 0.5rem;
            padding: 0.75rem;
            background: rgba(239, 68, 68, 0.05);
            border: 1px solid rgba(239, 68, 68, 0.2);
            border-radius: 6px;
            font-family: 'Courier New', monospace;
            font-size: 0.875rem;
            color: var(--danger-color);
        }
        
        .step-attachments {
            display: flex;
            gap: 0.5rem;
            margin-top: 0.5rem;
            flex-wrap: wrap;
        }
        
        .attachment-btn {
            padding: 0.25rem 0.75rem;
            background: var(--primary-ultralight);
            color: var(--primary-color);
            border: 1px solid var(--primary-light);
            border-radius: 6px;
            font-size: 0.875rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.25rem;
            transition: all var(--transition-fast);
            text-decoration: none;
        }
        
        .attachment-btn:hover {
            background: var(--primary-color);
            color: white;
        }
        
        /* Responsive */
        @media (max-width: 1024px) {
            .sidebar {
                transform: translateX(-100%);
                transition: transform var(--transition-base);
            }
            
            .sidebar.open {
                transform: translateX(0);
            }
            
            .main-content {
                margin-left: 0;
            }
            
            .stats-grid {
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            }
        }
        
        @media (max-width: 768px) {
            .header {
                padding: 0 1rem;
            }
            
            .content-wrapper {
                padding: 1rem;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
            }
        }
        `;
    }
    
    private static generateJavaScript(): string {
        return `
        // State management
        const state = {
            currentSection: 'overview',
            theme: localStorage.getItem('theme') || 'light',
            filters: {
                status: 'all',
                severity: 'all',
                tags: []
            },
            expandedFeatures: new Set(),
            selectedScenario: null
        };
        
        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            initializeTheme();
            initializeNavigation();
            initializeCharts();
            initializeFilters();
            initializeModals();
            initializeTimeline();
        });
        
        // Theme management
        function initializeTheme() {
            document.documentElement.setAttribute('data-theme', state.theme);
            updateThemeToggle();
        }
        
        function toggleTheme() {
            state.theme = state.theme === 'light' ? 'dark' : 'light';
            localStorage.setItem('theme', state.theme);
            document.documentElement.setAttribute('data-theme', state.theme);
            updateThemeToggle();
        }
        
        function updateThemeToggle() {
            const toggle = document.querySelector('.theme-toggle');
            if (toggle) {
                toggle.innerHTML = state.theme === 'light' 
                    ? '<i class="fas fa-moon"></i>' 
                    : '<i class="fas fa-sun"></i>';
            }
        }
        
        // Navigation
        function initializeNavigation() {
            document.querySelectorAll('.nav-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const section = item.getAttribute('data-section');
                    if (section) {
                        navigateToSection(section);
                    }
                });
            });
        }
        
        function navigateToSection(sectionId) {
            // Update active nav item
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('data-section') === sectionId) {
                    item.classList.add('active');
                }
            });
            
            // Update active section
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
            });
            
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.classList.add('active');
                state.currentSection = sectionId;
            }
        }
        
        // Charts
        function initializeCharts() {
            drawPieChart();
            drawTrendChart();
            drawDistributionChart();
            drawTimelineChart();
        }
        
        function drawPieChart() {
            const canvas = document.getElementById('pieChart');
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const radius = Math.min(centerX, centerY) - 20;
            
            // Get data from DOM or use defaults
            const data = {
                passed: parseInt(canvas.getAttribute('data-passed') || '0'),
                failed: parseInt(canvas.getAttribute('data-failed') || '0'),
                skipped: parseInt(canvas.getAttribute('data-skipped') || '0'),
                broken: parseInt(canvas.getAttribute('data-broken') || '0')
            };
            
            const total = Object.values(data).reduce((sum, val) => sum + val, 0);
            if (total === 0) return;
            
            const colors = {
                passed: '#10b981',
                failed: '#ef4444',
                skipped: '#f59e0b',
                broken: '#8b5cf6'
            };
            
            let currentAngle = -Math.PI / 2;
            
            Object.entries(data).forEach(([key, value]) => {
                if (value === 0) return;
                
                const sliceAngle = (value / total) * 2 * Math.PI;
                
                // Draw slice
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
                ctx.lineTo(centerX, centerY);
                ctx.fillStyle = colors[key];
                ctx.fill();
                
                // Draw label
                const labelAngle = currentAngle + sliceAngle / 2;
                const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
                const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
                
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 14px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                const percentage = ((value / total) * 100).toFixed(1);
                ctx.fillText(percentage + '%', labelX, labelY);
                
                currentAngle += sliceAngle;
            });
            
            // Draw center circle
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * 0.4, 0, 2 * Math.PI);
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--card-bg');
            ctx.fill();
            
            // Draw center text
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary');
            ctx.font = 'bold 24px Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(total.toString(), centerX, centerY - 10);
            
            ctx.font = '12px Inter';
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
            ctx.fillText('Total Tests', centerX, centerY + 15);
        }
        
        function drawTrendChart() {
            const canvas = document.getElementById('trendChart');
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            const padding = 40;
            const width = canvas.width - padding * 2;
            const height = canvas.height - padding * 2;
            
            // Sample data - replace with actual history data
            const data = [
                { date: '01/01', passed: 85, failed: 10, skipped: 5 },
                { date: '01/02', passed: 88, failed: 8, skipped: 4 },
                { date: '01/03', passed: 82, failed: 15, skipped: 3 },
                { date: '01/04', passed: 90, failed: 7, skipped: 3 },
                { date: '01/05', passed: 93, failed: 5, skipped: 2 },
                { date: '01/06', passed: 95, failed: 3, skipped: 2 },
                { date: '01/07', passed: 92, failed: 6, skipped: 2 }
            ];
            
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw axes
            ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-color');
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padding, padding);
            ctx.lineTo(padding, canvas.height - padding);
            ctx.lineTo(canvas.width - padding, canvas.height - padding);
            ctx.stroke();
            
            // Draw grid lines
            ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-color');
            ctx.globalAlpha = 0.3;
            for (let i = 0; i <= 5; i++) {
                const y = padding + (height / 5) * i;
                ctx.beginPath();
                ctx.moveTo(padding, y);
                ctx.lineTo(canvas.width - padding, y);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            
            // Draw data lines
            const colors = {
                passed: '#10b981',
                failed: '#ef4444',
                skipped: '#f59e0b'
            };
            
            ['passed', 'failed', 'skipped'].forEach(key => {
                ctx.strokeStyle = colors[key];
                ctx.lineWidth = 2;
                ctx.beginPath();
                
                data.forEach((point, index) => {
                    const x = padding + (width / (data.length - 1)) * index;
                    const y = canvas.height - padding - (point[key] / 100) * height;
                    
                    if (index === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                    
                    // Draw point
                    ctx.fillStyle = colors[key];
                    ctx.beginPath();
                    ctx.arc(x, y, 4, 0, 2 * Math.PI);
                    ctx.fill();
                });
                
                ctx.stroke();
            });
            
            // Draw labels
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
            ctx.font = '11px Inter';
            ctx.textAlign = 'center';
            
            data.forEach((point, index) => {
                const x = padding + (width / (data.length - 1)) * index;
                ctx.fillText(point.date, x, canvas.height - padding + 20);
            });
        }
        
        function drawDistributionChart() {
            const canvas = document.getElementById('distributionChart');
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            const padding = 40;
            const width = canvas.width - padding * 2;
            const height = canvas.height - padding * 2;
            
            // Sample data
            const data = [
                { name: 'Unit Tests', passed: 120, failed: 5 },
                { name: 'Integration', passed: 85, failed: 12 },
                { name: 'E2E Tests', passed: 45, failed: 8 },
                { name: 'API Tests', passed: 200, failed: 15 },
                { name: 'Performance', passed: 30, failed: 3 }
            ];
            
            const barWidth = width / data.length * 0.6;
            const barSpacing = width / data.length * 0.4;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Find max value
            const maxValue = Math.max(...data.map(d => d.passed + d.failed));
            
            data.forEach((category, index) => {
                const x = padding + index * (barWidth + barSpacing) + barSpacing / 2;
                const totalHeight = ((category.passed + category.failed) / maxValue) * height;
                const passedHeight = (category.passed / maxValue) * height;
                const failedHeight = (category.failed / maxValue) * height;
                
                // Draw passed bar
                ctx.fillStyle = '#10b981';
                ctx.fillRect(x, canvas.height - padding - passedHeight, barWidth, passedHeight);
                
                // Draw failed bar
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(x, canvas.height - padding - totalHeight, barWidth, failedHeight);
                
                // Draw label
                ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
                ctx.font = '11px Inter';
                ctx.textAlign = 'center';
                ctx.save();
                ctx.translate(x + barWidth / 2, canvas.height - padding + 15);
                ctx.rotate(-45 * Math.PI / 180);
                ctx.fillText(category.name, 0, 0);
                ctx.restore();
            });
        }
        
        function drawTimelineChart() {
            const canvas = document.getElementById('timelineChart');
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Sample timeline data
            const events = [
                { name: 'Test Suite Started', time: 0, status: 'info' },
                { name: 'Login Tests', time: 15, status: 'passed' },
                { name: 'Dashboard Tests', time: 45, status: 'passed' },
                { name: 'User Management', time: 80, status: 'failed' },
                { name: 'Reports Module', time: 120, status: 'passed' },
                { name: 'Test Suite Completed', time: 150, status: 'info' }
            ];
            
            const padding = 20;
            const width = canvas.width - padding * 2;
            const totalTime = events[events.length - 1].time;
            
            // Draw timeline line
            ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-color');
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(padding, canvas.height / 2);
            ctx.lineTo(canvas.width - padding, canvas.height / 2);
            ctx.stroke();
            
            // Draw events
            events.forEach(event => {
                const x = padding + (event.time / totalTime) * width;
                
                // Draw marker
                const colors = {
                    info: '#3b82f6',
                    passed: '#10b981',
                    failed: '#ef4444'
                };
                
                ctx.fillStyle = colors[event.status];
                ctx.beginPath();
                ctx.arc(x, canvas.height / 2, 6, 0, 2 * Math.PI);
                ctx.fill();
                
                // Draw label
                ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary');
                ctx.font = '11px Inter';
                ctx.textAlign = 'center';
                ctx.fillText(event.name, x, canvas.height / 2 - 15);
                
                // Draw time
                ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
                ctx.font = '10px Inter';
                ctx.fillText(event.time + 's', x, canvas.height / 2 + 25);
            });
        }
        
        // Filters
        function initializeFilters() {
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const filterType = btn.getAttribute('data-filter-type');
                    const filterValue = btn.getAttribute('data-filter-value');
                    
                    if (filterType && filterValue) {
                        applyFilter(filterType, filterValue);
                    }
                });
            });
        }
        
        function applyFilter(type, value) {
            state.filters[type] = value;
            updateFilterButtons();
            filterContent();
        }
        
        function updateFilterButtons() {
            document.querySelectorAll('.filter-btn').forEach(btn => {
                const filterType = btn.getAttribute('data-filter-type');
                const filterValue = btn.getAttribute('data-filter-value');
                
                if (state.filters[filterType] === filterValue) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
        
        function filterContent() {
            // Filter scenarios based on current filters
            document.querySelectorAll('.scenario-item').forEach(item => {
                const status = item.getAttribute('data-status');
                const severity = item.getAttribute('data-severity');
                
                let visible = true;
                
                if (state.filters.status !== 'all' && status !== state.filters.status) {
                    visible = false;
                }
                
                if (state.filters.severity !== 'all' && severity !== state.filters.severity) {
                    visible = false;
                }
                
                item.style.display = visible ? 'flex' : 'none';
            });
        }
        
        // Modals
        function initializeModals() {
            document.querySelectorAll('.scenario-item').forEach(item => {
                item.addEventListener('click', () => {
                    const scenarioId = item.getAttribute('data-scenario-id');
                    if (scenarioId) {
                        showScenarioModal(scenarioId);
                    }
                });
            });
            
            document.querySelectorAll('.modal-close').forEach(btn => {
                btn.addEventListener('click', closeModal);
            });
            
            document.querySelectorAll('.modal').forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        closeModal();
                    }
                });
            });
        }
        
        function showScenarioModal(scenarioId) {
            // Load scenario details and show modal
            const modal = document.getElementById('scenarioModal');
            if (modal) {
                modal.classList.add('active');
                state.selectedScenario = scenarioId;
                loadScenarioDetails(scenarioId);
            }
        }
        
        function closeModal() {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('active');
            });
            state.selectedScenario = null;
        }
        
        function loadScenarioDetails(scenarioId) {
            // This would load the actual scenario details
            // For now, using placeholder content
            console.log('Loading scenario:', scenarioId);
        }
        
        // Timeline
        function initializeTimeline() {
            updateTimeline();
            setInterval(updateTimeline, 5000); // Update every 5 seconds
        }
        
        function updateTimeline() {
            // Update timeline with latest data
            const timelineContainer = document.querySelector('.timeline');
            if (timelineContainer && timelineContainer.getAttribute('data-auto-update') === 'true') {
                // Fetch and update timeline data
                console.log('Updating timeline...');
            }
        }
        
        // Feature toggles
        function toggleFeature(featureId) {
            const card = document.getElementById('feature-' + featureId);
            if (card) {
                card.classList.toggle('expanded');
                
                if (state.expandedFeatures.has(featureId)) {
                    state.expandedFeatures.delete(featureId);
                } else {
                    state.expandedFeatures.add(featureId);
                }
            }
        }
        
        // Export functionality
        function exportReport(format) {
            switch (format) {
                case 'pdf':
                    window.print();
                    break;
                case 'json':
                    downloadJSON();
                    break;
                case 'csv':
                    downloadCSV();
                    break;
            }
        }
        
        function downloadJSON() {
            // Collect all report data and download as JSON
            const data = collectReportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'test-report-' + new Date().toISOString() + '.json';
            a.click();
            URL.revokeObjectURL(url);
        }
        
        function downloadCSV() {
            // Convert report data to CSV and download
            const data = collectReportData();
            const csv = convertToCSV(data);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'test-report-' + new Date().toISOString() + '.csv';
            a.click();
            URL.revokeObjectURL(url);
        }
        
        function collectReportData() {
            // Collect all report data from DOM
            return {
                timestamp: new Date().toISOString(),
                // Add more data collection logic
            };
        }
        
        function convertToCSV(data) {
            // Convert data to CSV format
            return 'Test,Status,Duration\\n';
        }
        
        // Utility functions
        function formatDuration(ms) {
            if (ms < 1000) return ms + 'ms';
            if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
            const minutes = Math.floor(ms / 60000);
            const seconds = Math.floor((ms % 60000) / 1000);
            return minutes + 'm ' + seconds + 's';
        }
        
        function formatDate(date) {
            return new Date(date).toLocaleString();
        }
        
        // Search functionality
        function initializeSearch() {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const query = e.target.value.toLowerCase();
                    searchContent(query);
                });
            }
        }
        
        function searchContent(query) {
            document.querySelectorAll('.searchable').forEach(element => {
                const text = element.textContent.toLowerCase();
                element.style.display = text.includes(query) ? '' : 'none';
            });
        }
        `;
    }
    
    private static generateHeader(suite: TestSuite, summary: any): string {
        return `
        <header class="header">
            <div class="header-brand">
                <div class="header-logo">CS</div>
                <div class="header-title">${htmlEscape(suite.project)}</div>
            </div>
            
            <div class="header-nav">
                <div style="display: flex; align-items: center; gap: 2rem;">
                    <div style="text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary-color);">
                            ${summary.passRate.toFixed(1)}%
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">Pass Rate</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary);">
                            ${summary.totalScenarios}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">Total Tests</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary);">
                            ${this.formatDuration(suite.duration)}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">Duration</div>
                    </div>
                </div>
            </div>
            
            <div class="header-actions">
                <button class="theme-toggle" onclick="toggleTheme()">
                    <i class="fas fa-moon"></i>
                </button>
            </div>
        </header>`;
    }
    
    private static generateSidebar(suite: TestSuite, summary: any): string {
        return `
        <aside class="sidebar">
            <nav>
                <div class="nav-section">
                    <div class="nav-section-title">Dashboard</div>
                    <div class="nav-item active" data-section="overview">
                        <span class="nav-item-icon"><i class="fas fa-chart-pie"></i></span>
                        <span>Overview</span>
                    </div>
                    <div class="nav-item" data-section="features">
                        <span class="nav-item-icon"><i class="fas fa-layer-group"></i></span>
                        <span>Features</span>
                        <span class="nav-item-badge">${suite.features.length}</span>
                    </div>
                    <div class="nav-item" data-section="timeline">
                        <span class="nav-item-icon"><i class="fas fa-clock"></i></span>
                        <span>Timeline</span>
                    </div>
                </div>
                
                <div class="nav-section">
                    <div class="nav-section-title">Analysis</div>
                    <div class="nav-item" data-section="categories">
                        <span class="nav-item-icon"><i class="fas fa-tags"></i></span>
                        <span>Categories</span>
                    </div>
                    <div class="nav-item" data-section="history">
                        <span class="nav-item-icon"><i class="fas fa-chart-line"></i></span>
                        <span>History</span>
                    </div>
                    <div class="nav-item" data-section="environment">
                        <span class="nav-item-icon"><i class="fas fa-server"></i></span>
                        <span>Environment</span>
                    </div>
                </div>
                
                <div class="nav-section">
                    <div class="nav-section-title">Results</div>
                    <div class="nav-item" onclick="applyFilter('status', 'passed')">
                        <span class="nav-item-icon"><i class="fas fa-check-circle"></i></span>
                        <span>Passed</span>
                        <span class="nav-item-badge">${summary.passedScenarios}</span>
                    </div>
                    <div class="nav-item" onclick="applyFilter('status', 'failed')">
                        <span class="nav-item-icon"><i class="fas fa-times-circle"></i></span>
                        <span>Failed</span>
                        <span class="nav-item-badge">${summary.failedScenarios}</span>
                    </div>
                    <div class="nav-item" onclick="applyFilter('status', 'skipped')">
                        <span class="nav-item-icon"><i class="fas fa-forward"></i></span>
                        <span>Skipped</span>
                        <span class="nav-item-badge">${summary.skippedScenarios}</span>
                    </div>
                    <div class="nav-item" onclick="applyFilter('status', 'broken')">
                        <span class="nav-item-icon"><i class="fas fa-exclamation-triangle"></i></span>
                        <span>Broken</span>
                        <span class="nav-item-badge">${summary.brokenScenarios}</span>
                    </div>
                </div>
            </nav>
        </aside>`;
    }
    
    private static generateOverviewSection(suite: TestSuite, summary: any): string {
        return `
        <div class="stats-grid">
            <div class="stat-card success">
                <div class="stat-icon">
                    <i class="fas fa-check"></i>
                </div>
                <div class="stat-value">${summary.passedScenarios}</div>
                <div class="stat-label">Passed Tests</div>
                <div class="stat-change positive">
                    <i class="fas fa-arrow-up"></i>
                    <span>+5.2%</span>
                </div>
            </div>
            
            <div class="stat-card danger">
                <div class="stat-icon">
                    <i class="fas fa-times"></i>
                </div>
                <div class="stat-value">${summary.failedScenarios}</div>
                <div class="stat-label">Failed Tests</div>
                <div class="stat-change negative">
                    <i class="fas fa-arrow-down"></i>
                    <span>-2.1%</span>
                </div>
            </div>
            
            <div class="stat-card warning">
                <div class="stat-icon">
                    <i class="fas fa-forward"></i>
                </div>
                <div class="stat-value">${summary.skippedScenarios}</div>
                <div class="stat-label">Skipped Tests</div>
                <div class="stat-change positive">
                    <i class="fas fa-minus"></i>
                    <span>0%</span>
                </div>
            </div>
            
            <div class="stat-card info">
                <div class="stat-icon">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="stat-value">${this.formatDuration(suite.duration)}</div>
                <div class="stat-label">Total Duration</div>
                <div class="stat-change positive">
                    <i class="fas fa-arrow-down"></i>
                    <span>-15s</span>
                </div>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">
                        <i class="fas fa-chart-pie"></i>
                        Test Distribution
                    </h3>
                </div>
                <div class="chart-container">
                    <canvas id="pieChart" width="300" height="300"
                        data-passed="${summary.passedScenarios}"
                        data-failed="${summary.failedScenarios}"
                        data-skipped="${summary.skippedScenarios}"
                        data-broken="${summary.brokenScenarios}">
                    </canvas>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">
                        <i class="fas fa-chart-line"></i>
                        Execution Trend
                    </h3>
                </div>
                <div class="chart-container">
                    <canvas id="trendChart" width="400" height="300"></canvas>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">
                    <i class="fas fa-chart-bar"></i>
                    Category Distribution
                </h3>
            </div>
            <div class="chart-container">
                <canvas id="distributionChart" width="800" height="300"></canvas>
            </div>
        </div>`;
    }
    
    private static generateFeaturesSection(suite: TestSuite): string {
        return suite.features.map((feature, index) => `
            <div class="feature-card" id="feature-${index}">
                <div class="feature-header" onclick="toggleFeature(${index})">
                    <div class="feature-title">
                        <i class="fas fa-folder"></i>
                        ${htmlEscape(feature.name)}
                    </div>
                    <div class="feature-toggle">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
                <div class="feature-content">
                    <div class="scenario-list">
                        ${feature.scenarios.map(scenario => this.generateScenarioItem(scenario)).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    private static generateScenarioItem(scenario: TestScenario): string {
        const icon = scenario.status === 'passed' ? 'check' : 
                     scenario.status === 'failed' ? 'times' : 
                     scenario.status === 'skipped' ? 'forward' : 'exclamation';
        
        return `
        <div class="scenario-item" 
             data-scenario-id="${scenario.id}"
             data-status="${scenario.status}"
             data-severity="${scenario.severity}">
            <div class="scenario-status ${scenario.status}">
                <i class="fas fa-${icon}"></i>
            </div>
            <div class="scenario-info">
                <div class="scenario-name">${htmlEscape(scenario.name)}</div>
                <div class="scenario-meta">
                    <span><i class="fas fa-tag"></i> ${scenario.tags.filter((tag: string) => {
                        // Exclude internal tags
                        if (tag.startsWith('@data-config:')) return false;
                        // Exclude ADO tags
                        if (tag.startsWith('@TestPlanId:') || tag.startsWith('@TestSuiteId:') ||
                            tag.startsWith('@TestCaseId:') || tag.startsWith('@BuildId:') ||
                            tag.startsWith('@ReleaseId:')) return false;
                        // Exclude @DataProvider
                        if (tag === '@DataProvider') return false;
                        return true;
                    }).join(', ')}</span>
                    <span><i class="fas fa-layer-group"></i> ${scenario.steps.length} steps</span>
                </div>
                ${(scenario as any).testData ? (() => {
                    const td = (scenario as any).testData;
                    const usedColumns = td.usedColumns || [];
                    const hasUnusedColumns = usedColumns.length > 0 && usedColumns.length < td.totalColumns;

                    // Get indices of used columns only if filtering is needed
                    const columnsToShow = usedColumns.length > 0 ? usedColumns : td.headers;
                    const indicesToShow = columnsToShow.map((col: string) => td.headers.indexOf(col));

                    return `
                    <div class="test-data-info" style="margin-top: 8px; padding: 8px; background: #f8f9fa; border-radius: 4px; font-size: 0.85em;">
                        <div style="font-weight: 600; color: #495057; margin-bottom: 5px;">
                            <i class="fas fa-database"></i> Test Data (Iteration ${td.iterationNumber}/${td.totalIterations})
                            ${td.source ? `
                                <span style="font-weight: normal; font-size: 0.9em; color: #6c757d; margin-left: 8px;">
                                    ${td.source.type === 'csv' ?
                                        `<i class="fas fa-file-csv"></i> ${htmlEscape(td.source.file || 'inline')}${td.source.filter ? ` [${htmlEscape(td.source.filter)}]` : ''}` :
                                      td.source.type === 'excel' || td.source.type === 'xlsx' ?
                                        `<i class="fas fa-file-excel"></i> ${htmlEscape(td.source.file)} (${htmlEscape(td.source.sheet || 'Sheet1')})${td.source.filter ? ` [${htmlEscape(td.source.filter)}]` : ''}` :
                                      td.source.type === 'json' ?
                                        `<i class="fas fa-file-code"></i> ${htmlEscape(td.source.file || 'inline')}${td.source.filter ? ` [${htmlEscape(td.source.filter)}]` : ''}` :
                                      td.source.type === 'xml' ?
                                        `<i class="fas fa-file-code"></i> ${htmlEscape(td.source.file || 'inline')}${td.source.filter ? ` [${htmlEscape(td.source.filter)}]` : ''}` :
                                      td.source.type === 'database' || td.source.type === 'db' ?
                                        `<i class="fas fa-database"></i> ${htmlEscape(td.source.connection || 'default')}${td.source.query ? ` [${htmlEscape(td.source.query)}]` : ''}` :
                                      '<i class="fas fa-list"></i> Inline'}
                                </span>
                            ` : ''}
                            ${hasUnusedColumns ? `
                                <span style="font-weight: normal; font-size: 0.85em; color: #007bff; margin-left: 8px;">
                                    (Using ${usedColumns.length} of ${td.totalColumns} columns)
                                </span>
                            ` : ''}
                        </div>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                            ${indicesToShow.map((idx: number) => {
                                const header = td.headers[idx];
                                const value = td.values[idx];
                                const isUsed = !usedColumns.length || usedColumns.includes(header);
                                return `
                                    <span style="background: white; padding: 2px 8px; border-radius: 3px;
                                                 border: 1px solid ${isUsed ? '#28a745' : '#dee2e6'};
                                                 ${!isUsed ? 'opacity: 0.6;' : ''}">
                                        <strong style="color: ${isUsed ? '#155724' : '#6c757d'};">${htmlEscape(header)}:</strong>
                                        <span style="font-family: monospace;">${htmlEscape(value)}</span>
                                    </span>
                                `;
                            }).join('')}
                        </div>
                        ${hasUnusedColumns ? `
                            <div style="margin-top: 5px; font-size: 0.8em; color: #6c757d; font-style: italic;">
                                * Grayed out columns were not used in this test
                            </div>
                        ` : ''}
                    </div>
                    `;
                })() : ''}
            </div>
            <div class="scenario-duration">${this.formatDuration(scenario.duration)}</div>
        </div>`;
    }
    
    private static generateTimelineSection(suite: TestSuite): string {
        return `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">
                    <i class="fas fa-stream"></i>
                    Execution Timeline
                </h3>
            </div>
            <div class="chart-container">
                <canvas id="timelineChart" width="800" height="200"></canvas>
            </div>
        </div>
        
        <div class="timeline" data-auto-update="false">
            ${(suite.timeline || []).map(event => `
                <div class="timeline-item">
                    <div class="timeline-marker ${event.status}">
                        <i class="fas fa-${event.status === 'passed' ? 'check' : 'times'}"></i>
                    </div>
                    <div class="timeline-content">
                        <div class="timeline-title">${event.name}</div>
                        <div class="timeline-meta">
                            <span><i class="fas fa-clock"></i> ${this.formatDate(event.startTime)}</span>
                            <span><i class="fas fa-hourglass"></i> ${this.formatDuration(event.endTime.getTime() - event.startTime.getTime())}</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>`;
    }
    
    private static generateCategoriesSection(suite: TestSuite): string {
        return `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
            ${(suite.categories || []).map(category => `
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">
                            <i class="fas fa-tag"></i>
                            ${category.name}
                        </h3>
                    </div>
                    <div style="padding: 0.5rem 0;">
                        ${category.items.map(item => `
                            <div style="padding: 0.5rem; margin-bottom: 0.5rem; background: var(--bg-color); border-radius: 6px;">
                                ${item}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>`;
    }
    
    private static generateHistorySection(suite: TestSuite): string {
        return `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">
                    <i class="fas fa-history"></i>
                    Test History
                </h3>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--border-color);">
                        <th style="padding: 1rem; text-align: left;">Date</th>
                        <th style="padding: 1rem; text-align: center;">Passed</th>
                        <th style="padding: 1rem; text-align: center;">Failed</th>
                        <th style="padding: 1rem; text-align: center;">Skipped</th>
                        <th style="padding: 1rem; text-align: center;">Pass Rate</th>
                    </tr>
                </thead>
                <tbody>
                    ${(suite.history || []).map(entry => `
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 1rem;">${this.formatDate(entry.date)}</td>
                            <td style="padding: 1rem; text-align: center; color: var(--success-color);">${entry.passed}</td>
                            <td style="padding: 1rem; text-align: center; color: var(--danger-color);">${entry.failed}</td>
                            <td style="padding: 1rem; text-align: center; color: var(--warning-color);">${entry.skipped}</td>
                            <td style="padding: 1rem; text-align: center;">
                                <div class="progress-bar">
                                    <div class="progress-fill success" style="width: ${entry.passRate}%"></div>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
    }
    
    private static generateEnvironmentSection(suite: TestSuite): string {
        const env = suite.environment;
        return `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">
                    <i class="fas fa-server"></i>
                    Test Environment
                </h3>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                <div style="padding: 1rem; background: var(--bg-color); border-radius: 8px;">
                    <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Operating System</div>
                    <div style="font-weight: 600;">${env.os}</div>
                </div>
                <div style="padding: 1rem; background: var(--bg-color); border-radius: 8px;">
                    <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Browser</div>
                    <div style="font-weight: 600;">${env.browser} ${env.browserVersion}</div>
                </div>
                <div style="padding: 1rem; background: var(--bg-color); border-radius: 8px;">
                    <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Playwright Version</div>
                    <div style="font-weight: 600;">${env.playwright}</div>
                </div>
                <div style="padding: 1rem; background: var(--bg-color); border-radius: 8px;">
                    <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Node.js Version</div>
                    <div style="font-weight: 600;">${env.node}</div>
                </div>
                ${env.ci ? `
                <div style="padding: 1rem; background: var(--bg-color); border-radius: 8px;">
                    <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">CI/CD</div>
                    <div style="font-weight: 600;">${env.ci}</div>
                </div>
                ` : ''}
                ${env.buildNumber ? `
                <div style="padding: 1rem; background: var(--bg-color); border-radius: 8px;">
                    <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Build Number</div>
                    <div style="font-weight: 600;">${env.buildNumber}</div>
                </div>
                ` : ''}
            </div>
        </div>`;
    }
    
    private static formatDuration(ms: number): string {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }
    
    private static formatDate(date: Date): string {
        return new Date(date).toLocaleString();
    }
}