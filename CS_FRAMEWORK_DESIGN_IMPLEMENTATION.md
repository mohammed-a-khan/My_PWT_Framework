# CS Test Automation Framework - Design & Implementation Document

## Document Purpose
This document serves as the authoritative technical reference for the CS Test Automation Framework implementation. It captures all design decisions, configurations, and implementation details discussed to ensure consistency and prevent context loss.

## Core Design Principles

### 1. ZERO HARDCODING PHILOSOPHY
**ABSOLUTE RULE**: Everything must be configurable through environment files. No hardcoded values anywhere in the codebase.

#### Implementation Requirements:
- All values read from configuration files
- Configuration hierarchy: CLI args → Env vars → Project config → Global config
- Support for variable interpolation: `{project}`, `{environment}`, `{timestamp}`
- Encrypted values using `ENCRYPTED:` prefix
- Semicolon-separated lists for multiple values

### 2. LIGHTNING-FAST STARTUP (<1 second)
**REQUIREMENT**: Framework must start in under 1 second

#### Implementation Strategy:
```
1. Minimal core loading (50ms) - Only CSConfigurationManager
2. Configuration reading (100ms) - Cached config files
3. Execution scope determination (20ms) - Features/project/env
4. Selective module loading (200ms) - ONLY required modules
5. Parallel initialization (300ms) - Browser, steps, reports
Total: <1 second
```

#### Key Optimizations:
- `SELECTIVE_STEP_LOADING=true` - Load only needed step definitions
- `TS_NODE_TRANSPILE_ONLY=true` - Skip type checking at runtime
- `LAZY_MODULE_LOADING=true` - Defer non-critical modules
- `CACHE_COMPILED_TS=true` - Cache compiled TypeScript

## Configuration System Design

### Configuration File Structure
```
config/
├── global.env                           # Base defaults
├── common/
│   ├── common.env                      # Common project settings
│   └── environments/
│       ├── dev.env
│       ├── staging.env
│       └── prod.env
└── {project}/                          # e.g., akhan
    ├── common/
    │   └── common.env                  # Project-specific settings
    └── environments/
        ├── dev.env
        ├── staging.env
        └── prod.env
```

### Configuration Loading Order (Priority)
1. Command line arguments (highest)
2. Environment variables
3. `config/{project}/environments/{environment}.env`
4. `config/{project}/common/common.env`
5. `config/common/environments/{environment}.env`
6. `config/common/common.env`
7. `config/global.env` (lowest)

### Step Definition Loading
```properties
# Configuration
STEP_DEFINITIONS_PATH=test/common/steps;test/{project}/steps;test/shared/api-steps.ts

# Implementation
1. Parse STEP_DEFINITIONS_PATH (semicolon-separated)
2. For each path:
   - If directory: load all .ts files
   - If file: load specific file
3. Match steps to features being executed
4. Skip unneeded step files
```

### Data-Driven Scenario Expansion
```properties
# Configuration
DATA_PROVIDER_ENABLED=true
DATA_PROVIDER_SOURCES=excel;csv;json;api;database

# Implementation
1. Read data source (Excel/CSV/JSON/API/DB)
2. For each data row:
   - Create scenario instance
   - Inject data values
3. Execute all instances
4. Report individually
```

## Browser Management Implementation

### Browser Instance Strategies

#### Strategy: `new-per-scenario`
```javascript
// Implementation
beforeScenario() {
  browser = await playwright.chromium.launch(config);
  context = await browser.newContext(contextConfig);
  page = await context.newPage();
}

afterScenario() {
  await page.close();
  await context.close();
  await browser.close();
}
```

#### Strategy: `reuse-across-scenarios`
```javascript
// Implementation
beforeSuite() {
  browser = await playwright.chromium.launch(config);
}

beforeScenario() {
  context = await browser.newContext(contextConfig);
  page = await context.newPage();
}

afterScenario() {
  await page.close();
  await context.close();
}

afterSuite() {
  await browser.close();
}
```

### Browser Switching Implementation
```javascript
async switchBrowser(fromBrowser: string, toBrowser: string) {
  // 1. Save current state if configured
  if (config.BROWSER_SWITCH_MAINTAIN_STATE) {
    state = await saveState(currentPage);
  }
  
  // 2. Close current browser
  await currentBrowser.close();
  
  // 3. Launch new browser
  newBrowser = await playwright[toBrowser].launch(config);
  newContext = await newBrowser.newContext(contextConfig);
  newPage = await newContext.newPage();
  
  // 4. Restore state if configured
  if (config.BROWSER_SWITCH_MAINTAIN_STATE) {
    await restoreState(newPage, state);
  }
  
  // 5. Update references
  currentBrowser = newBrowser;
  currentPage = newPage;
}
```

