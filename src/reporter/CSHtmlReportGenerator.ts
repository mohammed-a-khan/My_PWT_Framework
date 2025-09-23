import * as fs from 'fs';
import * as path from 'path';
import { CSReporter } from './CSReporter';

export interface ScenarioResult {
    name: string;
    feature: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    steps: Array<{
        name: string;
        status: 'passed' | 'failed' | 'skipped';
        duration: number;
        error?: string;
    }>;
    error?: string;
    screenshots?: string[];
    video?: string;
}

export interface TestRunSummary {
    project: string;
    timestamp: Date;
    duration: number;
    totalScenarios: number;
    passedScenarios: number;
    failedScenarios: number;
    skippedScenarios: number;
    passRate: number;
    scenarios: ScenarioResult[];
}

export class CSHtmlReportGenerator {
    
    public static generateReport(summary: TestRunSummary, outputPath: string): void {
        const htmlContent = this.generateHtmlContent(summary);
        
        // Ensure directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(outputPath, htmlContent);
        CSReporter.info(`Professional HTML report generated: ${outputPath}`);
    }
    
    private static generateHtmlContent(summary: TestRunSummary): string {
        const executionTime = this.formatDuration(summary.duration);
        const timestamp = summary.timestamp.toLocaleString();
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CS Test Automation Report - ${summary.project}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {
            --primary-color: #93186C;
            --primary-dark: #6b1250;
            --primary-light: #b54a94;
            --primary-ultralight: #f5e6f1;
            --sidebar-bg: #93186C;
            --sidebar-hover: #b54a94;
            --sidebar-active: #6b1250;
            --bg-color: #f7f7f7;
            --card-bg: #ffffff;
            --text-primary: #1f2937;
            --text-secondary: #6b7280;
            --border-color: #e5e7eb;
            --success-color: #10b981;
            --danger-color: #ef4444;
            --warning-color: #f59e0b;
            --info-color: #3b82f6;
            --purple-color: #8b5cf6;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-color);
            color: var(--text-primary);
            line-height: 1.6;
        }
        
        .app-container {
            display: flex;
            min-height: 100vh;
        }
        
        /* Sidebar */
        .sidebar {
            width: 280px;
            background: var(--sidebar-bg);
            color: white;
            padding: 0;
            position: fixed;
            height: 100vh;
            overflow-y: auto;
            box-shadow: 4px 0 20px rgba(147, 24, 108, 0.1);
        }
        
        .sidebar-header {
            padding: 2rem 1.5rem;
            background: var(--primary-dark);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .sidebar-logo {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 1rem;
        }
        
        .sidebar-logo i {
            font-size: 2rem;
            color: var(--primary-light);
        }
        
        .sidebar-title {
            font-size: 1.5rem;
            font-weight: 700;
            letter-spacing: -0.5px;
        }
        
        .sidebar-subtitle {
            font-size: 0.875rem;
            opacity: 0.9;
            margin-top: 0.25rem;
        }
        
        .sidebar-nav {
            padding: 1.5rem 0;
        }
        
        .nav-section {
            margin-bottom: 2rem;
        }
        
        .nav-section-title {
            padding: 0 1.5rem;
            margin-bottom: 0.5rem;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            opacity: 0.7;
        }
        
        .nav-item {
            padding: 0.75rem 1.5rem;
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            transition: all 0.2s;
            border-left: 3px solid transparent;
        }
        
        .nav-item:hover {
            background: var(--sidebar-hover);
            border-left-color: white;
        }
        
        .nav-item.active {
            background: var(--sidebar-active);
            border-left-color: var(--primary-light);
        }
        
        .nav-item i {
            width: 20px;
            text-align: center;
        }
        
        /* Main Content */
        .main-content {
            flex: 1;
            margin-left: 280px;
            padding: 2rem;
        }
        
        /* Header */
        .header {
            background: var(--card-bg);
            border-radius: 12px;
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            border: 1px solid var(--border-color);
        }
        
        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }
        
        .header-title {
            font-size: 2rem;
            font-weight: 700;
            color: var(--primary-color);
            letter-spacing: -0.5px;
        }
        
        .header-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 0.5rem 1rem;
            background: var(--primary-ultralight);
            color: var(--primary-color);
            border-radius: 100px;
            font-weight: 600;
            font-size: 0.875rem;
        }
        