### Browser Pool Implementation
```javascript
class BrowserPool {
  private pool: Browser[] = [];
  private inUse: Set<Browser> = new Set();
  
  async initialize() {
    const poolSize = config.BROWSER_POOL_SIZE;
    for (let i = 0; i < poolSize; i++) {
      const browser = await playwright.chromium.launch(config);
      this.pool.push(browser);
    }
  }
  
  async acquire(): Promise<Browser> {
    // Strategy: round-robin, lru, or random
    const strategy = config.BROWSER_POOL_REUSE_STRATEGY;
    let browser = this.selectBrowser(strategy);
    this.inUse.add(browser);
    return browser;
  }
  
  async release(browser: Browser) {
    this.inUse.delete(browser);
    // Health check if enabled
    if (config.BROWSER_HEALTH_CHECK_ENABLED) {
      await this.healthCheck(browser);
    }
  }
}
```

## IE Mode Support (Workaround Implementation)

### IMPORTANT: Playwright does NOT support IE mode natively

#### Hybrid Approach Implementation
```javascript
class HybridBrowserManager {
  private playwrightBrowser: Browser;
  private seleniumDriver: WebDriver;
  
  async execute(url: string) {
    // Check if URL needs IE mode
    const needsIEMode = this.checkIEModeRequired(url);
    
    if (needsIEMode && config.SELENIUM_EDGE_IE_MODE) {
      // Use Selenium for IE mode
      await this.executeWithSelenium(url);
    } else {
      // Use Playwright for modern sites
      await this.executeWithPlaywright(url);
    }
  }
  
  private checkIEModeRequired(url: string): boolean {
    const ieModeList = config.IE_MODE_SITES_LIST?.split(';') || [];
    return ieModeList.some(pattern => url.match(pattern));
  }
  
  private async executeWithSelenium(url: string) {
    // Use Selenium WebDriver with IEDriver 4.0+
    const options = new edge.Options();
    options.setEdgeChromium(true);
    options.addArguments('--ie-mode-test');
    
    this.seleniumDriver = await new Builder()
      .forBrowser('MicrosoftEdge')
      .setEdgeOptions(options)
      .usingServer(config.SELENIUM_IE_DRIVER_PATH)
      .build();
  }
}
```

## Azure DevOps Integration with Proxy

### Proxy Configuration Implementation
```javascript
class CSADOClient {
  private proxyAgent: HttpsProxyAgent | SocksProxyAgent;
  
  configure(options: ADOConfig) {
    // Setup proxy if enabled
    if (options.proxy?.enabled) {
      this.setupProxy(options.proxy);
    }
  }
  
  private setupProxy(proxyConfig: ProxyConfig) {
    const { protocol, host, port, auth } = proxyConfig;
    
    // Build proxy URL
    let proxyUrl = `${protocol}://`;
    if (auth?.required) {
      const username = auth.username;
      const password = CSConfigurationManager.decrypt(auth.password);
      proxyUrl += `${username}:${password}@`;
    }
    proxyUrl += `${host}:${port}`;
    
    // Create appropriate agent
    if (protocol === 'socks5') {
      this.proxyAgent = new SocksProxyAgent(proxyUrl);
    } else {
      this.proxyAgent = new HttpsProxyAgent(proxyUrl);
    }
  }
  
  async makeRequest(options: RequestOptions) {
    // Check if URL should bypass proxy
    if (this.shouldBypassProxy(options.url)) {
      return this.directRequest(options);
    }
    
    // Use proxy for request
    const requestConfig = {
      ...options,
      agent: this.proxyAgent,
      timeout: config.ADO_API_TIMEOUT,
      retry: {
        count: config.ADO_API_RETRY_COUNT,
        delay: config.ADO_API_RETRY_DELAY
      }
    };
    
    return axios(requestConfig);
  }
  
  private shouldBypassProxy(url: string): boolean {
    const bypassList = config.ADO_PROXY_BYPASS_LIST?.split(';') || [];
    return bypassList.some(pattern => url.includes(pattern));
  }
}
```

## Element Management Implementation

### CSWebElement with Self-Healing
```javascript
class CSWebElement {
  private locators: LocatorStrategy[];
  
  async click() {
    let element = null;
    let usedLocator = null;
    
    // Try primary locator
    try {
      element = await this.findByPrimary();
      usedLocator = this.locators[0];
    } catch (e) {
      // Self-healing: try alternatives
      if (config.SELF_HEALING_ENABLED) {
        for (let i = 1; i < this.locators.length; i++) {
          try {
            element = await this.findByLocator(this.locators[i]);
            usedLocator = this.locators[i];
            CSReporter.warn(`Self-healed using: ${usedLocator}`);
            break;
          } catch (e) {
            continue;
          }
        }
      }
      
      // AI-based healing
      if (!element && config.AI_ENABLED) {
        element = await this.findByAI();
      }
    }
    
    if (!element) {
      throw new Error(`Element not found: ${this.description}`);
    }
    
    // Perform click with waits
    await this.waitForConditions(element);
    await element.click();
    CSReporter.pass(`Clicked: ${this.description}`);
  }
}
```

### Dynamic Element Creation
```javascript
// No decorator - runtime creation
const button = new CSWebElement({
  css: `#button-${dynamicId}`,
  description: `Dynamic button ${dynamicId}`,
  waitForVisible: true,
  timeout: 5000
});

await button.click();
```

## Reporting System Implementation

### Custom Reporter (No Third-Party Libraries)
```javascript
class CSReporter {
  private results: TestResult[] = [];
  
  static info(message: string) {
    this.log('INFO', message);
    this.capture();
  }
  
  static pass(message: string) {
    this.log('PASS', message);
    this.capture();
  }
  
  static fail(message: string, error?: Error) {
    this.log('FAIL', message, error);
    this.capture(true); // Force screenshot
  }
  
  private static async capture(force: boolean = false) {
    if (config.BROWSER_SCREENSHOT === 'on' || 
        (config.BROWSER_SCREENSHOT === 'only-on-failure' && force)) {
      const screenshot = await page.screenshot();
      this.attachScreenshot(screenshot);
    }
  }
  
  async generateReports() {
    const formats = config.REPORT_FORMATS.split(';');
    
    for (const format of formats) {
      switch(format) {
        case 'html':
          await this.generateHTML();
          break;
        case 'json':
          await this.generateJSON();
          break;
        case 'junit':
          await this.generateJUnit();
          break;
      }
    }
  }
}
```

## Performance Optimization Checklist

### Mandatory Optimizations
- [ ] `TS_NODE_TRANSPILE_ONLY=true` in all npm scripts
- [ ] `SELECTIVE_STEP_LOADING=true` in global.env
- [ ] `LAZY_MODULE_LOADING=true` in global.env
- [ ] `CACHE_COMPILED_TS=true` in global.env
- [ ] `PARALLEL_INITIALIZATION=true` in global.env

### Browser Optimizations
- [ ] Use `BROWSER_INSTANCE_STRATEGY=reuse-across-scenarios` for speed
- [ ] Enable `BROWSER_POOL_ENABLED=true` for parallel execution
- [ ] Set appropriate `BROWSER_POOL_SIZE` based on system resources
- [ ] Configure `BROWSER_HEALTH_CHECK_ENABLED=true` for stability

## Implementation Rules

### 1. Configuration Rules
- **NEVER** hardcode any value
- **ALWAYS** read from CSConfigurationManager
- **USE** semicolon (;) as separator for lists
- **ENCRYPT** sensitive data with ENCRYPTED: prefix
- **SUPPORT** variable interpolation ({project}, {environment})

### 2. Browser Management Rules
- **SUPPORT** all browser switching scenarios
- **MAINTAIN** state when configured
- **HANDLE** crashes gracefully with auto-restart
- **USE** browser pool for parallel execution
- **CLEAN** resources properly

### 3. Error Handling Rules
- **REPORT** all actions to CSReporter
- **CAPTURE** screenshots on failure
- **RETRY** with self-healing when enabled
- **LOG** with appropriate levels
- **FAIL** gracefully with clear messages

### 4. Performance Rules
- **START** framework in <1 second
- **LOAD** only required modules
- **CACHE** compiled TypeScript
- **PARALLELIZE** initialization
- **REUSE** browser instances when appropriate

## Module Dependencies

### Core Dependencies
```json
{
  "@playwright/test": "^1.55.0",
  "typescript": "^5.0.0",
  "ts-node": "^10.9.0",
  "dotenv": "^16.0.0",
  "glob": "^10.0.0"
}
```

### Optional Dependencies (for specific features)
```json
{
  "selenium-webdriver": "^4.0.0",  // For IE mode support
  "edge-driver": "^4.0.0",         // For IE mode support
  "https-proxy-agent": "^5.0.0",   // For proxy support
  "socks-proxy-agent": "^7.0.0",   // For SOCKS proxy
  "xlsx": "^0.18.0",               // For Excel data provider
  "csv-parse": "^5.0.0"            // For CSV data provider
}
```

## AI & Self-Healing Implementation

### Visual Recognition System
```javascript
class CSVisualAI {
  private aiModel: TensorFlowModel;
  