        .header-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }
        
        .header-info-item {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--text-secondary);
            font-size: 0.875rem;
        }
        
        .header-info-item i {
            color: var(--primary-color);
        }
        
        /* Stats Grid */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .stat-card {
            background: var(--card-bg);
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            border: 1px solid var(--border-color);
            transition: all 0.3s;
        }
        
        .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(147, 24, 108, 0.1);
        }
        
        .stat-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }
        
        .stat-card-title {
            font-size: 0.875rem;
            color: var(--text-secondary);
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .stat-card-icon {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
        }
        
        .stat-card.total .stat-card-icon {
            background: var(--primary-ultralight);
            color: var(--primary-color);
        }
        
        .stat-card.passed .stat-card-icon {
            background: rgba(16, 185, 129, 0.1);
            color: var(--success-color);
        }
        
        .stat-card.failed .stat-card-icon {
            background: rgba(239, 68, 68, 0.1);
            color: var(--danger-color);
        }
        
        .stat-card.skipped .stat-card-icon {
            background: rgba(245, 158, 11, 0.1);
            color: var(--warning-color);
        }
        
        .stat-card-value {
            font-size: 2.5rem;
            font-weight: 700;
            line-height: 1;
            margin-bottom: 0.5rem;
        }
        
        .stat-card.total .stat-card-value {
            color: var(--primary-color);
        }
        
        .stat-card.passed .stat-card-value {
            color: var(--success-color);
        }
        
        .stat-card.failed .stat-card-value {
            color: var(--danger-color);
        }
        
        .stat-card.skipped .stat-card-value {
            color: var(--warning-color);
        }
        
        .stat-card-percentage {
            font-size: 0.75rem;
            color: var(--text-secondary);
        }
        
        /* Charts Section */
        .charts-section {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .chart-card {
            background: var(--card-bg);
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            border: 1px solid var(--border-color);
        }
        
        .chart-title {
            font-size: 1rem;
            font-weight: 600;
            margin-bottom: 1.5rem;
            color: var(--text-primary);
        }
        
        /* Pie Chart */
        .pie-chart-container {
            position: relative;
            width: 200px;
            height: 200px;
            margin: 0 auto;
        }
        
        .pie-chart {
            width: 100%;
            height: 100%;
            transform: rotate(-90deg);
        }
        
        .pie-chart-center {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
        }
        
        .pie-chart-percentage {
            font-size: 2rem;
            font-weight: 700;
            color: var(--primary-color);
        }
        
        .pie-chart-label {
            font-size: 0.75rem;
            color: var(--text-secondary);
        }
        
        /* Legend */
        .legend {
            display: flex;
            gap: 1.5rem;
            margin-top: 1.5rem;
            justify-content: center;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.875rem;
        }
        
        .legend-color {
            width: 12px;
            height: 12px;
            border-radius: 3px;
        }
        
        /* Scenarios Table */
        .scenarios-section {
            background: var(--card-bg);
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            border: 1px solid var(--border-color);
        }
        
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }
        
        .section-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
        }
        
        .filter-buttons {
            display: flex;
            gap: 0.5rem;
        }
        
        .filter-btn {
            padding: 0.5rem 1rem;
            border: 1px solid var(--border-color);
            background: white;
            border-radius: 8px;
            font-size: 0.875rem;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .filter-btn:hover {
            background: var(--primary-ultralight);
            border-color: var(--primary-light);
        }
        
        .filter-btn.active {
            background: var(--primary-color);
            color: white;
            border-color: var(--primary-color);
        }
        
        /* Scenario Cards */
        .scenarios-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        
        .scenario-card {
            border: 1px solid var(--border-color);
            border-radius: 8px;
            overflow: hidden;
            transition: all 0.2s;
        }
        
        .scenario-card:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        
        .scenario-card.passed {
            border-left: 4px solid var(--success-color);
        }
        
        .scenario-card.failed {
            border-left: 4px solid var(--danger-color);
        }
        
        .scenario-card.skipped {
            border-left: 4px solid var(--warning-color);
        }
        
        .scenario-header {
            padding: 1rem;
            background: var(--bg-color);
            cursor: pointer;
        }
        
        .scenario-header:hover {
            background: var(--primary-ultralight);
        }
        
        .scenario-header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }
        
        .scenario-name {
            font-weight: 600;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .scenario-status {
            padding: 0.25rem 0.75rem;
            border-radius: 100px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .scenario-status.passed {
            background: rgba(16, 185, 129, 0.1);
            color: var(--success-color);
        }
        
        .scenario-status.failed {
            background: rgba(239, 68, 68, 0.1);
            color: var(--danger-color);
        }
        
        .scenario-status.skipped {
            background: rgba(245, 158, 11, 0.1);
            color: var(--warning-color);
        }
        
        .scenario-meta {
            display: flex;
            gap: 1rem;
            font-size: 0.875rem;
            color: var(--text-secondary);
        }
        
        .scenario-meta-item {
            display: flex;
            align-items: center;
            gap: 4px;
        }
        
        .scenario-details {
            padding: 1rem;
            border-top: 1px solid var(--border-color);
            display: none;
        }
        
        .scenario-card.expanded .scenario-details {
            display: block;
        }
        
        .steps-list {
            margin-bottom: 1rem;
        }
        
        .step-item {
            padding: 0.5rem;
            margin-bottom: 0.5rem;
            border-radius: 6px;
            background: var(--bg-color);
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .step-icon {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.75rem;
        }
        
        .step-item.passed .step-icon {
            background: var(--success-color);
            color: white;
        }
        
        .step-item.failed .step-icon {
            background: var(--danger-color);
            color: white;
        }
        
        .step-name {
            flex: 1;
            font-size: 0.875rem;
            color: var(--text-primary);
        }
        
        .step-duration {
            font-size: 0.75rem;
            color: var(--text-secondary);
        }
        
        .error-message {
            background: rgba(239, 68, 68, 0.05);
            border: 1px solid rgba(239, 68, 68, 0.2);
            border-radius: 6px;
            padding: 1rem;
            margin-top: 1rem;
        }
        
        .error-title {
            color: var(--danger-color);
            font-weight: 600;
            margin-bottom: 0.5rem;
            font-size: 0.875rem;
        }
        
        .error-content {
            font-family: 'Courier New', monospace;
            font-size: 0.8rem;
            color: var(--text-primary);
            white-space: pre-wrap;
            word-break: break-word;
        }
        
        /* Artifacts */
        .artifacts {
            display: flex;
            gap: 0.5rem;
            margin-top: 1rem;
            flex-wrap: wrap;
        }
        
        .artifact-btn {
            padding: 0.5rem 1rem;
            background: var(--primary-ultralight);
            color: var(--primary-color);
            border: 1px solid var(--primary-light);
            border-radius: 6px;
            font-size: 0.875rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
            text-decoration: none;
        }
        
        .artifact-btn:hover {
            background: var(--primary-color);
            color: white;
        }
        
        /* Footer */
        .footer {
            text-align: center;
            padding: 2rem;
            color: var(--text-secondary);
            font-size: 0.875rem;
        }
        
        .footer a {
            color: var(--primary-color);
            text-decoration: none;
        }
        
        .footer a:hover {
            text-decoration: underline;
        }
        
        /* Responsive */
        @media (max-width: 1024px) {
            .sidebar {
                transform: translateX(-100%);
            }
            
            .main-content {
                margin-left: 0;
            }
            
            .charts-section {
                grid-template-columns: 1fr;
            }
        }
        
        @media (max-width: 768px) {
            .stats-grid {
                grid-template-columns: 1fr;
            }
            
            .header-info {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="app-container">
        <!-- Sidebar -->
        <aside class="sidebar">
            <div class="sidebar-header">
                <div class="sidebar-logo">
                    <i class="fas fa-robot"></i>
                    <div>
                        <div class="sidebar-title">CS Framework</div>
                        <div class="sidebar-subtitle">Test Automation Report</div>
                    </div>
                </div>
            </div>
            
            <nav class="sidebar-nav">
                <div class="nav-section">
                    <div class="nav-section-title">Overview</div>
                    <div class="nav-item active" onclick="scrollToSection('overview')">
                        <i class="fas fa-chart-pie"></i>
                        <span>Dashboard</span>
                    </div>
                    <div class="nav-item" onclick="scrollToSection('stats')">
                        <i class="fas fa-chart-bar"></i>
                        <span>Statistics</span>
                    </div>
                </div>
                
                <div class="nav-section">
                    <div class="nav-section-title">Results</div>
                    <div class="nav-item" onclick="scrollToSection('scenarios')">
                        <i class="fas fa-list-check"></i>
                        <span>Scenarios</span>
                    </div>
                    <div class="nav-item" onclick="filterScenarios('failed')">
                        <i class="fas fa-times-circle"></i>
                        <span>Failed (${summary.failedScenarios})</span>
                    </div>
                    <div class="nav-item" onclick="filterScenarios('passed')">
                        <i class="fas fa-check-circle"></i>
                        <span>Passed (${summary.passedScenarios})</span>
                    </div>
                </div>
                
                <div class="nav-section">
                    <div class="nav-section-title">Artifacts</div>
                    <div class="nav-item">
                        <i class="fas fa-camera"></i>
                        <span>Screenshots</span>
                    </div>
                    <div class="nav-item">
                        <i class="fas fa-video"></i>
                        <span>Videos</span>
                    </div>
                    <div class="nav-item">
                        <i class="fas fa-route"></i>
                        <span>Traces</span>
                    </div>
                </div>
            </nav>
        </aside>
        
        <!-- Main Content -->
        <main class="main-content">
            <!-- Header -->
            <div class="header" id="overview">
                <div class="header-top">
                    <h1 class="header-title">${summary.project} Test Results</h1>
                    <div class="header-badge">
                        <i class="fas fa-circle-check"></i>
                        ${summary.passRate.toFixed(1)}% Pass Rate
                    </div>
                </div>
                
                <div class="header-info">
                    <div class="header-info-item">
                        <i class="fas fa-calendar"></i>
                        <span>${timestamp}</span>
                    </div>
                    <div class="header-info-item">
                        <i class="fas fa-clock"></i>
                        <span>Duration: ${executionTime}</span>
                    </div>
                    <div class="header-info-item">
                        <i class="fas fa-layer-group"></i>
                        <span>${summary.totalScenarios} Scenarios</span>
                    </div>
                    <div class="header-info-item">
                        <i class="fas fa-microchip"></i>
                        <span>Playwright ${this.getPlaywrightVersion()}</span>
                    </div>
                </div>
            </div>
            
            <!-- Stats Grid -->
            <div class="stats-grid" id="stats">
                <div class="stat-card total">
                    <div class="stat-card-header">
                        <div class="stat-card-title">Total Scenarios</div>
                        <div class="stat-card-icon">
                            <i class="fas fa-list"></i>
                        </div>
                    </div>
                    <div class="stat-card-value">${summary.totalScenarios}</div>
                    <div class="stat-card-percentage">100% of test suite</div>
                </div>
                
                <div class="stat-card passed">
                    <div class="stat-card-header">
                        <div class="stat-card-title">Passed</div>
                        <div class="stat-card-icon">
                            <i class="fas fa-check"></i>
                        </div>
                    </div>
                    <div class="stat-card-value">${summary.passedScenarios}</div>
                    <div class="stat-card-percentage">${((summary.passedScenarios / summary.totalScenarios) * 100).toFixed(1)}% of total</div>
                </div>
                
                <div class="stat-card failed">
                    <div class="stat-card-header">
                        <div class="stat-card-title">Failed</div>
                        <div class="stat-card-icon">
                            <i class="fas fa-times"></i>
                        </div>
                    </div>
                    <div class="stat-card-value">${summary.failedScenarios}</div>
                    <div class="stat-card-percentage">${((summary.failedScenarios / summary.totalScenarios) * 100).toFixed(1)}% of total</div>
                </div>
                
                <div class="stat-card skipped">
                    <div class="stat-card-header">
                        <div class="stat-card-title">Skipped</div>
                        <div class="stat-card-icon">
                            <i class="fas fa-forward"></i>
                        </div>
                    </div>
                    <div class="stat-card-value">${summary.skippedScenarios}</div>
                    <div class="stat-card-percentage">${((summary.skippedScenarios / summary.totalScenarios) * 100).toFixed(1)}% of total</div>
                </div>
            </div>
            
            <!-- Charts Section -->
            <div class="charts-section">
                <div class="chart-card">
                    <h3 class="chart-title">Test Results Distribution</h3>
                    <div class="pie-chart-container">
                        <svg class="pie-chart" viewBox="0 0 100 100">
                            ${this.generatePieChart(summary)}
                        </svg>
                        <div class="pie-chart-center">
                            <div class="pie-chart-percentage">${summary.passRate.toFixed(0)}%</div>
                            <div class="pie-chart-label">Pass Rate</div>
                        </div>
                    </div>
                    <div class="legend">
                        <div class="legend-item">
                            <div class="legend-color" style="background: var(--success-color)"></div>
                            <span>Passed</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="background: var(--danger-color)"></div>
                            <span>Failed</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="background: var(--warning-color)"></div>
                            <span>Skipped</span>
                        </div>
                    </div>
                </div>
                
                <div class="chart-card">
                    <h3 class="chart-title">Execution Timeline</h3>
                    ${this.generateTimeline(summary)}
                </div>
            </div>
            
            <!-- Scenarios Section -->
            <div class="scenarios-section" id="scenarios">
                <div class="section-header">
                    <h2 class="section-title">Test Scenarios</h2>
                    <div class="filter-buttons">
                        <button class="filter-btn active" onclick="filterScenarios('all')">All</button>
                        <button class="filter-btn" onclick="filterScenarios('passed')">Passed</button>
                        <button class="filter-btn" onclick="filterScenarios('failed')">Failed</button>
                        <button class="filter-btn" onclick="filterScenarios('skipped')">Skipped</button>
                    </div>
                </div>
                
                <div class="scenarios-list">
                    ${summary.scenarios.map((scenario, index) => this.generateScenarioCard(scenario, index)).join('')}
                </div>
            </div>
            
            <!-- Footer -->
            <footer class="footer">
                <p>Generated by <a href="https://github.com/codeautomation/cs-framework" target="_blank">CS Test Automation Framework</a> v3.0.0</p>
                <p>© 2024 CS Framework. All rights reserved.</p>
            </footer>
        </main>
    </div>
    
    <script>
        // Toggle scenario details
        function toggleScenario(index) {
            const card = document.getElementById('scenario-' + index);
            card.classList.toggle('expanded');
        }
        
        // Filter scenarios
        function filterScenarios(status) {
            const buttons = document.querySelectorAll('.filter-btn');
            buttons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            
            const cards = document.querySelectorAll('.scenario-card');
            cards.forEach(card => {
                if (status === 'all' || card.classList.contains(status)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        }
        
        // Scroll to section
        function scrollToSection(sectionId) {
            const section = document.getElementById(sectionId);
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // Update active nav item
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => item.classList.remove('active'));
            event.target.closest('.nav-item').classList.add('active');
        }
        
        // Initialize tooltips
        document.addEventListener('DOMContentLoaded', function() {
            // Add any initialization code here
        });
    </script>
</body>
</html>`;
    }
    
    private static generateScenarioCard(scenario: ScenarioResult, index: number): string {
        const statusIcon = scenario.status === 'passed' ? 'check' : scenario.status === 'failed' ? 'times' : 'forward';
        const duration = this.formatDuration(scenario.duration);
        
        return `
        <div class="scenario-card ${scenario.status}" id="scenario-${index}">
            <div class="scenario-header" onclick="toggleScenario(${index})">
                <div class="scenario-header-top">
                    <div class="scenario-name">
                        <i class="fas fa-chevron-right"></i>
                        ${scenario.name}
                    </div>
                    <div class="scenario-status ${scenario.status}">
                        <i class="fas fa-${statusIcon}"></i>
                        ${scenario.status}
                    </div>
                </div>
                <div class="scenario-meta">
                    <div class="scenario-meta-item">
                        <i class="fas fa-folder"></i>
                        ${scenario.feature}
                    </div>
                    <div class="scenario-meta-item">
                        <i class="fas fa-clock"></i>
                        ${duration}
                    </div>
                    <div class="scenario-meta-item">
                        <i class="fas fa-shoe-prints"></i>
                        ${scenario.steps.length} steps
                    </div>
                </div>
            </div>
            
            <div class="scenario-details">
                <div class="steps-list">
                    ${scenario.steps.map(step => this.generateStepItem(step)).join('')}
                </div>
                
                ${scenario.error ? `
                <div class="error-message">
                    <div class="error-title">
                        <i class="fas fa-exclamation-triangle"></i>
                        Error Details
                    </div>
                    <div class="error-content">${this.escapeHtml(scenario.error)}</div>
                </div>
                ` : ''}
                
                ${(scenario.screenshots?.length || scenario.video) ? `
                <div class="artifacts">
                    ${scenario.screenshots?.map(screenshot => `
                        <a href="${screenshot}" class="artifact-btn" target="_blank">
                            <i class="fas fa-camera"></i>
                            Screenshot
                        </a>
                    `).join('') || ''}
                    ${scenario.video ? `
                        <a href="${scenario.video}" class="artifact-btn" target="_blank">
                            <i class="fas fa-video"></i>
                            Video
                        </a>
                    ` : ''}
                </div>
                ` : ''}
            </div>
        </div>`;
    }
    
    private static generateStepItem(step: any): string {
        const icon = step.status === 'passed' ? '✓' : step.status === 'failed' ? '✗' : '→';
        const duration = step.duration ? `${step.duration}ms` : '';
        
        return `
        <div class="step-item ${step.status}">
            <div class="step-icon">${icon}</div>
            <div class="step-name">${step.name}</div>
            <div class="step-duration">${duration}</div>
        </div>`;
    }
    
    private static generatePieChart(summary: TestRunSummary): string {
        const total = summary.totalScenarios;
        const passed = (summary.passedScenarios / total) * 100;
        const failed = (summary.failedScenarios / total) * 100;
        const skipped = (summary.skippedScenarios / total) * 100;
        
        let cumulativePercentage = 0;
        const segments = [];
        
        // Passed segment
        if (passed > 0) {
            segments.push(this.createPieSegment(passed, cumulativePercentage, 'var(--success-color)'));
            cumulativePercentage += passed;
        }
        
        // Failed segment
        if (failed > 0) {
            segments.push(this.createPieSegment(failed, cumulativePercentage, 'var(--danger-color)'));
            cumulativePercentage += failed;
        }
        
        // Skipped segment
        if (skipped > 0) {
            segments.push(this.createPieSegment(skipped, cumulativePercentage, 'var(--warning-color)'));
        }
        
        return segments.join('');
    }
    
    private static createPieSegment(percentage: number, offset: number, color: string): string {
        const circumference = 2 * Math.PI * 30; // radius = 30
        const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
        const strokeDashoffset = -(offset / 100) * circumference;
        
        return `
        <circle
            cx="50"
            cy="50"
            r="30"
            fill="none"
            stroke="${color}"
            stroke-width="15"
            stroke-dasharray="${strokeDasharray}"
            stroke-dashoffset="${strokeDashoffset}"
        />`;
    }
    
    private static generateTimeline(summary: TestRunSummary): string {
        // Simple timeline visualization
        return `
        <div style="padding: 1rem;">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                <i class="fas fa-play-circle" style="color: var(--success-color);"></i>
                <div style="flex: 1; height: 4px; background: linear-gradient(to right, var(--success-color), var(--primary-color)); border-radius: 2px;"></div>
                <i class="fas fa-stop-circle" style="color: var(--primary-color);"></i>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.875rem; color: var(--text-secondary);">
                <span>Start: ${summary.timestamp.toLocaleTimeString()}</span>
                <span>Duration: ${this.formatDuration(summary.duration)}</span>
                <span>End: ${new Date(summary.timestamp.getTime() + summary.duration).toLocaleTimeString()}</span>
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
    
    private static escapeHtml(text: string): string {
        const map: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
    
    private static getPlaywrightVersion(): string {
        try {
            const packageJson = require('@playwright/test/package.json');
            return packageJson.version || '1.40.0';
        } catch {
            return '1.40.0';
        }
    }
}