  async findByVisualDescription(description: string) {
    // Parse natural language description
    const criteria = this.parseDescription(description);
    // "blue submit button at bottom"
    
    // Take screenshot for analysis
    const screenshot = await page.screenshot();
    
    // Use TensorFlow.js for element detection
    const elements = await this.detectElements(screenshot);
    
    // Match based on criteria
    const matches = elements.filter(el => {
      return el.color === criteria.color &&
             el.text.includes(criteria.text) &&
             el.position === criteria.position;
    });
    
    return this.getBestMatch(matches);
  }
  
  async generateTestSuggestions(page: Page) {
    const elements = await this.analyzePageElements(page);
    const suggestions = [];
    
    // Analyze for security issues
    if (this.hasInputField(elements, 'username')) {
      suggestions.push({
        type: 'security',
        test: 'SQL injection in username',
        gherkin: 'When I enter "admin\' OR 1=1--" in username'
      });
    }
    
    return suggestions;
  }
}
```

### Smart Test Generation
```javascript
class CSTestGenerator {
  async generateFromAnalysis(url: string) {
    const page = await browser.newPage();
    await page.goto(url);
    
    // Analyze page structure
    const forms = await page.$$('form');
    const inputs = await page.$$('input, select, textarea');
    
    const tests = [];
    
    // Generate validation tests
    for (const input of inputs) {
      const type = await input.getAttribute('type');
      const maxLength = await input.getAttribute('maxlength');
      
      if (maxLength) {
        tests.push(this.generateMaxLengthTest(input, maxLength));
      }
      
      if (type === 'email') {
        tests.push(this.generateEmailValidationTest(input));
      }
    }
    
    return tests;
  }
}
```

## Real-Time Dashboard Implementation

### WebSocket Architecture
```javascript
class CSLiveDashboard {
  private ws: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  
  async initialize() {
    this.ws = new WebSocketServer({ 
      port: config.DASHBOARD_WS_PORT || 8080 
    });
    
    this.ws.on('connection', (socket) => {
      this.clients.add(socket);
      this.sendInitialState(socket);
      
      socket.on('close', () => {
        this.clients.delete(socket);
      });
    });
  }
  
  broadcastUpdate(update: TestUpdate) {
    const message = JSON.stringify({
      type: 'test-update',
      timestamp: Date.now(),
      data: {
        testId: update.testId,
        status: update.status,
        progress: update.progress,
        logs: update.logs
      }
    });
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
  
  async streamTestProgress(scenario: Scenario) {
    const updates = [];
    let progress = 0;
    
    scenario.on('step:start', (step) => {
      progress += (100 / scenario.steps.length);
      this.broadcastUpdate({
        testId: scenario.id,
        status: 'running',
        progress: Math.round(progress),
        currentStep: step.text
      });
    });
  }
}
```

### Dashboard UI
```html
<!-- Real-time dashboard HTML -->
<div id="dashboard">
  <div class="stats-grid">
    <div class="stat-card passed">✓ <span id="passed">0</span></div>
    <div class="stat-card running">⚡ <span id="running">0</span></div>
    <div class="stat-card failed">✗ <span id="failed">0</span></div>
    <div class="stat-card pending">⏸ <span id="pending">0</span></div>
  </div>
  
  <div class="test-grid" id="test-grid">
    <!-- Dynamically populated test cards with progress bars -->
  </div>
</div>

<script>
const ws = new WebSocket(`ws://localhost:${config.DASHBOARD_WS_PORT}`);

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  updateDashboard(update);
  
  // Update progress bar
  const testCard = document.getElementById(`test-${update.data.testId}`);
  const progressBar = testCard.querySelector('.progress-bar');
  progressBar.style.width = `${update.data.progress}%`;
};
</script>
```

## Evidence Collection System

### Comprehensive Evidence Capture
```javascript
class CSEvidenceCollector {
  private evidence: Map<string, Evidence> = new Map();
  
  async collectOnFailure(scenario: Scenario, error: Error) {
    const evidenceId = `${scenario.id}_${Date.now()}`;
    
    const evidence: Evidence = {
      screenshot: await this.captureScreenshot(),
      video: await this.captureVideo(),
      har: await this.captureHAR(),
      console: await this.captureConsole(),
      network: await this.captureNetwork(),
      stackTrace: error.stack,
      timestamp: new Date().toISOString()
    };
    
    this.evidence.set(evidenceId, evidence);
    
    // Auto-save evidence
    if (config.AUTO_SAVE_EVIDENCE) {
      await this.saveEvidence(evidenceId);
    }
    
    return evidenceId;
  }
  
  private async captureVideo() {
    // Use playwright video recording
    const videoPath = await page.video()?.path();
    
    // Trim to last 10 seconds if configured
    if (config.VIDEO_TRIM_ON_FAILURE) {
      return await this.trimVideo(videoPath, 10);
    }
    
    return videoPath;
  }
  
  private async captureHAR() {
    // Capture HAR file for network analysis
    const har = await page.context().har();
    return har;
  }
  
  private async captureConsole() {
    // Collect console logs
    const logs = [];
    page.on('console', msg => {
      logs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now()
      });
    });
    return logs;
  }
  
  async packageEvidence(evidenceIds: string[]): Promise<Buffer> {
    const zip = new JSZip();
    
    for (const id of evidenceIds) {
      const evidence = this.evidence.get(id);
      
      zip.file(`${id}/screenshot.png`, evidence.screenshot);
      zip.file(`${id}/video.mp4`, evidence.video);
      zip.file(`${id}/network.har`, JSON.stringify(evidence.har));
      zip.file(`${id}/console.log`, evidence.console.join('\n'));
      zip.file(`${id}/stacktrace.txt`, evidence.stackTrace);
    }
    
    return await zip.generateAsync({ type: 'nodebuffer' });
  }
}
```

## Data Masking Implementation

### Sensitive Data Protection
```javascript
class CSDataMasker {
  private patterns = {
    creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    apiKey: /\b[A-Za-z0-9]{32,}\b/g
  };
  
  mask(text: string, type?: string): string {
    if (type) {
      return this.maskByType(text, type);
    }
    
    // Auto-detect and mask
    let masked = text;
    
    // Credit cards
    masked = masked.replace(this.patterns.creditCard, (match) => {
      return match.slice(0, -4).replace(/\d/g, '*') + match.slice(-4);
    });
    
    // SSN
    masked = masked.replace(this.patterns.ssn, (match) => {
      return '***-**-' + match.slice(-4);
    });
    
    // Email
    masked = masked.replace(this.patterns.email, (match) => {
      const [name, domain] = match.split('@');
      return name[0] + '***@' + domain;
    });
    
    return masked;
  }
  
  async maskScreenshot(imagePath: string): Promise<Buffer> {
    // Use sharp or jimp to blur sensitive areas
    const image = await sharp(imagePath);
    const metadata = await image.metadata();
    
    // Find sensitive fields by selector
    const sensitiveElements = await page.$$('[type="password"], [data-sensitive="true"]');
    
    for (const element of sensitiveElements) {
      const box = await element.boundingBox();
      if (box) {
        // Blur the area
        await image.blur(box);
      }
    }
    
    return await image.toBuffer();
  }
}
```

## Auto Bug Creation Implementation

### Azure DevOps Bug Creation
```javascript
class CSBugCreator {
  async createBugFromFailure(failure: TestFailure) {
    const bug = {
      title: `[Auto] ${failure.scenario.name} failed`,
      description: this.generateBugDescription(failure),
      severity: this.calculateSeverity(failure),
      priority: this.calculatePriority(failure),
      assignedTo: this.getAssignee(failure),
      attachments: await this.prepareAttachments(failure),
      reproSteps: this.generateReproSteps(failure),
      systemInfo: this.collectSystemInfo()
    };
    
    // Create bug via ADO API
    const response = await this.adoClient.createWorkItem({
      type: 'Bug',
      project: config.ADO_PROJECT,
      fields: {
        'System.Title': bug.title,
        'System.Description': bug.description,
        'Microsoft.VSTS.Common.Severity': bug.severity,
        'Microsoft.VSTS.Common.Priority': bug.priority,
        'System.AssignedTo': bug.assignedTo,
        'Microsoft.VSTS.TCM.ReproSteps': bug.reproSteps
      }
    });
    
    // Upload attachments
    for (const attachment of bug.attachments) {
      await this.adoClient.uploadAttachment(response.id, attachment);
    }
    
    return response.id;
  }
  
  private calculateSeverity(failure: TestFailure): string {
    if (failure.tags.includes('@critical')) return '1 - Critical';
    if (failure.tags.includes('@high')) return '2 - High';
    if (failure.tags.includes('@medium')) return '3 - Medium';
    return '4 - Low';
  }
  
  private getAssignee(failure: TestFailure): string {
    // Smart assignment based on failure area
    const featurePath = failure.feature.path;
    
    if (featurePath.includes('frontend')) {
      return config.FRONTEND_TEAM_LEAD;
    } else if (featurePath.includes('api')) {
      return config.API_TEAM_LEAD;
    } else if (featurePath.includes('database')) {
      return config.DB_TEAM_LEAD;
    }
    
    return config.DEFAULT_BUG_ASSIGNEE;
  }
}
```

## Token Auto-Refresh Implementation

### Token Lifecycle Management
```javascript
class CSTokenManager {
  private tokens: Map<string, Token> = new Map();
  private refreshTimers: Map<string, NodeJS.Timer> = new Map();
  
  async getToken(service: string): Promise<string> {
    const token = this.tokens.get(service);
    
    if (!token || this.isExpired(token)) {
      return await this.refreshToken(service);
    }
    
    return token.value;
  }
  
  private async refreshToken(service: string): Promise<string> {
    const newToken = await this.fetchNewToken(service);
    
    this.tokens.set(service, {
      value: newToken.access_token,
      expiresAt: Date.now() + (newToken.expires_in * 1000),
      refreshToken: newToken.refresh_token
    });
    
    // Schedule auto-refresh before expiry
    this.scheduleRefresh(service, newToken.expires_in * 0.9);
    
    return newToken.access_token;
  }
  
  private scheduleRefresh(service: string, delaySeconds: number) {
    // Clear existing timer
    const existingTimer = this.refreshTimers.get(service);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Schedule new refresh
    const timer = setTimeout(async () => {
      await this.refreshToken(service);
    }, delaySeconds * 1000);
    
    this.refreshTimers.set(service, timer);
  }
}
```

## Database Transaction Management

### Transaction Rollback System
```javascript
class CSTransactionManager {
  private transactions: Map<string, Transaction> = new Map();
  
  async beginTransaction(testId: string) {
    const connection = await this.getConnection();
    const transaction = await connection.beginTransaction();
    
    this.transactions.set(testId, {
      connection,
      transaction,
      savepoint: await this.createSavepoint(transaction)
    });
  }
  
  async executeInTransaction(testId: string, operation: Function) {
    const tx = this.transactions.get(testId);
    
    try {
      const result = await operation(tx.connection);
      
      // Don't commit if auto-rollback is enabled
      if (!config.DB_AUTO_ROLLBACK) {
        await tx.transaction.commit();
      }
      
      return result;
    } catch (error) {
      await tx.transaction.rollback();
      throw error;
    }
  }
  
  async rollbackAll(testId: string) {
    const tx = this.transactions.get(testId);
    
    if (tx) {
      await tx.transaction.rollbackTo(tx.savepoint);
      await tx.connection.close();
      this.transactions.delete(testId);
    }
  }
}
```

## Multi-Database Support Implementation

### Database Abstraction Layer
```javascript
class CSDatabaseAdapter {
  private adapters = {
    mysql: MySQLAdapter,
    postgresql: PostgreSQLAdapter,
    mongodb: MongoDBAdapter,
    oracle: OracleAdapter
  };
  
  async getAdapter(type: string): Promise<DatabaseAdapter> {
    const AdapterClass = this.adapters[type];
    
    if (!AdapterClass) {
      throw new Error(`Unsupported database type: ${type}`);
    }
    
    const adapter = new AdapterClass(config[`${type.toUpperCase()}_CONFIG`]);
    await adapter.connect();
    
    return adapter;
  }
}

abstract class DatabaseAdapter {
  abstract connect(): Promise<void>;
  abstract query(sql: string, params?: any[]): Promise<any>;
  abstract beginTransaction(): Promise<Transaction>;
  abstract close(): Promise<void>;
}

class MySQLAdapter extends DatabaseAdapter {
  async query(sql: string, params?: any[]) {
    // MySQL-specific implementation
    return await this.connection.execute(sql, params);
  }
}

class PostgreSQLAdapter extends DatabaseAdapter {
  async query(sql: string, params?: any[]) {
    // PostgreSQL-specific implementation
    return await this.client.query(sql, params);
  }
}
```

## Pipeline Integration Implementation

### CI/CD Orchestration
```javascript
class CSPipelineOrchestrator {
  async executePipeline(trigger: PipelineTrigger) {
    const pipeline = {
      id: generateId(),
      startTime: Date.now(),
      stages: []
    };
    
    try {
      // Stage 1: Smoke tests
      const smokeResult = await this.runStage('smoke', {
        tags: '@smoke',
        timeout: 5 * 60 * 1000,
        failFast: true
      });
      
      if (!smokeResult.passed) {
        throw new Error('Smoke tests failed');
      }
      
      // Stage 2: Deploy to staging
      await this.deployToEnvironment('staging');
      
      // Stage 3: Regression tests
      const regressionResult = await this.runStage('regression', {
        tags: '@regression',
        timeout: 30 * 60 * 1000,
        parallel: true,
        workers: 8
      });
      
      if (!regressionResult.passed) {
        await this.rollback('staging');
        throw new Error('Regression tests failed');
      }
      
      // Stage 4: Deploy to production
      await this.deployToEnvironment('production');
      
      // Stage 5: Production smoke
      const prodSmokeResult = await this.runStage('prod-smoke', {
        tags: '@smoke',
        environment: 'production',
        timeout: 2 * 60 * 1000
      });
      
      if (!prodSmokeResult.passed) {
        await this.rollback('production');
        throw new Error('Production smoke tests failed');
      }
      
      pipeline.status = 'success';
    } catch (error) {
      pipeline.status = 'failed';
      pipeline.error = error.message;
      
      // Notify team
      await this.notifyFailure(pipeline, error);
    }
    
    return pipeline;
  }
}
```

## Framework Self-Testing (Optional)

### Framework Validation Tests
These are OPTIONAL tests to validate the framework itself works correctly:
- Configuration loading validation
- Browser management verification
- Self-healing mechanism testing
- Module loading performance

Note: These are NOT part of the framework functionality. The framework is for testing OTHER applications, not itself.

## Maintenance Guidelines

### Adding New Configuration
1. Add to global.env with default value
2. Document in this guide
3. Add examples with comments
4. Update validation schema
5. Test configuration hierarchy

### Adding New Browser Feature
1. Add configuration options
2. Implement in browser manager
3. Add to browser strategies
4. Document usage examples
5. Test in parallel scenarios

### Updating Dependencies
1. Test with existing configuration
2. Verify performance metrics
3. Check browser compatibility
4. Update documentation
5. Run full regression suite

## Critical Implementation Notes

### IE Mode Limitations
- **Playwright CANNOT automate IE mode**
- **Must use Selenium WebDriver for true IE mode**
- **Hybrid approach recommended**
- **Document as workaround, not native feature**

### Proxy Considerations
- **Separate proxy settings for browser and ADO**
- **Support HTTP, HTTPS, and SOCKS5**
- **Handle authentication securely**
- **Implement bypass lists properly**

### Performance Targets
- **Startup: <1 second mandatory**
- **Browser launch: <3 seconds**
- **Step loading: <200ms**
- **Configuration loading: <100ms**

## Version Control

### Document Version
- Version: 1.0.0
- Last Updated: Current
- Purpose: Authoritative implementation reference

### Change Log
- Initial version capturing all discussed features
- Zero hardcoding philosophy
- Browser management and switching
- IE mode workarounds
- ADO proxy integration

## Conclusion

This document serves as the single source of truth for CS Test Automation Framework implementation. All development must adhere to these specifications to maintain consistency and achieve the defined performance targets.

**REMEMBER**: 
- Zero hardcoding
- Lightning-fast startup
- Everything configurable
- Self-healing and resilient
- Support all browser scenarios