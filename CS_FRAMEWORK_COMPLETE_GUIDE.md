# CS Test Automation Framework - Complete Feature Guide

## IMPORTANT: Framework Usage Guidelines

### Always Use CS Wrapper Classes - Never Direct Playwright

**❌ NEVER DO THIS (Direct Playwright):**
```typescript
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.click('#button');
```

**✅ ALWAYS DO THIS (CS Framework Wrappers):**
```typescript
import { CSBrowserManager, CSWebElement } from '@framework';
const browser = await CSBrowserManager.getInstance();
const element = new CSWebElement('#button');
await element.click(); // Includes error handling, reporting, retry, healing
```

### Why Use CS Wrappers?

Every CS wrapper method includes:
1. **Automatic CSReporter Integration** - All actions logged in HTML reports
2. **Built-in Error Handling** - Graceful failures with detailed error messages
3. **Automatic Retry Logic** - Handles transient failures
4. **Self-Healing** - Automatically finds elements when selectors change
5. **Screenshot on Failure** - Captures evidence automatically
6. **Performance Tracking** - Measures execution time
7. **Debug Information** - Detailed logs for troubleshooting

### Example: CS Wrapper vs Direct Playwright

**Direct Playwright (No reporting, No error handling):**
```typescript
await page.click('#submit'); // Fails silently, no report entry
```

**CS Wrapper (Full integration):**
```typescript
await submitButton.click();
// Automatically does:
// → CSReporter.info("Clicking on: Submit button")
// → Waits for element ready
// → Retries if needed
// → Self-heals if selector changed
// → CSReporter.pass("Successfully clicked: Submit button")
// → On failure: CSReporter.fail("Failed to click", error, screenshot)
```

## 1. COMPLETE CONFIGURATION SYSTEM - ZERO HARDCODING

### Zero Hardcoding Philosophy
**EVERYTHING** is configurable. **NOTHING** is hardcoded. Lightning-fast startup with smart lazy loading.

### 1.1 Configuration Hierarchy (Highest to Lowest Priority)
```
1. Command line arguments (override everything)
2. Environment variables (override config files)
3. config/{project}/environments/{environment}.env
4. config/{project}/common/common.env
5. config/common/environments/{environment}.env
6. config/common/common.env
7. config/global.env (base defaults)
```

### 1.2 Complete Global Configuration (config/global.env)
```properties
# Framework Core Settings
FRAMEWORK_NAME=CS Test Automation
FRAMEWORK_VERSION=3.0.0
FRAMEWORK_MODE=optimized

# Execution Defaults (when nothing specified)
DEFAULT_PROJECT=common
DEFAULT_ENVIRONMENT=dev
DEFAULT_BROWSER=chrome
DEFAULT_HEADLESS=false
DEFAULT_PARALLEL=false
DEFAULT_WORKERS=4
DEFAULT_TIMEOUT=30000
DEFAULT_RETRY_COUNT=2

# Feature Execution Defaults
DEFAULT_FEATURES=test/*/features/*.feature
DEFAULT_TAGS=not @skip and not @manual
DEFAULT_STRICT_MODE=false
DEFAULT_DRY_RUN=false
DEFAULT_FAIL_FAST=false

# Performance Optimization
LAZY_LOADING=true
SELECTIVE_STEP_LOADING=true
TRANSPILE_ONLY=true
CACHE_COMPILED_TS=true
PARALLEL_INITIALIZATION=true
PRELOAD_COMMON_MODULES=false

# Worker Memory Configuration
WORKER_HEAP_SIZE=1024  # MB per worker process (increase if workers run out of memory)

# Browser Launch Configuration with Examples

# Browser Selection
BROWSER_LIST=chrome;firefox;webkit;edge
# Example: Run tests on Chrome only
# BROWSER_LIST=chrome
# Example: Test on Chrome and Firefox
# BROWSER_LIST=chrome;firefox

# Browser Channel - Use specific browser versions
BROWSER_CHANNEL=chrome
# Example: Use Chrome Canary for latest features
# BROWSER_CHANNEL=chrome-canary
# Example: Use Microsoft Edge Beta
# BROWSER_CHANNEL=msedge-beta
# Example: Use new Chromium headless mode
# BROWSER_CHANNEL=chromium
# Example: Microsoft Edge (for enterprise apps)
# BROWSER_CHANNEL=msedge

# Custom Browser Path
BROWSER_EXECUTABLE_PATH=
# Example: Use custom Chrome installation
# BROWSER_EXECUTABLE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
# Example: Use portable browser
# BROWSER_EXECUTABLE_PATH=C:\PortableApps\GoogleChromePortable\GoogleChromePortable.exe

# Browser Launch Timeout
BROWSER_LAUNCH_TIMEOUT=30000
# Example: Increase for slow systems
# BROWSER_LAUNCH_TIMEOUT=60000
# Example: Disable timeout
# BROWSER_LAUNCH_TIMEOUT=0

# Headless Mode
BROWSER_HEADLESS=false
# Example: Run in CI/CD pipeline
# BROWSER_HEADLESS=true
# Example: Debug mode - see browser
# BROWSER_HEADLESS=false

# Browser Arguments
BROWSER_ARGS=
# Example: Disable automation detection
# BROWSER_ARGS=--disable-blink-features=AutomationControlled
# Example: Start maximized with no sandbox
# BROWSER_ARGS=--start-maximized;--no-sandbox;--disable-dev-shm-usage
# Example: Custom window size and position
# BROWSER_ARGS=--window-size=1920,1080;--window-position=0,0
# Example: Disable GPU for Docker
# BROWSER_ARGS=--disable-gpu;--disable-software-rasterizer

# Developer Tools
BROWSER_DEVTOOLS=false
# Example: Debug network requests
# BROWSER_DEVTOOLS=true
# Example: Performance profiling
# BROWSER_DEVTOOLS=true

# Slow Motion - Slow down actions for debugging
BROWSER_SLOWMO=0
# Example: Slow by 500ms for demo
# BROWSER_SLOWMO=500
# Example: Very slow for debugging
# BROWSER_SLOWMO=1000

# Chromium Sandbox
BROWSER_CHROMIUM_SANDBOX=true
# Example: Disable for Docker/Linux
# BROWSER_CHROMIUM_SANDBOX=false

# Firefox User Preferences
BROWSER_FIREFOX_USER_PREFS=
# Example: Disable Firefox notifications
# BROWSER_FIREFOX_USER_PREFS=dom.webnotifications.enabled:false;dom.push.enabled:false
# Example: Custom download behavior
# BROWSER_FIREFOX_USER_PREFS=browser.download.dir:/tmp;browser.download.folderList:2

# Ignore Default Arguments
BROWSER_IGNORE_DEFAULT_ARGS=false
# Example: Remove specific default args
# BROWSER_IGNORE_DEFAULT_ARGS=--enable-automation;--enable-blink-features
# Example: Remove all default args
# BROWSER_IGNORE_DEFAULT_ARGS=true

# Proxy Configuration
BROWSER_PROXY_SERVER=
# Example: Corporate proxy
# BROWSER_PROXY_SERVER=http://proxy.company.com:8080
# Example: SOCKS proxy
# BROWSER_PROXY_SERVER=socks5://127.0.0.1:1080

BROWSER_PROXY_BYPASS=localhost;127.0.0.1;*.local
# Example: Bypass for internal sites
# BROWSER_PROXY_BYPASS=*.company.com;192.168.*;10.*

BROWSER_PROXY_USERNAME=
BROWSER_PROXY_PASSWORD=ENCRYPTED:
# Example: Proxy with authentication
# BROWSER_PROXY_USERNAME=proxyuser
# BROWSER_PROXY_PASSWORD=ENCRYPTED:U2FsdGVkX1+x7f8d9s8f7d9f8

# Browser Context - Viewport & Display Configuration

# Viewport Dimensions
BROWSER_VIEWPORT_WIDTH=1920
BROWSER_VIEWPORT_HEIGHT=1080
# Example: Mobile viewport (iPhone 12)
# BROWSER_VIEWPORT_WIDTH=390
# BROWSER_VIEWPORT_HEIGHT=844
# Example: Tablet viewport (iPad)
# BROWSER_VIEWPORT_WIDTH=820
# BROWSER_VIEWPORT_HEIGHT=1180
# Example: Desktop 4K
# BROWSER_VIEWPORT_WIDTH=3840
# BROWSER_VIEWPORT_HEIGHT=2160

# Device Scale Factor (Pixel Ratio)
BROWSER_DEVICE_SCALE_FACTOR=1
# Example: Retina display
# BROWSER_DEVICE_SCALE_FACTOR=2
# Example: High DPI mobile
# BROWSER_DEVICE_SCALE_FACTOR=3

# Mobile Emulation
BROWSER_IS_MOBILE=false
BROWSER_HAS_TOUCH=false
# Example: Mobile device with touch
# BROWSER_IS_MOBILE=true
# BROWSER_HAS_TOUCH=true
# Example: Tablet with touch
# BROWSER_IS_MOBILE=false
# BROWSER_HAS_TOUCH=true

# Screen Size (for window.screen)
BROWSER_SCREEN_WIDTH=1920
BROWSER_SCREEN_HEIGHT=1080
# Example: MacBook Pro screen
# BROWSER_SCREEN_WIDTH=2560
# BROWSER_SCREEN_HEIGHT=1600

# Browser Context - Locale & Timezone Configuration

# Locale Settings
BROWSER_LOCALE=en-US
# Example: British English
# BROWSER_LOCALE=en-GB
# Example: German
# BROWSER_LOCALE=de-DE
# Example: Japanese
# BROWSER_LOCALE=ja-JP
# Example: Spanish (Mexico)
# BROWSER_LOCALE=es-MX

# Timezone
BROWSER_TIMEZONE_ID=America/New_York
# Example: Pacific Time
# BROWSER_TIMEZONE_ID=America/Los_Angeles
# Example: Central European Time
# BROWSER_TIMEZONE_ID=Europe/Berlin
# Example: Japan Standard Time
# BROWSER_TIMEZONE_ID=Asia/Tokyo
# Example: UTC
# BROWSER_TIMEZONE_ID=UTC

# Browser Context - Geolocation Configuration

BROWSER_GEOLOCATION_ENABLED=false
# Example: Enable geolocation
# BROWSER_GEOLOCATION_ENABLED=true

BROWSER_GEOLOCATION_LATITUDE=40.7128
BROWSER_GEOLOCATION_LONGITUDE=-74.0060
BROWSER_GEOLOCATION_ACCURACY=100
# Example: San Francisco
# BROWSER_GEOLOCATION_LATITUDE=37.7749
# BROWSER_GEOLOCATION_LONGITUDE=-122.4194
# BROWSER_GEOLOCATION_ACCURACY=50
# Example: London
# BROWSER_GEOLOCATION_LATITUDE=51.5074
# BROWSER_GEOLOCATION_LONGITUDE=-0.1278
# BROWSER_GEOLOCATION_ACCURACY=100

# Browser Context - Permissions Configuration

BROWSER_PERMISSIONS=
# Example: Grant all permissions
# BROWSER_PERMISSIONS=geolocation;notifications;camera;microphone;clipboard-read;clipboard-write
# Example: Location-based app
# BROWSER_PERMISSIONS=geolocation
# Example: Video chat app
# BROWSER_PERMISSIONS=camera;microphone
# Example: Push notifications
# BROWSER_PERMISSIONS=notifications;push

# Browser Context - Color & Motion Preferences

BROWSER_COLOR_SCHEME=light
# Example: Dark mode testing
# BROWSER_COLOR_SCHEME=dark
# Example: System preference
# BROWSER_COLOR_SCHEME=no-preference

BROWSER_REDUCED_MOTION=null
# Example: Test with reduced motion
# BROWSER_REDUCED_MOTION=reduce
# Example: No motion preference
# BROWSER_REDUCED_MOTION=no-preference

BROWSER_FORCED_COLORS=none
# Example: High contrast mode
# BROWSER_FORCED_COLORS=active

# Browser Context - Network Configuration

BROWSER_OFFLINE=false
# Example: Test offline mode
# BROWSER_OFFLINE=true

BROWSER_IGNORE_HTTPS_ERRORS=false
# Example: Accept self-signed certificates
# BROWSER_IGNORE_HTTPS_ERRORS=true

BROWSER_EXTRA_HTTP_HEADERS=
# Example: Add custom headers
# BROWSER_EXTRA_HTTP_HEADERS=X-Test-Mode:true;X-Client-Version:1.0.0
# Example: API key header
# BROWSER_EXTRA_HTTP_HEADERS=X-API-Key:abc123;Accept:application/json
# Example: Custom authorization
# BROWSER_EXTRA_HTTP_HEADERS=Authorization:Bearer token123;X-Request-ID:test-123

BROWSER_HTTP_CREDENTIALS_USERNAME=
BROWSER_HTTP_CREDENTIALS_PASSWORD=ENCRYPTED:
# Example: Basic authentication
# BROWSER_HTTP_CREDENTIALS_USERNAME=testuser
# BROWSER_HTTP_CREDENTIALS_PASSWORD=ENCRYPTED:U2FsdGVkX1+encrypted

BROWSER_USER_AGENT=
# Example: Custom mobile user agent
# BROWSER_USER_AGENT=Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)
# Example: Bot user agent
# BROWSER_USER_AGENT=MyTestBot/1.0
# Example: Old browser
# BROWSER_USER_AGENT=Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)

# Browser Context - Storage & Downloads Configuration

BROWSER_ACCEPT_DOWNLOADS=true
# Example: Reject downloads in CI
# BROWSER_ACCEPT_DOWNLOADS=false

BROWSER_DOWNLOAD_PATH=./downloads
# Example: Custom download location
# BROWSER_DOWNLOAD_PATH=/tmp/test-downloads
# Example: Project-specific downloads
# BROWSER_DOWNLOAD_PATH=./test-results/downloads

BROWSER_STORAGE_STATE_PATH=
# Example: Reuse authentication
# BROWSER_STORAGE_STATE_PATH=./auth/logged-in-state.json
# Example: Admin session
# BROWSER_STORAGE_STATE_PATH=./auth/admin-session.json

BROWSER_BYPASS_CSP=false
# Example: Testing with CSP disabled
# BROWSER_BYPASS_CSP=true

BROWSER_JAVASCRIPT_ENABLED=true
# Example: Test without JavaScript
# BROWSER_JAVASCRIPT_ENABLED=false

# Browser Context - Recording Configuration

BROWSER_SCREENSHOT=off
# Example: Always capture screenshots
# BROWSER_SCREENSHOT=on
# Example: Only on test failure
# BROWSER_SCREENSHOT=only-on-failure

BROWSER_SCREENSHOT_MODE=screenshot
# Example: Full page screenshots
# BROWSER_SCREENSHOT_MODE=fullPage

BROWSER_SCREENSHOT_PATH=./screenshots
# Example: Timestamped screenshots
# BROWSER_SCREENSHOT_PATH=./reports/screenshots/{timestamp}

BROWSER_VIDEO=off
# Example: Record all tests
# BROWSER_VIDEO=on
# Example: Keep video only on failure
# BROWSER_VIDEO=retain-on-failure
# Example: Record on retry
# BROWSER_VIDEO=on-first-retry

BROWSER_VIDEO_SIZE_WIDTH=
BROWSER_VIDEO_SIZE_HEIGHT=
# Example: Custom video size
# BROWSER_VIDEO_SIZE_WIDTH=1280
# BROWSER_VIDEO_SIZE_HEIGHT=720

BROWSER_VIDEO_PATH=./videos
# Example: Organized video storage
# BROWSER_VIDEO_PATH=./test-results/videos/{date}

BROWSER_TRACE=off
# Example: Always record trace
# BROWSER_TRACE=on
# Example: Trace on failure
# BROWSER_TRACE=retain-on-failure
# Example: Trace on retry
# BROWSER_TRACE=on-first-retry

BROWSER_TRACE_PATH=./traces
BROWSER_TRACE_SCREENSHOTS=true
BROWSER_TRACE_SNAPSHOTS=true
BROWSER_TRACE_SOURCES=false
# Example: Full trace with sources
# BROWSER_TRACE_SCREENSHOTS=true
# BROWSER_TRACE_SNAPSHOTS=true
# BROWSER_TRACE_SOURCES=true

# Browser Context - Service Workers & Certificates

BROWSER_SERVICE_WORKERS=allow
# Example: Block service workers
# BROWSER_SERVICE_WORKERS=block

BROWSER_CLIENT_CERTIFICATES_PATH=
# Example: mTLS authentication
# BROWSER_CLIENT_CERTIFICATES_PATH=./certs/client-cert.pem
# Example: Multiple certificates
# BROWSER_CLIENT_CERTIFICATES_PATH=./certs/cert1.pem;./certs/cert2.pem

# Browser Context - Debugging Configuration

BROWSER_STRICT_SELECTORS=false
# Example: Fail on ambiguous selectors
# BROWSER_STRICT_SELECTORS=true

BROWSER_FORCE_GARBAGE_COLLECTION=false
# Example: Force GC for memory testing
# BROWSER_FORCE_GARBAGE_COLLECTION=true

# Browser Context - Timeout Configuration

BROWSER_DEFAULT_TIMEOUT=30000
# Example: Quick timeout for unit tests
# BROWSER_DEFAULT_TIMEOUT=5000
# Example: Long timeout for slow operations
# BROWSER_DEFAULT_TIMEOUT=120000

BROWSER_DEFAULT_NAVIGATION_TIMEOUT=30000
# Example: Slow network timeout
# BROWSER_DEFAULT_NAVIGATION_TIMEOUT=60000

BROWSER_ACTION_TIMEOUT=10000
# Example: Fast action timeout
# BROWSER_ACTION_TIMEOUT=3000

BROWSER_NAVIGATION_TIMEOUT=30000
# Example: Page load timeout
# BROWSER_NAVIGATION_TIMEOUT=45000

BROWSER_AUTO_WAIT_TIMEOUT=5000
# Example: Quick auto-wait
# BROWSER_AUTO_WAIT_TIMEOUT=1000

# Browser - Advanced Configuration

BROWSER_PERSISTENT_CONTEXT=false
# Example: Use persistent browser profile
# BROWSER_PERSISTENT_CONTEXT=true

BROWSER_USER_DATA_DIR=
# Example: Custom profile directory
# BROWSER_USER_DATA_DIR=./browser-profiles/test-user
# Example: Temp profile
# BROWSER_USER_DATA_DIR=/tmp/playwright-profile

BROWSER_MAXIMIZED=false
# Example: Start maximized
# BROWSER_MAXIMIZED=true

BROWSER_START_FULLSCREEN=false
# Example: Fullscreen mode
# BROWSER_START_FULLSCREEN=true

BROWSER_KIOSK_MODE=false
# Example: Kiosk mode for demos
# BROWSER_KIOSK_MODE=true

# Browser - Legacy Application Support (IE Mode Workarounds)
# NOTE: Playwright does NOT natively support IE mode in Edge
# These are workarounds and fallback strategies

# Legacy Mode Support
LEGACY_MODE_ENABLED=false
# Example: Enable legacy application support
# LEGACY_MODE_ENABLED=true

LEGACY_BROWSER_ENGINE=edge
# Example: Use Edge for legacy apps (limited compatibility)
# LEGACY_BROWSER_ENGINE=edge
# Example: Use Selenium IE Driver (recommended for true IE mode)
# LEGACY_BROWSER_ENGINE=selenium-ie

# IE Mode Configuration (Workarounds - NOT native Playwright support)
IE_MODE_ENABLED=false
# Example: Enable IE mode workarounds
# IE_MODE_ENABLED=true

IE_MODE_SITES_LIST=
# Example: Sites that require IE mode
# IE_MODE_SITES_LIST=*.legacyapp.com;intranet.company.com;10.0.0.*;192.168.*

IE_MODE_DOCUMENT_MODE=11
# Example: Force IE11 document mode
# IE_MODE_DOCUMENT_MODE=11
# Example: IE10 compatibility
# IE_MODE_DOCUMENT_MODE=10
# Example: IE8 compatibility
# IE_MODE_DOCUMENT_MODE=8

# Edge IE Mode Arguments (Experimental - may not work with Playwright)
EDGE_IE_MODE_ARGS=
# WARNING: These args may not enable true IE mode in Playwright
# Example: Attempt IE mode flags (limited success)
# EDGE_IE_MODE_ARGS=--ie-mode-test;--internet-explorer-integration=iemode
# Example: Try to force IE mode with site list
# EDGE_IE_MODE_ARGS=--ie-mode-test;--ie-mode-site-list=./ie-sites.xml
# Example: Edge with enterprise mode attempt
# EDGE_IE_MODE_ARGS=--enable-features=msEdgeIEModeEnableSiteListImprovement

# Legacy Compatibility Headers
IE_COMPATIBILITY_HEADERS=
# Example: Force IE11 compatibility
# IE_COMPATIBILITY_HEADERS=X-UA-Compatible:IE=11
# Example: Edge mode
# IE_COMPATIBILITY_HEADERS=X-UA-Compatible:IE=edge
# Example: Emulate IE8
# IE_COMPATIBILITY_HEADERS=X-UA-Compatible:IE=EmulateIE8

# ActiveX and Java Support
ENABLE_ACTIVEX=false
# Example: Enable for legacy apps
# ENABLE_ACTIVEX=true

ENABLE_JAVA_APPLETS=false
# Example: Enable Java support
# ENABLE_JAVA_APPLETS=true

# Legacy Authentication
LEGACY_AUTH_MODE=
# Example: Windows authentication
# LEGACY_AUTH_MODE=windows
# Example: NTLM authentication
# LEGACY_AUTH_MODE=ntlm
# Example: Kerberos
# LEGACY_AUTH_MODE=kerberos

# Selenium Fallback Configuration (REQUIRED for true IE mode)
# Since Playwright doesn't support IE mode, use Selenium WebDriver
SELENIUM_IE_DRIVER_PATH=
# Example: Path to IEDriverServer.exe (version 4.0+ required)
# SELENIUM_IE_DRIVER_PATH=./drivers/IEDriverServer.exe

SELENIUM_IE_OPTIONS=
# Example: IE specific options for Selenium
# SELENIUM_IE_OPTIONS=ignoreProtectedModeSettings:true;ignoreZoomLevel:true;enablePersistentHover:false

SELENIUM_EDGE_IE_MODE=false
# Example: Use Selenium WebDriver for IE mode testing (recommended)
# SELENIUM_EDGE_IE_MODE=true

# Hybrid Mode - Switch between Playwright and Selenium
# Use Playwright for modern apps, Selenium for IE mode
HYBRID_MODE_ENABLED=false
# Example: Enable hybrid testing (best approach for mixed apps)
# HYBRID_MODE_ENABLED=true

HYBRID_MODE_RULES=
# Example: Route legacy apps to Selenium, modern to Playwright
# HYBRID_MODE_RULES=*.legacyapp.com:selenium;*.modernapp.com:playwright

# Browser Instance Management & Switching

# Browser Instance Reuse Strategy
BROWSER_INSTANCE_STRATEGY=new-per-scenario
# Example: Create new browser for each scenario (default)
# BROWSER_INSTANCE_STRATEGY=new-per-scenario
# Example: Reuse same browser across scenarios
# BROWSER_INSTANCE_STRATEGY=reuse-across-scenarios
# Example: New browser per feature file
# BROWSER_INSTANCE_STRATEGY=new-per-feature
# Example: Single browser for entire test run
# BROWSER_INSTANCE_STRATEGY=single-instance
# Example: New browser after N scenarios
# BROWSER_INSTANCE_STRATEGY=new-after-count

# Browser Instance Count (for new-after-count strategy)
BROWSER_INSTANCE_RENEWAL_COUNT=10
# Example: New browser after every 10 scenarios
# BROWSER_INSTANCE_RENEWAL_COUNT=10

# Browser Context Strategy
BROWSER_CONTEXT_STRATEGY=new-per-scenario
# Example: New context for each scenario (clean state)
# BROWSER_CONTEXT_STRATEGY=new-per-scenario
# Example: Reuse context (maintain cookies/storage)
# BROWSER_CONTEXT_STRATEGY=reuse-context
# Example: New context per feature
# BROWSER_CONTEXT_STRATEGY=new-per-feature

# Browser Switching Configuration
BROWSER_SWITCHING_ENABLED=false
# Example: Allow browser switching during execution
# BROWSER_SWITCHING_ENABLED=true

BROWSER_SWITCH_MAINTAIN_STATE=false
# Example: Preserve cookies/storage when switching browsers
# BROWSER_SWITCH_MAINTAIN_STATE=true

BROWSER_SWITCH_SYNC_STORAGE=false
# Example: Sync localStorage between browser switches
# BROWSER_SWITCH_SYNC_STORAGE=true

# Browser Restart Configuration
BROWSER_RESTART_ENABLED=false
# Example: Allow browser restart during execution
# BROWSER_RESTART_ENABLED=true

BROWSER_RESTART_CLEAR_CACHE=true
# Example: Clear cache on browser restart
# BROWSER_RESTART_CLEAR_CACHE=true

BROWSER_RESTART_CLEAR_COOKIES=true
# Example: Clear cookies on restart
# BROWSER_RESTART_CLEAR_COOKIES=true

BROWSER_RESTART_PRESERVE_DOWNLOADS=false
# Example: Keep downloads after restart
# BROWSER_RESTART_PRESERVE_DOWNLOADS=true

# Multi-Browser Execution
MULTI_BROWSER_MODE=sequential
# Example: Run browsers one after another
# MULTI_BROWSER_MODE=sequential
# Example: Run browsers in parallel
# MULTI_BROWSER_MODE=parallel
# Example: Switch browsers mid-execution
# MULTI_BROWSER_MODE=dynamic

MULTI_BROWSER_LIST=
# Example: Test on multiple browsers in sequence
# MULTI_BROWSER_LIST=chrome;firefox;edge
# Example: Primary and fallback browsers
# MULTI_BROWSER_LIST=chrome:primary;edge:fallback

# Browser Pool Configuration (for parallel execution)
BROWSER_POOL_ENABLED=false
# Example: Use browser pool for parallel tests
# BROWSER_POOL_ENABLED=true

BROWSER_POOL_SIZE=4
# Example: Maximum 4 browser instances
# BROWSER_POOL_SIZE=4

BROWSER_POOL_REUSE_STRATEGY=round-robin
# Example: Round-robin browser assignment
# BROWSER_POOL_REUSE_STRATEGY=round-robin
# Example: Least recently used
# BROWSER_POOL_REUSE_STRATEGY=lru
# Example: Random assignment
# BROWSER_POOL_REUSE_STRATEGY=random

# Browser Health Check
BROWSER_HEALTH_CHECK_ENABLED=false
# Example: Monitor browser health
# BROWSER_HEALTH_CHECK_ENABLED=true

BROWSER_HEALTH_CHECK_INTERVAL=30000
# Example: Check every 30 seconds
# BROWSER_HEALTH_CHECK_INTERVAL=30000

BROWSER_AUTO_RESTART_ON_CRASH=true
# Example: Auto restart crashed browsers
# BROWSER_AUTO_RESTART_ON_CRASH=true

BROWSER_MAX_RESTART_ATTEMPTS=3
# Example: Try 3 times before failing
# BROWSER_MAX_RESTART_ATTEMPTS=3

# Session Management
SESSION_PRESERVATION_ENABLED=false
# Example: Preserve session across browser changes
# SESSION_PRESERVATION_ENABLED=true

SESSION_STORAGE_PATH=./sessions
# Example: Store session data
# SESSION_STORAGE_PATH=./test-sessions/{timestamp}

SESSION_EXPORT_FORMAT=json
# Example: Export format for session data
# SESSION_EXPORT_FORMAT=json
# Example: HAR format for network data
# SESSION_EXPORT_FORMAT=har

# Browser Isolation
BROWSER_ISOLATION_MODE=none
# Example: No isolation
# BROWSER_ISOLATION_MODE=none
# Example: Process isolation per test
# BROWSER_ISOLATION_MODE=process
# Example: Container isolation (Docker)
# BROWSER_ISOLATION_MODE=container

# Reporting Configuration
REPORT_ENABLED=true
REPORT_FORMATS=html,json,junit
REPORT_OUTPUT_DIR=./reports
REPORT_INCLUDE_SCREENSHOTS=true
REPORT_INCLUDE_VIDEOS=false
REPORT_INCLUDE_TRACES=false
REPORT_OPEN_AFTER_RUN=true
REPORT_TIMESTAMP_FORMAT=YYYY-MM-DD_HH-mm-ss

# API Configuration
API_BASE_URL=https://api.{environment}.{project}.com
API_TIMEOUT=30000
API_RETRY_COUNT=3
API_RETRY_DELAY=1000
API_LOG_REQUESTS=true
API_LOG_RESPONSES=true

# Database Configuration
DB_ENABLED=false
DB_TYPE=mysql
DB_HOST={project}-{environment}-db.cloud.com
DB_PORT=3306
DB_NAME={project}_{environment}
DB_USERNAME={project}_user
DB_PASSWORD=ENCRYPTED:x7f8d9s8f7d9f8
DB_CONNECTION_POOL_MIN=2
DB_CONNECTION_POOL_MAX=10
DB_QUERY_TIMEOUT=10000

# Logging Configuration
LOG_LEVEL=info
LOG_TO_FILE=true
LOG_FILE_PATH=./logs/{project}/{environment}_{timestamp}.log
LOG_MAX_FILE_SIZE=10MB
LOG_MAX_FILES=5
LOG_CONSOLE_ENABLED=true
LOG_CONSOLE_COLORS=true

# AI & Self-Healing
AI_ENABLED=true
AI_CONFIDENCE_THRESHOLD=0.7
SELF_HEALING_ENABLED=true
SELF_HEALING_MAX_ATTEMPTS=3
SELF_HEALING_CACHE_TTL=300000

# Azure DevOps Integration
ADO_ENABLED=false
ADO_ORGANIZATION={organization}
ADO_PROJECT={project}
ADO_PAT=ENCRYPTED:a8f7d9s8f7d9f8
ADO_UPDATE_TEST_CASES=true
ADO_CREATE_BUGS_ON_FAILURE=false

# Azure DevOps Proxy Configuration
ADO_PROXY_ENABLED=false
# Example: Enable proxy for ADO API calls
# ADO_PROXY_ENABLED=true

ADO_PROXY_HOST=
# Example: Corporate proxy server
# ADO_PROXY_HOST=proxy.company.com
# Example: IP address
# ADO_PROXY_HOST=10.10.10.10

ADO_PROXY_PORT=8080
# Example: Standard proxy port
# ADO_PROXY_PORT=8080
# Example: Custom port
# ADO_PROXY_PORT=3128

ADO_PROXY_PROTOCOL=http
# Example: HTTP proxy
# ADO_PROXY_PROTOCOL=http
# Example: HTTPS proxy
# ADO_PROXY_PROTOCOL=https
# Example: SOCKS5 proxy
# ADO_PROXY_PROTOCOL=socks5

ADO_PROXY_AUTH_REQUIRED=false
# Example: Proxy requires authentication
# ADO_PROXY_AUTH_REQUIRED=true

ADO_PROXY_USERNAME=
# Example: Proxy username
# ADO_PROXY_USERNAME=proxyuser

ADO_PROXY_PASSWORD=ENCRYPTED:
# Example: Encrypted proxy password
# ADO_PROXY_PASSWORD=ENCRYPTED:U2FsdGVkX1+encrypted

ADO_PROXY_BYPASS_LIST=
# Example: Bypass proxy for internal URLs
# ADO_PROXY_BYPASS_LIST=localhost;127.0.0.1;*.internal.company.com

# Azure DevOps API Configuration
ADO_API_BASE_URL=https://dev.azure.com
# Example: On-premise Azure DevOps Server
# ADO_API_BASE_URL=https://azuredevops.company.com
# Example: Azure DevOps Services
# ADO_API_BASE_URL=https://dev.azure.com

ADO_API_VERSION=7.0
# Example: API version
# ADO_API_VERSION=6.0
# ADO_API_VERSION=7.0
# ADO_API_VERSION=7.1-preview

ADO_API_TIMEOUT=30000
# Example: Increase timeout for slow connections
# ADO_API_TIMEOUT=60000

ADO_API_RETRY_COUNT=3
# Example: Retry failed API calls
# ADO_API_RETRY_COUNT=5

ADO_API_RETRY_DELAY=1000
# Example: Wait between retries
# ADO_API_RETRY_DELAY=2000

# Azure DevOps SSL/TLS Configuration
ADO_SSL_VERIFY=true
# Example: Skip SSL verification (not recommended)
# ADO_SSL_VERIFY=false

ADO_CLIENT_CERT_PATH=
# Example: Client certificate for mTLS
# ADO_CLIENT_CERT_PATH=./certs/ado-client.pem

ADO_CLIENT_KEY_PATH=
# Example: Client key for mTLS
# ADO_CLIENT_KEY_PATH=./certs/ado-client.key

ADO_CA_CERT_PATH=
# Example: Custom CA certificate
# ADO_CA_CERT_PATH=./certs/company-ca.pem

# Notification Settings
NOTIFICATION_ENABLED=false
NOTIFICATION_ON_SUCCESS=false
NOTIFICATION_ON_FAILURE=true
NOTIFICATION_CHANNELS=console

# Debug Settings
DEBUG_MODE=false
DEBUG_PAUSE_ON_FAILURE=false
DEBUG_SCREENSHOT_ON_FAILURE=true
DEBUG_KEEP_BROWSER_OPEN=false
```

### 1.3 Project-Specific Configuration (config/akhan/common/common.env)
```properties
# Project-specific overrides
PROJECT_NAME=AKHAN
PROJECT_TYPE=web
PROJECT_VERSION=2.1.0

# Project URLs
BASE_URL=https://akhan.{environment}.americas.inet.net
API_BASE_URL=https://api-akhan.{environment}.americas.inet.net
ADMIN_URL=https://admin-akhan.{environment}.americas.inet.net

# Project Features (multiple features supported)
DEFAULT_FEATURES=test/akhan/features/login/*.feature,test/akhan/features/dashboard/*.feature
DEFAULT_TAGS=@akhan and not @wip

# Selective Step Loading (only load what's needed)
STEP_DEFINITIONS_PATH=test/akhan/steps
COMMON_STEPS_ENABLED=true
PROJECT_STEPS_ONLY=true

# Project-specific timeouts
DEFAULT_TIMEOUT=45000
PAGE_LOAD_TIMEOUT=60000

# Project credentials
DEFAULT_USERNAME=akhan_user
DEFAULT_PASSWORD=ENCRYPTED:b9g8e0t9g8e0
ADMIN_USERNAME=akhan_admin
ADMIN_PASSWORD=ENCRYPTED:c0h9f1u0h9f1
```

### 1.4 Environment Configuration (config/akhan/environments/dev.env)
```properties
# Environment-specific settings
ENVIRONMENT_NAME=Development
ENVIRONMENT_TYPE=dev

# URLs with interpolation
BASE_URL=https://akhan-dev.americas.inet.net
API_BASE_URL=https://api-akhan-dev.americas.inet.net
DB_HOST=akhan-dev-db.americas.cloud.com

# Environment features
FEATURE_FLAGS=feature1:true,feature2:false,feature3:true

# Dev-specific settings
HEADLESS=false
DEBUG_MODE=true
LOG_LEVEL=debug
BROWSER_DEVTOOLS=true
```

### 1.5 Command Line Execution

#### Minimal Command (Everything from Config)
```bash
# Uses ALL defaults from configuration
npm run test

# What happens:
# 1. Loads global.env defaults
# 2. PROJECT=common (from DEFAULT_PROJECT)
# 3. ENVIRONMENT=dev (from DEFAULT_ENVIRONMENT)
# 4. BROWSER=chrome (from DEFAULT_BROWSER)
# 5. FEATURES=test/*/features/*.feature (from DEFAULT_FEATURES)
# 6. TAGS=not @skip and not @manual (from DEFAULT_TAGS)
```

#### Project-Specific Execution
```bash
# Just specify project, everything else from config
npm run test:akhan

# Automatically loads:
# - config/akhan/common/common.env
# - config/akhan/environments/dev.env (default environment)
# - Features from DEFAULT_FEATURES in akhan config
# - Tags from DEFAULT_TAGS in akhan config
```

#### Override Specific Settings
```bash
# Override only what you need
npm run test:akhan --env=prod
npm run test:akhan --browser=firefox
npm run test:akhan --parallel=true
npm run test:akhan --headless=true
```

#### Multiple Features Execution
```properties
# In config file - comma-separated or glob patterns
DEFAULT_FEATURES=test/akhan/features/login/*.feature,test/akhan/features/dashboard/*.feature,test/akhan/features/api/**/*.feature

# Or via command line
npm run test:akhan --features="login/*.feature,dashboard/*.feature"

# Or using glob patterns
npm run test:akhan --features="**/*user*.feature"
```

### 1.6 Variable Interpolation in Configuration

#### Supported Interpolation Patterns
```properties
# Project and environment variables
BASE_URL=https://{project}.{environment}.{region}.inet.net
API_URL={BASE_URL}/api/v1
ADMIN_URL={BASE_URL}/admin

# System environment variables
LOG_PATH=${LOG_DIR:-./logs}/{project}/{environment}
TEMP_DIR=${TEMP:-/tmp}/cs-framework

# Dynamic values
REPORT_NAME=TestReport_{timestamp}_{project}_{environment}
SESSION_ID={uuid}
RUN_ID=RUN_{timestamp}_{random}

# Conditional interpolation
DB_URL={environment:prod?proddb.com|{environment}-db.com}
```

#### Complex Interpolation Examples
```properties
# Multi-level interpolation
PROJECT=akhan
ENVIRONMENT=dev
REGION=americas
SUBDOMAIN={project}-{environment}
DOMAIN={region}.inet.net
BASE_URL=https://{subdomain}.{domain}
# Result: https://akhan-dev.americas.inet.net

# Array interpolation for multiple features
PROJECTS=akhan,bkhan,ckhan
FEATURES={projects:map:test/{item}/features/*.feature}
# Result: test/akhan/features/*.feature,test/bkhan/features/*.feature,test/ckhan/features/*.feature
```

### 1.7 Scenario Expansion Based on Test Data

#### Data-Driven Scenario Expansion
```properties
# Data provider configuration
DATA_PROVIDER_ENABLED=true
DATA_PROVIDER_SOURCES=excel;csv;json;api;database
DATA_EXPANSION_MODE=parallel  # parallel | sequential

# Example: Single scenario expands to multiple based on data
# Feature file has 1 scenario outline
# Excel has 100 rows of test data
# Result: 100 test scenarios executed
```

#### Example Scenario Expansion
```gherkin
# Feature file (1 scenario)
@DataProvider(source="users.xlsx", sheet="LoginData")
Scenario Outline: Login test
  When I login with "<username>" and "<password>"
  Then I should see "<expected_result>"

# Excel file (users.xlsx) has 100 rows
# Framework automatically:
# 1. Reads Excel data (100 rows)
# 2. Expands scenario to 100 instances
# 3. Executes all 100 scenarios
# 4. Reports individually (100 pass/fail results)
```

#### Multiple Data Sources
```properties
# Configure multiple data sources
DATA_SOURCE_EXCEL=test/data/{project}/TestData.xlsx
DATA_SOURCE_CSV=test/data/{project}/users.csv
DATA_SOURCE_JSON=test/data/{project}/config.json
DATA_SOURCE_API=https://api.{environment}.com/testdata
DATA_SOURCE_DATABASE=SELECT * FROM test_data WHERE project='{project}'

# Priority order for data sources
DATA_SOURCE_PRIORITY=excel;database;api;json;csv
```

### 1.8 Lightning-Fast Startup Optimization

#### Selective Step Loading Configuration
```properties
# Only load steps for features being executed
SELECTIVE_STEP_LOADING=true

# Step loading strategy
STEP_LOADING_STRATEGY=on-demand  # on-demand | preload | lazy

# Cache compiled steps
CACHE_COMPILED_STEPS=true
STEP_CACHE_TTL=3600000  # 1 hour

# Parallel step compilation
PARALLEL_STEP_COMPILATION=true
COMPILATION_WORKERS=4
```

#### Performance Configuration
```properties
# TypeScript optimization
TS_NODE_TRANSPILE_ONLY=true
TS_NODE_FILES=false
TS_NODE_CACHE=true
TS_NODE_COMPILER_OPTIONS={"target":"ES2020","module":"commonjs"}

# Module loading
LAZY_MODULE_LOADING=true
PRELOAD_CORE_MODULES=false
DEFER_NON_CRITICAL_MODULES=true

# Framework optimization
PARALLEL_INITIALIZATION=true
SKIP_VALIDATION_IN_PROD=true
MINIMIZE_MEMORY_FOOTPRINT=true
```

#### Feature-Based Step Loading
```properties
# Step definition locations (semicolon separated, can be files or folders)
STEP_DEFINITIONS_PATH=test/common/steps;test/{project}/steps;test/shared/api-steps.ts;test/shared/db-steps.ts

# Examples of different path formats:
# Folder: test/akhan/steps - loads all .ts files from folder
# File: test/shared/api-steps.ts - loads specific file
# Multiple: test/common/steps;test/akhan/steps;test/api/steps.ts

# Framework automatically:
# 1. Reads STEP_DEFINITIONS_PATH from config hierarchy
# 2. Parses features to be executed
# 3. Loads ONLY step files that contain matching step patterns
# 4. Skips step files not needed for current features
```

### 1.9 Startup Sequence With Configuration
```
1. Load minimal core (< 50ms)
   - Only CSConfigurationManager
   - No framework initialization yet

2. Read configuration hierarchy (< 100ms)
   - Command line args
   - Environment variables
   - Config files (cached)

3. Determine execution scope (< 20ms)
   - Which features to run
   - Which project
   - Which environment

4. Selective module loading (< 200ms)
   - ONLY load required modules
   - Skip unused components
   - Lazy load on-demand

5. Parallel initialization (< 300ms)
   - Browser launch
   - Step definition loading
   - Report setup
   - All in parallel

Total startup: < 1 second
```

### 1.10 Package.json Scripts Configuration
```json
{
  "scripts": {
    "test": "cross-env TS_NODE_TRANSPILE_ONLY=true node -r ts-node/register/transpile-only src/index.ts",
    "test:akhan": "npm run test -- --project=akhan",
    "test:bkhan": "npm run test -- --project=bkhan",
    "test:dev": "npm run test -- --env=dev",
    "test:prod": "npm run test -- --env=prod",
    "test:parallel": "npm run test -- --parallel=true",
    "test:debug": "npm run test -- --debug=true --headless=false",
    "test:smoke": "npm run test -- --tags=@smoke",
    "test:regression": "npm run test -- --tags=@regression",
    "test:all": "npm run test -- --features='test/**/features/**/*.feature'"
  }
}
```

### 1.11 Real-World Configuration Examples

#### Complete E2E Test Configuration
```properties
# Run full regression with all features
DEFAULT_PROJECT=akhan
DEFAULT_ENVIRONMENT=staging
DEFAULT_BROWSER=chrome
DEFAULT_HEADLESS=true
DEFAULT_PARALLEL=true
DEFAULT_WORKERS=8
DEFAULT_FEATURES=test/akhan/features/**/*.feature
DEFAULT_TAGS=@regression and not @manual

# Browser optimizations for CI/CD
BROWSER_ARGS=--disable-dev-shm-usage;--disable-blink-features=AutomationControlled
BROWSER_SCREENSHOT=only-on-failure
BROWSER_VIDEO=retain-on-failure
BROWSER_TRACE=on-first-retry
REPORT_FORMATS=html;json;junit;pdf
```

#### Mobile Testing Configuration
```properties
# Mobile device emulation
DEFAULT_PROJECT=mobile
DEFAULT_BROWSER=webkit
BROWSER_IS_MOBILE=true
BROWSER_HAS_TOUCH=true
BROWSER_VIEWPORT_WIDTH=375
BROWSER_VIEWPORT_HEIGHT=667
BROWSER_DEVICE_SCALE_FACTOR=2
BROWSER_USER_AGENT=Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)
BROWSER_LOCALE=en-US
BROWSER_TIMEZONE_ID=America/New_York
```

#### Cross-Browser Testing Configuration
```properties
# Test across all browsers
DEFAULT_PROJECT=akhan
BROWSER_LIST=chrome;firefox;webkit;edge
BROWSER_HEADLESS=true
BROWSER_VIEWPORT_WIDTH=1920
BROWSER_VIEWPORT_HEIGHT=1080
BROWSER_IGNORE_HTTPS_ERRORS=true
BROWSER_SCREENSHOT=on
BROWSER_VIDEO=on
```

#### Geolocation Testing Configuration
```properties
# Test with different locations
DEFAULT_PROJECT=geo
BROWSER_GEOLOCATION_ENABLED=true
BROWSER_GEOLOCATION_LATITUDE=51.5074  # London
BROWSER_GEOLOCATION_LONGITUDE=-0.1278
BROWSER_GEOLOCATION_ACCURACY=100
BROWSER_PERMISSIONS=geolocation
BROWSER_LOCALE=en-GB
BROWSER_TIMEZONE_ID=Europe/London
```

#### Performance Testing Configuration
```properties
# Measure performance metrics
DEFAULT_PROJECT=perf
BROWSER_DEVTOOLS=true
BROWSER_TRACE=on
BROWSER_TRACE_SCREENSHOTS=true
BROWSER_TRACE_SNAPSHOTS=true
BROWSER_TRACE_SOURCES=true
BROWSER_VIDEO=on
BROWSER_SLOWMO=0
BROWSER_DEFAULT_TIMEOUT=60000
```

#### Accessibility Testing Configuration
```properties
# Test with accessibility features
DEFAULT_PROJECT=a11y
BROWSER_COLOR_SCHEME=dark
BROWSER_REDUCED_MOTION=reduce
BROWSER_FORCED_COLORS=active
BROWSER_DEVICE_SCALE_FACTOR=1.5
BROWSER_VIEWPORT_WIDTH=1366
BROWSER_VIEWPORT_HEIGHT=768
```

#### Network Testing Configuration
```properties
# Test with proxy and network conditions
DEFAULT_PROJECT=network
BROWSER_PROXY_SERVER=http://proxy.company.com:8080
BROWSER_PROXY_BYPASS=localhost;*.local
BROWSER_PROXY_USERNAME=proxy_user
BROWSER_PROXY_PASSWORD=ENCRYPTED:x7f8d9s8f7d9f8
BROWSER_OFFLINE=false
BROWSER_EXTRA_HTTP_HEADERS=X-Custom-Header:value;X-Test-Mode:true
```

#### Debug Configuration
```properties
# Debug mode for development
DEFAULT_PROJECT=akhan
DEFAULT_ENVIRONMENT=local
DEFAULT_BROWSER=chrome
DEFAULT_HEADLESS=false
DEFAULT_PARALLEL=false
DEBUG_MODE=true
DEBUG_PAUSE_ON_FAILURE=true
BROWSER_DEVTOOLS=true
BROWSER_SLOWMO=500
BROWSER_START_FULLSCREEN=false
BROWSER_STRICT_SELECTORS=true
LOG_LEVEL=DEBUG  # Show all logs including debug (set to INFO to hide debug messages)
VERBOSE_REPORTING=true
```

#### Security Testing Configuration
```properties
# Security and authentication testing
DEFAULT_PROJECT=security
BROWSER_IGNORE_HTTPS_ERRORS=false
BROWSER_BYPASS_CSP=false
BROWSER_HTTP_CREDENTIALS_USERNAME=test_user
BROWSER_HTTP_CREDENTIALS_PASSWORD=ENCRYPTED:b9g8e0t9g8e0
BROWSER_CLIENT_CERTIFICATES_PATH=./certs/client.pem
BROWSER_STORAGE_STATE_PATH=./auth/session.json
```

#### Legacy IE Mode Application Configuration
```properties
# For applications requiring Internet Explorer compatibility
DEFAULT_PROJECT=legacy-app
DEFAULT_BROWSER=edge

# Enable IE Mode Support
IE_MODE_ENABLED=true
LEGACY_MODE_ENABLED=true
LEGACY_BROWSER_ENGINE=edge

# Sites requiring IE mode
IE_MODE_SITES_LIST=*.legacyapp.company.com;intranet.company.com;10.0.0.*;192.168.*

# IE Document mode (11, 10, 9, 8, 7, 5)
IE_MODE_DOCUMENT_MODE=11

# Edge with IE mode arguments
BROWSER_CHANNEL=msedge
BROWSER_ARGS=--ie-mode-test;--internet-explorer-integration=iemode;--ie-mode-site-list=./config/ie-sites.xml

# Compatibility headers
IE_COMPATIBILITY_HEADERS=X-UA-Compatible:IE=11
BROWSER_EXTRA_HTTP_HEADERS=X-UA-Compatible:IE=11;X-Frame-Options:SAMEORIGIN

# Legacy features
ENABLE_ACTIVEX=true
ENABLE_JAVA_APPLETS=true

# Windows authentication for intranet
LEGACY_AUTH_MODE=windows
BROWSER_HTTP_CREDENTIALS_USERNAME={windows_user}
BROWSER_HTTP_CREDENTIALS_PASSWORD={windows_password}

# Fallback to Selenium for true IE mode
SELENIUM_EDGE_IE_MODE=true
SELENIUM_IE_DRIVER_PATH=./drivers/IEDriverServer.exe
SELENIUM_IE_OPTIONS=ignoreProtectedModeSettings:true;ignoreZoomLevel:true;requireWindowFocus:false

# Hybrid mode - use Selenium for legacy, Playwright for modern
HYBRID_MODE_ENABLED=true
HYBRID_MODE_RULES=*.legacyapp.com:selenium;*.modernapp.com:playwright
```

#### Enterprise Intranet Configuration
```properties
# For internal enterprise applications
DEFAULT_PROJECT=intranet
DEFAULT_BROWSER=edge
BROWSER_CHANNEL=msedge

# Enterprise mode
IE_MODE_ENABLED=true
IE_MODE_SITES_LIST=*.intranet.company.com;sharepoint.company.com;crm.company.com

# Corporate proxy with Windows auth
BROWSER_PROXY_SERVER=http://proxy.company.com:8080
BROWSER_PROXY_BYPASS=*.company.com;localhost;127.0.0.1
LEGACY_AUTH_MODE=ntlm

# Enterprise policies
BROWSER_ARGS=--enable-features=msEdgeIEModeEnableSiteListImprovement;--allow-running-insecure-content
IE_COMPATIBILITY_HEADERS=X-UA-Compatible:IE=edge

# ActiveX for enterprise apps
ENABLE_ACTIVEX=true

# Certificates for internal sites
BROWSER_IGNORE_HTTPS_ERRORS=true
BROWSER_CLIENT_CERTIFICATES_PATH=./certs/enterprise.pem
```

#### Browser Instance Reuse - Performance Optimization
```properties
# Reuse browser for faster execution
DEFAULT_PROJECT=perf-test
DEFAULT_BROWSER=chrome

# Reuse browser instance across scenarios
BROWSER_INSTANCE_STRATEGY=reuse-across-scenarios
BROWSER_CONTEXT_STRATEGY=new-per-scenario  # Clean context each time

# Keep browser alive between tests
BROWSER_POOL_ENABLED=true
BROWSER_POOL_SIZE=4
BROWSER_POOL_REUSE_STRATEGY=round-robin

# Health monitoring
BROWSER_HEALTH_CHECK_ENABLED=true
BROWSER_AUTO_RESTART_ON_CRASH=true

# Result: 50% faster test execution
```

#### Multi-User Login Testing Configuration
```properties
# Test different user roles with browser restart
DEFAULT_PROJECT=multi-user
DEFAULT_BROWSER=chrome

# New browser for each user login
BROWSER_INSTANCE_STRATEGY=new-per-scenario
BROWSER_RESTART_ENABLED=true
BROWSER_RESTART_CLEAR_COOKIES=true
BROWSER_RESTART_CLEAR_CACHE=true

# Test data for different users
DATA_SOURCE_EXCEL=test/data/users.xlsx
# Users: admin, manager, employee, guest

# Each scenario gets fresh browser with clean state
```

#### Browser Switching - Cross-Browser Validation
```properties
# Start with Chrome, switch to Firefox mid-test
DEFAULT_PROJECT=cross-browser
DEFAULT_BROWSER=chrome

# Enable browser switching
BROWSER_SWITCHING_ENABLED=true
BROWSER_SWITCH_MAINTAIN_STATE=true
BROWSER_SWITCH_SYNC_STORAGE=true

# Multi-browser configuration
MULTI_BROWSER_MODE=dynamic
MULTI_BROWSER_LIST=chrome;firefox;edge

# Scenario: Login in Chrome → Switch to Firefox → Continue workflow
# State preserved across browser switch
```

#### Parallel Execution with Browser Pool
```properties
# Run 50 scenarios in parallel with browser pool
DEFAULT_PROJECT=parallel-suite
DEFAULT_PARALLEL=true
DEFAULT_WORKERS=10

# Browser pool configuration
BROWSER_POOL_ENABLED=true
BROWSER_POOL_SIZE=10  # 10 browser instances max
BROWSER_POOL_REUSE_STRATEGY=lru  # Least recently used

# Instance management
BROWSER_INSTANCE_STRATEGY=reuse-across-scenarios
BROWSER_CONTEXT_STRATEGY=new-per-scenario

# Each worker gets browser from pool
# Browsers reused for efficiency
```

#### Session Preservation Across Browsers
```properties
# Complex workflow across multiple browsers
DEFAULT_PROJECT=session-test

# Session management
SESSION_PRESERVATION_ENABLED=true
SESSION_STORAGE_PATH=./sessions/{timestamp}
SESSION_EXPORT_FORMAT=json

# Browser switching with state
BROWSER_SWITCHING_ENABLED=true
BROWSER_SWITCH_MAINTAIN_STATE=true
BROWSER_SWITCH_SYNC_STORAGE=true

# Workflow:
# 1. Login in Chrome → Save session
# 2. Close Chrome → Open Firefox
# 3. Load session → Continue from same point
```

#### Browser Crash Recovery Configuration
```properties
# Resilient testing with auto-recovery
DEFAULT_PROJECT=resilient-tests

# Auto-recovery settings
BROWSER_AUTO_RESTART_ON_CRASH=true
BROWSER_MAX_RESTART_ATTEMPTS=3
BROWSER_HEALTH_CHECK_ENABLED=true
BROWSER_HEALTH_CHECK_INTERVAL=30000

# Instance renewal
BROWSER_INSTANCE_STRATEGY=new-after-count
BROWSER_INSTANCE_RENEWAL_COUNT=25  # New browser every 25 tests

# Prevents memory leaks and browser fatigue
```

#### Azure DevOps Integration with Corporate Proxy
```properties
# ADO behind corporate proxy
DEFAULT_PROJECT=ado-tests

# Azure DevOps Configuration
ADO_ENABLED=true
ADO_ORGANIZATION=mycompany
ADO_PROJECT=TestAutomation
ADO_PAT=ENCRYPTED:U2FsdGVkX1+mytoken
ADO_UPDATE_TEST_CASES=true
ADO_CREATE_BUGS_ON_FAILURE=true

# Corporate Proxy for ADO API
ADO_PROXY_ENABLED=true
ADO_PROXY_HOST=proxy.company.com
ADO_PROXY_PORT=8080
ADO_PROXY_PROTOCOL=http
ADO_PROXY_AUTH_REQUIRED=true
ADO_PROXY_USERNAME=corp_user
ADO_PROXY_PASSWORD=ENCRYPTED:U2FsdGVkX1+proxypass
ADO_PROXY_BYPASS_LIST=localhost;127.0.0.1;*.internal.company.com

# API Configuration
ADO_API_BASE_URL=https://dev.azure.com
ADO_API_VERSION=7.0
ADO_API_TIMEOUT=60000  # Longer timeout for proxy
ADO_API_RETRY_COUNT=5

# SSL Configuration
ADO_SSL_VERIFY=true
ADO_CA_CERT_PATH=./certs/company-ca.pem
```

#### On-Premise Azure DevOps Server Configuration
```properties
# On-premise ADO Server with proxy
DEFAULT_PROJECT=onprem-ado

# Azure DevOps Server
ADO_ENABLED=true
ADO_ORGANIZATION=CompanyCollection
ADO_PROJECT=AutomationProject
ADO_PAT=ENCRYPTED:U2FsdGVkX1+servertoken

# On-premise server URL
ADO_API_BASE_URL=https://tfs.company.local/tfs
ADO_API_VERSION=6.0  # Older version for on-premise

# Internal proxy for on-premise
ADO_PROXY_ENABLED=true
ADO_PROXY_HOST=10.10.10.10
ADO_PROXY_PORT=3128
ADO_PROXY_PROTOCOL=http
ADO_PROXY_AUTH_REQUIRED=false  # No auth for internal proxy

# SSL with self-signed certificate
ADO_SSL_VERIFY=false  # Self-signed cert
ADO_CLIENT_CERT_PATH=./certs/tfs-client.pem
ADO_CLIENT_KEY_PATH=./certs/tfs-client.key
```

#### ADO with SOCKS5 Proxy
```properties
# ADO via SOCKS5 proxy
DEFAULT_PROJECT=socks-ado

# Azure DevOps
ADO_ENABLED=true
ADO_ORGANIZATION=myorg
ADO_PROJECT=myproject
ADO_PAT=ENCRYPTED:U2FsdGVkX1+token

# SOCKS5 Proxy Configuration
ADO_PROXY_ENABLED=true
ADO_PROXY_HOST=socks-proxy.company.com
ADO_PROXY_PORT=1080
ADO_PROXY_PROTOCOL=socks5
ADO_PROXY_AUTH_REQUIRED=true
ADO_PROXY_USERNAME=socks_user
ADO_PROXY_PASSWORD=ENCRYPTED:U2FsdGVkX1+sockspass

# API Settings
ADO_API_TIMEOUT=45000
ADO_API_RETRY_COUNT=3
ADO_API_RETRY_DELAY=2000
```

#### ADO with Multiple Proxy Bypass
```properties
# Complex proxy configuration
DEFAULT_PROJECT=complex-proxy

# Azure DevOps
ADO_ENABLED=true
ADO_ORGANIZATION=enterprise
ADO_PROJECT=e2e-tests

# Proxy with extensive bypass list
ADO_PROXY_ENABLED=true
ADO_PROXY_HOST=gateway.company.com
ADO_PROXY_PORT=8888
ADO_PROXY_BYPASS_LIST=localhost;127.0.0.1;10.*;192.168.*;*.company.com;*.internal.net;azuredevops.local

# Different proxies for browser and ADO
BROWSER_PROXY_SERVER=http://browser-proxy.company.com:8080
ADO_PROXY_HOST=api-proxy.company.com
ADO_PROXY_PORT=8090

# Both use same authentication
BROWSER_PROXY_USERNAME=proxy_user
BROWSER_PROXY_PASSWORD=ENCRYPTED:U2FsdGVkX1+pass
ADO_PROXY_USERNAME=proxy_user
ADO_PROXY_PASSWORD=ENCRYPTED:U2FsdGVkX1+pass
```

### 1.12 Configuration Validation

#### Startup Validation (config/validation.env)
```properties
# Validation settings
VALIDATE_CONFIG_ON_START=true
REQUIRED_CONFIGS=BASE_URL;PROJECT;ENVIRONMENT
FAIL_ON_MISSING_CONFIG=true
WARN_ON_DEPRECATED_CONFIG=true

# Validation rules in env format
VALIDATION_TIMEOUT_MIN=1000
VALIDATION_TIMEOUT_MAX=300000
VALIDATION_WORKERS_MIN=1
VALIDATION_WORKERS_MAX=16
VALIDATION_BROWSER_VALUES=chrome;firefox;webkit;edge
VALIDATION_LOG_LEVEL_VALUES=debug;info;warn;error

# Type validations
VALIDATION_NUMERIC_FIELDS=TIMEOUT;WORKERS;PORT;RETRY_COUNT
VALIDATION_BOOLEAN_FIELDS=HEADLESS;DEBUG_MODE;PARALLEL
VALIDATION_REQUIRED_FIELDS=PROJECT;ENVIRONMENT;BASE_URL
```

### 1.13 Conditional Component Loading
```properties
# Component flags - only load what's needed
BROWSER_REQUIRED=true      # Skip if API-only tests
API_CLIENT_REQUIRED=false  # Skip if UI-only tests
DATABASE_REQUIRED=false    # Skip if no DB tests
REPORTING_REQUIRED=true    # Always needed
AI_REQUIRED=false          # Skip if not using AI features
ADO_REQUIRED=false         # Skip if not using Azure DevOps

# Module loading based on features
LOAD_UI_MODULES={features:contains:ui?true|false}
LOAD_API_MODULES={features:contains:api?true|false}
LOAD_DB_MODULES={features:contains:database?true|false}
```

### 1.14 Best Practices

#### Configuration Guidelines
1. **Never hardcode values** - Everything in config files
2. **Use interpolation** - Avoid duplication
3. **Layer configurations** - Global → Project → Environment
4. **Encrypt sensitive data** - Use ENCRYPTED: prefix
5. **Version control configs** - Except sensitive data
6. **Document all settings** - Include descriptions
7. **Provide sensible defaults** - Work out of the box
8. **Validate on startup** - Fail fast on bad config

#### Performance Guidelines
1. **Enable selective loading** - Load only what's needed
2. **Use transpile-only** - Skip type checking in runtime
3. **Cache everything** - Compiled TS, configurations, steps
4. **Parallelize initialization** - Start everything at once
5. **Lazy load modules** - Defer until actually needed
6. **Minimize dependencies** - Audit and remove unused

#### Security Best Practices
```properties
# Encrypted values
PASSWORD=ENCRYPTED:x7f8d9s8f7d9f8
API_KEY=ENCRYPTED:b9g8e0t9g8e0

# Masked in logs
SENSITIVE_FIELDS=password,apiKey,token,secret

# Environment-specific secrets
SECRETS_FILE={environment:prod?/vault/prod.enc|./config/dev.enc}
```

### 1.15 RESULT

With this configuration system:
- **Zero hardcoding** - Everything configurable via properties files
- **Smart defaults** - Works with just `npm run test`
- **Lightning fast** - < 1 second startup with selective loading
- **Flexible** - Override anything via CLI or config files
- **Scalable** - From single test to full regression suite
- **Maintainable** - Clear configuration hierarchy
- **Secure** - Encrypted sensitive data
- **Optimized** - Only loads what's needed for execution

## 2. CONFIGURATION MANAGER (CSConfigurationManager)

### 2.1 Hierarchical Configuration Loading
```
Priority Order (highest to lowest):
1. config/{project}/environments/{env}.env
2. config/{project}/common/common.env  
3. config/common/common.env
4. config/global.env

Example:
PROJECT=akhan ENV=dev npm run test
Loads in order:
→ config/akhan/environments/dev.env (overrides all)
→ config/akhan/common/common.env (overrides global)
→ config/common/common.env (overrides global)
→ config/global.env (base configuration)
```

### 2.2 Variable Interpolation
```
config file:
PROJECT=akhan
ENVIRONMENT=dev
REGION=americas
BASE_URL=http://{PROJECT}.{ENVIRONMENT}.{REGION}.inet.net
API_URL={BASE_URL}/api/v1
DB_HOST={PROJECT}-{ENVIRONMENT}-db.{REGION}.cloud.com

Result after interpolation:
BASE_URL=http://akhan.dev.americas.inet.net
API_URL=http://akhan.dev.americas.inet.net/api/v1
DB_HOST=akhan-dev-db.americas.cloud.com
```

### 2.3 Nested Variable Substitution
```
config:
USER_PREFIX=test
RANDOM_ID=<random>
USERNAME={USER_PREFIX}_user_{RANDOM_ID}
EMAIL={USERNAME}@{DOMAIN}
DOMAIN=company.com

Result:
USERNAME=test_user_8234
EMAIL=test_user_8234@company.com
```

### 2.4 Environment Variable Substitution
```
config:
API_KEY=${API_KEY}
DB_PASSWORD=${DB_PASS:-defaultpass}
LOG_LEVEL=${LOG_LEVEL:-info}

If environment has API_KEY=abc123:
→ API_KEY=abc123

If DB_PASS not set:
→ DB_PASSWORD=defaultpass
```

### 2.5 Encryption/Decryption
```
Storing encrypted password:
CSConfigurationManager.encrypt("MySecretPass123")
→ Returns: "ENCRYPTED:U2FsdGVkX1+x7f8d9s8f7d9f8s7d9f8"

In config file:
PASSWORD=ENCRYPTED:U2FsdGVkX1+x7f8d9s8f7d9f8s7d9f8

At runtime:
CSConfigurationManager.get("PASSWORD")
→ Automatically decrypts to: "MySecretPass123"
→ Logs show: "PASSWORD: ****"
```

### 2.6 Dynamic Configuration
```
Runtime override:
CSConfigurationManager.set("TIMEOUT", "60000")
→ Overrides config file value

Conditional config:
if (ENV === 'prod') {
  CSConfigurationManager.set("LOG_LEVEL", "error")
}
```

### 2.7 Configuration Validation
```
CSConfigurationManager.validate({
  required: ["BASE_URL", "API_KEY", "DB_HOST"],
  types: {
    "TIMEOUT": "number",
    "RETRY_COUNT": "number",
    "ENABLE_DEBUG": "boolean"
  }
})

Missing API_KEY → Error: "Required config API_KEY not found"
TIMEOUT="abc" → Error: "TIMEOUT must be a number"
```

## 3. ELEMENT MANAGEMENT (CSWebElement & CSElementResolver)

### 2.1 CSWebElement - All Locator Strategies
```
// CSS Selector with alternatives
@CSElement(
  css: '#submit-btn',
  description: 'Submit button for login form',
  aiEnabled: true,
  alternativeLocators: [
    'css:.submit-button',
    'xpath://button[@type="submit"]',
    'text:Submit',
    'role:button[name="submit"]'
  ],
  waitForVisible: true,
  timeout: 10000
)

// XPath with full options
@CSElement(
  xpath: '//button[@type="submit"]',
  description: 'Submit button using xpath',
  aiEnabled: true,
  alternativeLocators: ['css:#submit', 'text:Submit'],
  iframe: 'iframe#loginFrame',
  shadowRoot: true
)

// ID selector with healing
@CSElement(
  id: 'loginButton',
  description: 'Main login button',
  aiEnabled: true,
  aiDescription: 'Blue login button at bottom of form',
  alternativeLocators: ['css:.login-btn', 'xpath://button[contains(text(),"Login")]']
)

// Text selector with filters
@CSElement(
  text: 'Sign In',
  description: 'Sign in button',
  hasClass: 'primary-button',
  hasNotClass: 'disabled',
  alternativeLocators: ['text:Log In', 'text:Login']
)

// Role selector
@CSElement(
  role: 'button[name="submit"]',
  description: 'Submit button by role',
  alternativeLocators: ['css:[role="button"]']
)

// Test ID selector
@CSElement(
  testId: 'submit-button',
  description: 'Submit button by test id',
  alternativeLocators: ['css:[data-testid="submit-button"]']
)

// Label selector
@CSElement(
  label: 'Username',
  description: 'Username input field',
  alternativeLocators: ['css:input[aria-label="Username"]']
)

// Placeholder selector
@CSElement(
  placeholder: 'Enter your email',
  description: 'Email input field',
  alternativeLocators: ['css:[placeholder*="email"]']
)

// Alt text selector
@CSElement(
  alt: 'Company Logo',
  description: 'Company logo image',
  alternativeLocators: ['css:img.logo']
)

// Title selector
@CSElement(
  title: 'Click to submit',
  description: 'Submit button with title',
  alternativeLocators: ['css:[title*="submit"]']
)

// Multiple primary locators (uses first found)
@CSElement(
  css: '#submit-btn',
  xpath: '//button[@id="submit-btn"]',
  id: 'submit-btn',
  text: 'Submit',
  description: 'Submit button with multiple strategies',
  aiEnabled: true
)

// Complex selector with all options
@CSElement(
  css: 'button.submit',
  description: 'Complex submit button',
  aiEnabled: true,
  aiDescription: 'Blue submit button at bottom right of form',
  alternativeLocators: [
    'xpath://button[contains(@class,"submit")]',
    'text:Submit',
    'role:button[name="submit"]',
    'css:#submit-btn'
  ],
  iframe: 'iframe#paymentFrame',
  shadowRoot: false,
  nth: 0,
  hasText: 'Submit',
  hasNotText: 'Cancel',
  waitForVisible: true,
  waitForEnabled: true,
  timeout: 30000,
  retryCount: 3,
  screenshot: true
)
```

### Understanding Each Attribute - Complete Execution Flow

#### 1. **Primary Locator** (`css: 'button.submit'`)
- **Purpose**: Primary selector to find the element
- **Execution**: First attempts to find `<button class="submit">`
- **Example**: Finds `<button class="submit primary">Click Me</button>`

#### 2. **Description** (`description: 'Complex submit button'`)
- **Purpose**: Human-readable name in reports and logs
- **Usage**: All CSReporter messages use this description
- **Report Output**: "Clicking on: Complex submit button" instead of technical selector

#### 3. **AI Self-Healing** (`aiEnabled: true, aiDescription: 'Blue submit button...'`)
- **Purpose**: AI-based element recovery when all selectors fail
- **How it works**: 
  - All selectors fail → AI analyzes page visually
  - Uses description to find "blue button at bottom right"
  - Learns from successful identifications for future
- **Real Example**: Button ID changes from 'submit' to 'submit-btn', AI still finds it

#### 4. **Alternative Locators** (Fallback Strategy)
```
alternativeLocators: [
  'xpath://button[contains(@class,"submit")]',  // Try 1: Partial class match
  'text:Submit',                                 // Try 2: By text content
  'role:button[name="submit"]',                  // Try 3: By ARIA role
  'css:#submit-btn'                              // Try 4: By ID
]
```
- **Execution Order**: Primary fails → Try each alternative sequentially
- **Success Action**: Uses first working selector, logs which one worked
- **Report**: "Primary locator failed, used fallback: text:Submit"

#### 5. **IFrame Context** (`iframe: 'iframe#paymentFrame'`)
- **Purpose**: Element is inside an iframe
- **Execution Flow**:
  1. Switch to iframe with id="paymentFrame"
  2. Search for element inside iframe
  3. Perform action
  4. Switch back to main frame
- **Common Use**: Payment forms, third-party widgets

#### 6. **Shadow DOM** (`shadowRoot: false`)
- **true**: Penetrates shadow DOM boundaries
- **false**: Normal DOM traversal
- **Use Case**: Web components, custom elements

#### 7. **Index Selection** (`nth: 0`)
- **Purpose**: Select specific element from multiple matches
- **0**: First element, **1**: Second element, etc.
- **Example**: 5 submit buttons found, selects the first

#### 8. **Text Filters** (`hasText: 'Submit', hasNotText: 'Cancel'`)
- **Execution**: 
  1. Find all matching elements
  2. Keep only those containing "Submit"
  3. Remove any containing "Cancel"
- **Use Case**: Distinguish "Submit Order" from "Cancel Order"

#### 9. **Wait Strategies** (All Available Wait Options)
```typescript
waitForAttached: true,     // Wait for element to be attached to DOM
waitForDetached: true,     // Wait for element to be removed from DOM
waitForVisible: true,      // Wait for element to be visible
waitForHidden: true,       // Wait for element to be hidden
waitForEnabled: true,      // Wait for element to be enabled
waitForDisabled: true,     // Wait for element to be disabled
waitForEditable: true,     // Wait for element to be editable (input/textarea)
waitForChecked: true,      // Wait for checkbox/radio to be checked
waitForUnchecked: true,    // Wait for checkbox/radio to be unchecked
waitForStable: true,       // Wait for element position to be stable (not animating)
waitForFocused: true,      // Wait for element to have focus
waitForEmpty: true,        // Wait for element to be empty (no text/value)
waitForNotEmpty: true,     // Wait for element to have content
waitUntil: 'load',         // Wait for specific state: 'load' | 'domcontentloaded' | 'networkidle' | 'commit'
```

- **Purpose**: Additional explicit waits beyond Playwright's auto-wait
- **Execution Sequence**: Each wait is checked sequentially
- **Use Cases**: Handle specific timing requirements

#### 10. **Timeout** (`timeout: 30000`)
- **Purpose**: Maximum wait time in milliseconds
- **Polling**: Checks every 100ms until timeout
- **Use Case**: Slow loading pages, API-dependent elements

#### 11. **Retry Count** (`retryCount: 3`)
- **Execution Pattern**:
  - Attempt 1: Fails → Wait 1 second
  - Attempt 2: Fails → Wait 2 seconds  
  - Attempt 3: Fails → Wait 4 seconds
  - Attempt 4: Final try → Fail or succeed
- **Handles**: Network issues, timing problems

#### 12. **Screenshot** (`screenshot: true`)
- **When Captured**:
  - Before action (for comparison)
  - After successful action
  - On any failure (for debugging)
- **Storage**: Attached to HTML report automatically

### Complete Execution Example

```
User Action: submitButton.click()

Framework Execution:
────────────────────
Step 1: Context Switch
  → Check iframe: 'iframe#paymentFrame' exists
  → Switch to iframe context

Step 2: Element Location (with Playwright auto-wait)
  → Try css: 'button.submit' 
    ↳ Playwright auto-waits for: attached, visible, stable, enabled
    ↳ Not found after 500ms
  → Try xpath: '//button[contains(@class,"submit")]'
    ↳ Playwright auto-waits again
    ↳ Not found after 500ms
  → Try text: 'Submit'
    ↳ Playwright auto-waits
    ↳ Found 3 elements!

Step 3: Filtering
  → Apply hasText: 'Submit' → 2 elements remain
  → Apply hasNotText: 'Cancel' → 1 element remains
  → Apply nth: 0 → Select first element

Step 4: Additional Waits (beyond Playwright auto-wait)
  → waitForVisible: true → Wait extra 2 seconds for full visibility
  → waitForEnabled: true → Wait extra 0.5 seconds to ensure enabled

Step 5: Action Execution
  → CSReporter.info("Clicking on: Complex submit button")
  → Take screenshot (before)
  → Perform click
  → Take screenshot (after)
  → CSReporter.pass("Successfully clicked: Complex submit button")

Step 6: Cleanup
  → Switch back to main frame
  → Clear element cache

Total Time: 3.5 seconds
Result: Success
Report: "Complex submit button clicked (used fallback: text:Submit)"
```

### Playwright Auto-Wait vs Framework Explicit Waits

#### **Playwright Auto-Wait (Built-in)**
Playwright automatically waits for these conditions before any action:
```
1. Element is attached to DOM
2. Element is visible (not hidden)
3. Element is stable (not animating)
4. Element receives events (not covered)
5. Element is enabled (for input elements)
```

**When it triggers**: AUTOMATICALLY on every action (click, type, etc.)

#### **Framework Explicit Waits** (`waitForVisible`, `waitForEnabled`)
These are ADDITIONAL waits on top of Playwright's auto-wait:

```typescript
// Playwright auto-wait example
await page.click('#button');
// Waits for: attached → visible → stable → enabled → clicks

// CS Framework with explicit waits
@CSElement(
  css: '#button',
  waitForVisible: true,  // EXTRA wait after Playwright's auto-wait
  waitForEnabled: true   // EXTRA wait to be absolutely sure
)
```

#### **Why Both?**

**Scenario 1: Element with delayed visibility**
```html
<!-- Button exists but has opacity animation -->
<button style="opacity: 0; transition: opacity 3s;">Submit</button>
```
- Playwright auto-wait: Might consider it "visible" at opacity: 0.01
- Framework waitForVisible: Ensures full visibility (opacity: 1)

**Scenario 2: Element with delayed enable**
```javascript
// JavaScript enables button after API call
setTimeout(() => {
  button.disabled = false;
}, 2000);
```
- Playwright auto-wait: Sees button exists and visible
- Framework waitForEnabled: Waits additional time for disabled=false

**Scenario 3: Dynamic content**
```html
<!-- Content loads progressively -->
<div class="loading">Loading...</div>
<!-- After 2 seconds -->
<button>Submit</button>
```
- Playwright auto-wait: Standard waits
- Framework waits: Extra assurance for slow-loading content

### Best Practice Recommendations

| Attribute | When to Use | Example Scenario |
|-----------|-------------|------------------|
| **Basic locators** | Always start with these | Simple, stable elements |
| **alternativeLocators** | When UI changes frequently | Agile development |
| **aiEnabled** | When selectors break often | Legacy applications |
| **iframe** | Element in iframe | Payment forms |
| **waitForVisible** | Animations/transitions | Fade-in elements |
| **waitForEnabled** | Dynamic enabling | After validation |
| **timeout** | Slow pages | API-dependent UI |
| **retryCount** | Flaky elements | Network-dependent |
| **screenshot** | Critical actions | Payment, submission |

### Complete Wait Options Reference

#### **Wait for State Changes**

| Wait Option | When to Use | Example Scenario |
|------------|-------------|------------------|
| **waitForAttached** | Element dynamically added to DOM | `<div>` added via JavaScript after API call |
| **waitForDetached** | Element removed from DOM | Loading spinner disappears after data loads |
| **waitForVisible** | Element becomes visible | Modal fade-in animation completes |
| **waitForHidden** | Element becomes hidden | Error message auto-hides after 3 seconds |
| **waitForStable** | Element stops moving/animating | Sliding panel finishes animation |

#### **Wait for Interaction States**

| Wait Option | When to Use | Example Scenario |
|------------|-------------|------------------|
| **waitForEnabled** | Element becomes clickable | Submit button enables after form validation |
| **waitForDisabled** | Element becomes disabled | Button disables during processing |
| **waitForEditable** | Input becomes editable | Field unlocks after previous field filled |
| **waitForFocused** | Element gains focus | Auto-focus on error field |

#### **Wait for Checkbox/Radio States**

| Wait Option | When to Use | Example Scenario |
|------------|-------------|------------------|
| **waitForChecked** | Checkbox/radio gets checked | Terms accepted automatically |
| **waitForUnchecked** | Checkbox/radio gets unchecked | Option deselected by JavaScript |

#### **Wait for Content States**

| Wait Option | When to Use | Example Scenario |
|------------|-------------|------------------|
| **waitForEmpty** | Field/element becomes empty | Search field auto-clears |
| **waitForNotEmpty** | Field/element gets content | Results populate after search |

#### **Wait for Page States**

| Wait Option | When to Use | Example Scenario |
|------------|-------------|------------------|
| **waitUntil: 'load'** | Full page load | Initial page navigation |
| **waitUntil: 'domcontentloaded'** | DOM ready | Fast interaction needed |
| **waitUntil: 'networkidle'** | No network activity | SPA finished loading data |
| **waitUntil: 'commit'** | Navigation started | URL change detection |

### Real-World Wait Combinations

#### Example 1: Dynamic Form Field
```typescript
@CSElement(
  css: '#dynamicField',
  waitForAttached: true,    // Wait for field to be added to DOM
  waitForVisible: true,     // Wait for field to be visible
  waitForEnabled: true,     // Wait for field to be enabled
  waitForEditable: true,    // Wait for field to be editable
  timeout: 10000
)
```
**Use Case**: Field that appears after selecting an option, then animates in, then becomes editable

#### Example 2: Loading Spinner Pattern
```typescript
@CSElement(
  css: '.loading-spinner',
  waitForVisible: true,     // Wait for spinner to appear
  waitForDetached: true,    // Wait for spinner to be removed
  timeout: 30000
)
```
**Use Case**: Wait for loading to start and complete

#### Example 3: Auto-Save Indicator
```typescript
@CSElement(
  css: '.save-status',
  waitForNotEmpty: true,    // Wait for status text
  hasText: 'Saved',         // Ensure it says "Saved"
  waitForStable: true,      // Wait for animation to finish
  timeout: 5000
)
```
**Use Case**: Confirm auto-save completed

#### Example 4: Terms and Conditions
```typescript
@CSElement(
  css: '#termsCheckbox',
  waitForEnabled: true,     // Wait for checkbox to be clickable
  waitForChecked: true,     // Verify it's checked after click
  screenshot: true          // Evidence of acceptance
)
```
**Use Case**: Ensure terms accepted before proceeding

### Summary
The framework's explicit waits work IN ADDITION to Playwright's auto-wait, providing extra safety for complex scenarios. Think of it as:
- **Playwright auto-wait**: Basic safety net (always on)
- **Framework explicit waits**: Extra insurance for specific cases (configurable)
- **Multiple waits**: Can combine multiple wait conditions for complex scenarios

### 2.2 CSElements - Multiple Element Resolution

#### When You Need ALL Matching Elements

```typescript
// Single element - returns one CSWebElement
@CSElement(
  css: '.product-card',
  nth: 0  // Gets first element only
)
private productCard: CSWebElement;

// Multiple elements - returns array of CSWebElement
@CSElements(
  css: '.product-card',
  description: 'All product cards on page'
)
private productCards: CSWebElement[];

// Multiple elements with filters
@CSElements(
  css: 'button',
  hasClass: 'action-button',
  hasNotClass: 'disabled',
  description: 'All enabled action buttons'
)
private actionButtons: CSWebElement[];
```

#### Working with Multiple Elements

```typescript
// Example 1: Iterate through all elements
@CSElements(css: '.search-result')
private searchResults: CSWebElement[];

async validateAllResults() {
  CSReporter.info(`Found ${this.searchResults.length} search results`);
  
  for (let i = 0; i < this.searchResults.length; i++) {
    const result = this.searchResults[i];
    await result.assertVisible();
    CSReporter.pass(`Search result ${i + 1} is visible`);
  }
}

// Example 2: Get specific element from collection
async clickThirdResult() {
  if (this.searchResults.length >= 3) {
    await this.searchResults[2].click(); // 0-indexed
    CSReporter.pass("Clicked third search result");
  } else {
    CSReporter.fail("Less than 3 results found");
  }
}

// Example 3: Filter and interact
@CSElements(css: '.checkbox')
private checkboxes: CSWebElement[];

async selectAllCheckboxes() {
  for (const checkbox of this.checkboxes) {
    const isChecked = await checkbox.isChecked();
    if (!isChecked) {
      await checkbox.check();
    }
  }
  CSReporter.pass(`Selected all ${this.checkboxes.length} checkboxes`);
}

// Example 4: Count validation
async validateProductCount(expected: number) {
  const actual = this.productCards.length;
  if (actual === expected) {
    CSReporter.pass(`Found expected ${expected} products`);
  } else {
    CSReporter.fail(`Expected ${expected} products, found ${actual}`);
  }
}
```

#### Advanced Multiple Element Patterns

```typescript
// Pattern 1: Dynamic element collection with wait
@CSElements(
  css: '.notification',
  waitForAttached: true,
  timeout: 5000
)
private notifications: CSWebElement[];

async dismissAllNotifications() {
  // Wait for notifications to appear
  await this.waitForElements(this.notifications, { minimum: 1 });
  
  // Dismiss each notification
  for (const notification of this.notifications) {
    const closeButton = notification.find('.close-button');
    await closeButton.click();
    await notification.waitForDetached();
  }
}

// Pattern 2: Table rows handling
@CSElements(css: 'table tbody tr')
private tableRows: CSWebElement[];

async getRowData(): Promise<string[][]> {
  const data: string[][] = [];
  
  for (const row of this.tableRows) {
    const cells = await row.findAll('td');
    const rowData = await Promise.all(
      cells.map(cell => cell.innerText())
    );
    data.push(rowData);
  }
  
  CSReporter.info(`Extracted data from ${data.length} rows`);
  return data;
}

// Pattern 3: Conditional element arrays
@CSElements(
  css: '.menu-item',
  hasNotClass: 'hidden',
  waitForVisible: true
)
private visibleMenuItems: CSWebElement[];

async selectMenuItem(text: string) {
  for (const item of this.visibleMenuItems) {
    const itemText = await item.innerText();
    if (itemText === text) {
      await item.click();
      CSReporter.pass(`Clicked menu item: ${text}`);
      return;
    }
  }
  CSReporter.fail(`Menu item not found: ${text}`);
}
```

#### CSElements vs CSElement Comparison

| Feature | @CSElement (Singular) | @CSElements (Plural) |
|---------|----------------------|---------------------|
| **Returns** | Single CSWebElement | Array of CSWebElement |
| **Use Case** | One specific element | All matching elements |
| **nth attribute** | Selects which one | Not applicable (returns all) |
| **Count validation** | Not applicable | Can validate count |
| **Iteration** | Not needed | Can iterate through all |
| **Index access** | Not needed | array[index] access |

#### Real-World Examples

```typescript
// Example 1: Product listing page
@CSElements(
  css: '.product-card',
  waitForAttached: true,
  hasNotClass: 'out-of-stock'
)
private availableProducts: CSWebElement[];

async addAllToCart() {
  CSReporter.info(`Adding ${this.availableProducts.length} products to cart`);
  
  for (const product of this.availableProducts) {
    const addButton = await product.find('.add-to-cart');
    await addButton.click();
    await addButton.waitForText('Added');
  }
  
  CSReporter.pass(`Added all ${this.availableProducts.length} products to cart`);
}

// Example 2: Form validation errors
@CSElements(
  css: '.error-message',
  waitForVisible: true
)
private errorMessages: CSWebElement[];

async getValidationErrors(): Promise<string[]> {
  const errors: string[] = [];
  
  for (const errorElement of this.errorMessages) {
    const text = await errorElement.innerText();
    errors.push(text);
  }
  
  if (errors.length > 0) {
    CSReporter.warn(`Found ${errors.length} validation errors: ${errors.join(', ')}`);
  }
  
  return errors;
}

// Example 3: Dynamic content loading
@CSElements(
  css: '.comment',
  waitForAttached: true,
  timeout: 10000
)
private comments: CSWebElement[];

async waitForComments(minCount: number) {
  const startTime = Date.now();
  
  while (this.comments.length < minCount) {
    if (Date.now() - startTime > 10000) {
      CSReporter.fail(`Timeout waiting for ${minCount} comments, found ${this.comments.length}`);
      break;
    }
    await this.page.waitForTimeout(500);
    await this.refreshElements(); // Refresh the collection
  }
  
  CSReporter.pass(`Found ${this.comments.length} comments`);
}
```

#### Best Practices for Multiple Elements

1. **Always check length before accessing by index**
```typescript
if (this.elements.length > index) {
  await this.elements[index].click();
}
```

2. **Use descriptive names for element arrays**
```typescript
@CSElements(css: '.result')
private searchResults: CSWebElement[];  // Good
private elements: CSWebElement[];       // Bad
```

3. **Add count validation where expected**
```typescript
if (this.products.length === 0) {
  CSReporter.warn("No products found on page");
  return;
}
```

4. **Handle dynamic collections**
```typescript
// Elements may be added/removed dynamically
async refreshElements() {
  this.comments = await this.page.findAll('.comment');
}
```

### 2.3 Dynamic Element Creation During Execution

#### Creating Elements at Runtime (Not Using @CSElement Decorator)

Sometimes you need to create elements dynamically during test execution based on runtime values. The framework supports multiple ways to create CSWebElement instances programmatically.

#### Method 1: Direct CSWebElement Construction

```typescript
// Without parameters - simple element
async clickDynamicButton() {
  const button = new CSWebElement({
    css: '#dynamic-button',
    description: 'Dynamically created button'
  });
  await button.click();
}

// With parameters - using runtime values
async selectTableCell(row: number, column: number) {
  const cell = new CSWebElement({
    css: `table tr:nth-child(${row}) td:nth-child(${column})`,
    description: `Table cell at row ${row}, column ${column}`,
    waitForVisible: true
  });
  
  await cell.click();
  CSReporter.pass(`Clicked cell [${row}, ${column}]`);
}

// Dynamic XPath with parameters
async clickButtonByText(buttonText: string) {
  const button = new CSWebElement({
    xpath: `//button[contains(text(), '${buttonText}')]`,
    description: `Button with text: ${buttonText}`,
    timeout: 5000
  });
  
  await button.click();
}
```

#### Method 2: Factory Pattern for Dynamic Elements

```typescript
export class DynamicElementFactory {
  
  // Create element without parameters
  static createButton(id: string): CSWebElement {
    return new CSWebElement({
      css: `#${id}`,
      description: `Button ${id}`,
      waitForEnabled: true
    });
  }
  
  // Create element with multiple parameters
  static createTableCell(row: number, col: number, tableId?: string): CSWebElement {
    const selector = tableId 
      ? `#${tableId} tr:nth-child(${row}) td:nth-child(${col})`
      : `table tr:nth-child(${row}) td:nth-child(${col})`;
      
    return new CSWebElement({
      css: selector,
      description: `Cell [${row},${col}]`,
      waitForVisible: true,
      screenshot: true
    });
  }
  
  // Create form input by label
  static createInputByLabel(labelText: string): CSWebElement {
    return new CSWebElement({
      xpath: `//label[contains(text(), '${labelText}')]/following-sibling::input[1]`,
      description: `Input for label: ${labelText}`,
      waitForEditable: true
    });
  }
  
  // Create element with dynamic attributes
  static createElementByAttribute(tag: string, attribute: string, value: string): CSWebElement {
    return new CSWebElement({
      css: `${tag}[${attribute}="${value}"]`,
      description: `${tag} with ${attribute}="${value}"`,
      alternativeLocators: [
        `xpath://${tag}[@${attribute}="${value}"]`,
        `css:${tag}[${attribute}*="${value}"]`
      ]
    });
  }
}

// Usage
async fillDynamicForm(fieldLabels: string[]) {
  for (const label of fieldLabels) {
    const input = DynamicElementFactory.createInputByLabel(label);
    await input.type(`Value for ${label}`);
  }
}
```

#### Method 3: Dynamic Collection Creation

```typescript
// Create multiple elements dynamically
async selectMultipleCheckboxes(checkboxIds: string[]) {
  const checkboxes: CSWebElement[] = checkboxIds.map(id => 
    new CSWebElement({
      css: `#${id}`,
      description: `Checkbox ${id}`,
      waitForEnabled: true
    })
  );
  
  for (const checkbox of checkboxes) {
    await checkbox.check();
  }
  
  CSReporter.pass(`Selected ${checkboxes.length} checkboxes`);
}

// Create elements from data structure
async fillTableData(data: {row: number, col: number, value: string}[]) {
  for (const cell of data) {
    const element = new CSWebElement({
      css: `tr:nth-child(${cell.row}) td:nth-child(${cell.col}) input`,
      description: `Input at [${cell.row}, ${cell.col}]`
    });
    
    await element.fill(cell.value);
  }
}
```

#### Method 4: Builder Pattern for Complex Elements

```typescript
export class CSElementBuilder {
  private config: any = {};
  
  constructor(selector: string) {
    this.config.css = selector;
  }
  
  withDescription(desc: string): this {
    this.config.description = desc;
    return this;
  }
  
  withTimeout(ms: number): this {
    this.config.timeout = ms;
    return this;
  }
  
  withWaitFor(...waits: string[]): this {
    waits.forEach(wait => {
      this.config[`waitFor${wait}`] = true;
    });
    return this;
  }
  
  withAlternatives(...selectors: string[]): this {
    this.config.alternativeLocators = selectors;
    return this;
  }
  
  inIframe(iframe: string): this {
    this.config.iframe = iframe;
    return this;
  }
  
  build(): CSWebElement {
    return new CSWebElement(this.config);
  }
}

// Usage - Fluent interface
async clickComplexElement() {
  const element = new CSElementBuilder('#submit')
    .withDescription('Submit button in payment form')
    .withTimeout(10000)
    .withWaitFor('Visible', 'Enabled')
    .withAlternatives('text:Submit', 'xpath://button[@type="submit"]')
    .inIframe('#paymentFrame')
    .build();
    
  await element.click();
}
```

#### Real-World Dynamic Element Examples

##### Example 1: Dynamic Table Operations
```typescript
export class DynamicTable {
  private tableSelector: string;
  
  constructor(tableSelector: string = 'table') {
    this.tableSelector = tableSelector;
  }
  
  // Get cell element dynamically
  getCell(row: number, col: number): CSWebElement {
    return new CSWebElement({
      css: `${this.tableSelector} tbody tr:nth-child(${row}) td:nth-child(${col})`,
      description: `Cell [${row}, ${col}]`,
      waitForVisible: true
    });
  }
  
  // Get row element
  getRow(index: number): CSWebElement {
    return new CSWebElement({
      css: `${this.tableSelector} tbody tr:nth-child(${index})`,
      description: `Row ${index}`
    });
  }
  
  // Get cell by header name
  async getCellByHeader(row: number, headerName: string): Promise<CSWebElement> {
    // First find column index
    const headers = new CSWebElement({
      css: `${this.tableSelector} thead th`,
      description: 'Table headers'
    });
    
    const headerTexts = await headers.getAllTexts();
    const colIndex = headerTexts.indexOf(headerName) + 1;
    
    if (colIndex === 0) {
      throw new Error(`Header "${headerName}" not found`);
    }
    
    return this.getCell(row, colIndex);
  }
  
  // Click cell with value
  async clickCellWithValue(value: string): Promise<void> {
    const cell = new CSWebElement({
      xpath: `${this.tableSelector}//td[contains(text(), '${value}')]`,
      description: `Cell containing: ${value}`,
      waitForVisible: true
    });
    
    await cell.click();
    CSReporter.pass(`Clicked cell with value: ${value}`);
  }
}

// Usage
const table = new DynamicTable('#dataTable');
const cell = table.getCell(3, 5);
await cell.click();

const nameCell = await table.getCellByHeader(2, 'Name');
await nameCell.type('John Doe');
```

##### Example 2: Dynamic Form Fields
```typescript
export class DynamicForm {
  
  // Create input by dynamic ID
  static getInput(fieldId: string): CSWebElement {
    return new CSWebElement({
      css: `#${fieldId}`,
      description: `Input field: ${fieldId}`,
      waitForEditable: true,
      clearBeforeType: true
    });
  }
  
  // Create input by dynamic name
  static getInputByName(name: string): CSWebElement {
    return new CSWebElement({
      css: `input[name="${name}"]`,
      description: `Input with name: ${name}`,
      alternativeLocators: [`xpath://input[@name="${name}"]`]
    });
  }
  
  // Get field by label (handles various label implementations)
  static getFieldByLabel(labelText: string): CSWebElement {
    return new CSWebElement({
      xpath: `//label[contains(text(), '${labelText}')]/..//input | //input[@aria-label='${labelText}']`,
      description: `Field for label: ${labelText}`,
      waitForVisible: true
    });
  }
  
  // Dynamic dropdown selection
  static getDropdownOption(dropdownId: string, optionText: string): CSWebElement {
    return new CSWebElement({
      xpath: `//select[@id='${dropdownId}']/option[text()='${optionText}']`,
      description: `Option "${optionText}" in dropdown ${dropdownId}`,
      alternativeLocators: [
        `css:#${dropdownId} option:contains("${optionText}")`,
        `xpath://select[@id='${dropdownId}']/option[contains(text(), '${optionText}')]`
      ]
    });
  }
}

// Usage
async fillDynamicForm(formData: Record<string, string>) {
  for (const [fieldName, value] of Object.entries(formData)) {
    const input = DynamicForm.getInputByName(fieldName);
    await input.fill(value);
    CSReporter.info(`Filled ${fieldName} with ${value}`);
  }
}
```

##### Example 3: Dynamic List Items
```typescript
export class DynamicList {
  
  // Get list item by index
  static getItemByIndex(listSelector: string, index: number): CSWebElement {
    return new CSWebElement({
      css: `${listSelector} li:nth-child(${index})`,
      description: `List item ${index}`,
      waitForVisible: true
    });
  }
  
  // Get list item by text
  static getItemByText(listSelector: string, text: string): CSWebElement {
    return new CSWebElement({
      xpath: `${listSelector}//li[contains(text(), '${text}')]`,
      description: `List item with text: ${text}`,
      scrollIntoView: true
    });
  }
  
  // Get all items matching condition
  static getItemsWithClass(listSelector: string, className: string): CSWebElement[] {
    // This would normally query DOM and return array
    return []; // Placeholder
  }
  
  // Create checkbox in list item
  static getListItemCheckbox(listSelector: string, itemText: string): CSWebElement {
    return new CSWebElement({
      xpath: `${listSelector}//li[contains(text(), '${itemText}')]//input[@type='checkbox']`,
      description: `Checkbox for item: ${itemText}`,
      waitForEnabled: true
    });
  }
}

// Usage
async selectListItems(items: string[]) {
  for (const item of items) {
    const checkbox = DynamicList.getListItemCheckbox('#todoList', item);
    await checkbox.check();
  }
}
```

##### Example 4: Dynamic Navigation Menu
```typescript
export class DynamicMenu {
  
  // Navigate through multi-level menu
  static async navigateToMenuItem(...menuPath: string[]): Promise<void> {
    for (let i = 0; i < menuPath.length; i++) {
      const isLast = i === menuPath.length - 1;
      const menuItem = new CSWebElement({
        xpath: `//nav//a[contains(text(), '${menuPath[i]}')]`,
        description: `Menu item: ${menuPath[i]}`,
        waitForVisible: true,
        hoverBeforeClick: !isLast // Hover on parent items
      });
      
      if (isLast) {
        await menuItem.click();
        CSReporter.pass(`Navigated to: ${menuPath.join(' > ')}`);
      } else {
        await menuItem.hover();
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for submenu
      }
    }
  }
  
  // Create breadcrumb element
  static getBreadcrumbItem(index: number): CSWebElement {
    return new CSWebElement({
      css: `.breadcrumb li:nth-child(${index}) a`,
      description: `Breadcrumb item ${index}`,
      waitForVisible: true
    });
  }
}

// Usage
await DynamicMenu.navigateToMenuItem('Products', 'Electronics', 'Laptops');
```

#### Best Practices for Dynamic Elements

1. **Always provide meaningful descriptions**
```typescript
// Good
new CSWebElement({
  css: `#row-${id}`,
  description: `Data row for user ID: ${id}`
})

// Bad
new CSWebElement({css: `#row-${id}`})
```

2. **Include fallback selectors for dynamic elements**
```typescript
new CSWebElement({
  css: `#dynamic-${id}`,
  alternativeLocators: [
    `xpath://div[@data-id="${id}"]`,
    `css:[data-testid="item-${id}"]`
  ]
})
```

3. **Add appropriate waits for dynamic content**
```typescript
new CSWebElement({
  css: `.dynamic-content`,
  waitForAttached: true,
  waitForVisible: true,
  waitForStable: true
})
```

4. **Use factory/builder patterns for complex scenarios**
```typescript
const element = ElementFactory.createForScenario(scenario, params);
```

### 2.4 CSWebElement - Advanced Locators
```
// Relative locators
@CSElement({
  locatorType: 'css',
  locatorValue: '#username',
  relative: {
    above: '#password',
    toRightOf: '.label',
    near: '#submit',
    below: '.header'
  }
})

// IFrame elements
@CSElement({
  locatorType: 'css',
  locatorValue: '#submit',
  iframe: 'iframe#paymentFrame'
})

// Shadow DOM
@CSElement({
  locatorType: 'css',
  locatorValue: '#innerButton',
  shadowRoot: true
})

// Nth element
@CSElement({
  locatorType: 'css',
  locatorValue: '.item',
  nth: 3  // Gets 4th element (0-indexed)
})

// With filters
@CSElement({
  locatorType: 'css',
  locatorValue: 'button',
  hasText: 'Submit',
  hasNotText: 'Cancel'
})
```

### 2.3 CSWebElement - All Playwright Methods with CSReporter Integration

#### Click Methods (All with automatic CSReporter logging)
```
// Simple click
element.click()
→ CSReporter.info("Clicking on: Submit button")
→ Clicks element
→ CSReporter.pass("Successfully clicked: Submit button")
→ On failure: CSReporter.fail("Failed to click Submit button", error, screenshot)

// Right click with reporting
element.clickWithButton('right')
→ CSReporter.info("Right-clicking on: Submit button")
→ Performs right click
→ CSReporter.pass("Right-clicked successfully")

// Click with modifiers and reporting
element.clickWithModifiers(['Control', 'Shift'])
→ CSReporter.info("Clicking with Ctrl+Shift on: Submit button")
→ Performs modified click
→ CSReporter.pass("Modified click successful")

// All methods include CSReporter integration:
element.clickWithPosition({x: 100, y: 50}) // Reports position click
element.clickWithDelay(500) // Reports delayed click
element.clickWithClickCount(2) // Reports double click
element.clickWithClickCount(3) // Reports triple click
element.clickWithForce() // Reports forced click
element.clickWithNoWaitAfter() // Reports no-wait click
element.clickWithTimeout(5000) // Reports timeout used
element.clickWithTrial() // Reports trial run
```

#### Type/Fill Methods
```
element.type("text") // Types character by character
element.typeWithDelay("text", 100) // 100ms between keystrokes
element.fill("text") // Instant fill
element.fillWithForce("text") // Force fill
element.clearAndType("text") // Clear then type
element.clearAndFill("text") // Clear then fill
element.pressSequentially("text", 50) // Type with delay
element.selectText() // Select all text
element.clear() // Clear field
```

#### Keyboard Methods
```
element.press("Enter") // Single key
element.press("Control+A") // Key combination
element.pressWithDelay("Tab", 500) // With delay
element.type("Hello", {delay: 100}) // Type with delay
element.down("Shift") // Key down
element.up("Shift") // Key up
```

#### Mouse Methods
```
element.hover() // Basic hover
element.hoverWithPosition({x: 10, y: 10}) // Hover at position
element.hoverWithModifiers(['Control']) // Hover with keys
element.hoverWithForce() // Force hover
element.hoverWithTimeout(5000) // Custom timeout
```

#### Drag Methods
```
element.dragTo(target) // Drag to element
element.dragToWithSteps(target, 5) // With 5 intermediate steps
element.dragToPosition({x: 200, y: 100}) // Drag to coordinates
element.dragWithData(target, {files: ['file.txt']}) // With data transfer
```

#### Focus Methods
```
element.focus() // Set focus
element.focusWithTimeout(5000) // With timeout
element.blur() // Remove focus
element.tap() // Mobile tap
element.tapWithPosition({x: 50, y: 50}) // Tap at position
```

#### Scroll Methods
```
element.scrollIntoView() // Scroll to element
element.scrollIntoViewIfNeeded() // Only if not visible
element.scrollToBottom() // Scroll container to bottom
element.scrollToTop() // Scroll container to top
element.scrollBy(0, 100) // Scroll by amount
```

#### Select Methods
```
element.selectOption("value") // Select by value
element.selectOptionByLabel("Label") // Select by label
element.selectOptionByIndex(2) // Select by index
element.selectMultipleOptions(["val1", "val2"]) // Multi-select
element.deselectAll() // Deselect all options
```

#### Check Methods
```
element.check() // Check checkbox/radio
element.checkWithForce() // Force check
element.checkWithTimeout(5000) // With timeout
element.uncheck() // Uncheck
element.uncheckWithForce() // Force uncheck
element.setChecked(true) // Set checked state
element.toggle() // Toggle checked state
```

#### Upload Methods
```
element.setInputFiles("file.pdf") // Single file
element.setInputFiles(["file1.pdf", "file2.jpg"]) // Multiple files
element.setInputFilesWithTimeout(["file.pdf"], 10000) // With timeout
element.clearInputFiles() // Clear selected files
```

#### Screenshot Methods
```
element.screenshot() // Element screenshot
element.screenshotWithPath("element.png") // Save to file
element.screenshotWithFullPage() // Include full page
element.screenshotWithClip({x: 0, y: 0, width: 100, height: 100}) // Specific area
element.screenshotWithQuality(80) // JPEG quality
element.screenshotWithOmitBackground() // Transparent background
```

### 2.4 CSElementResolver - Element Resolution
```
// Basic resolution
resolver.resolve("#submit-btn")
→ Returns: Playwright Locator

// With fallbacks
resolver.resolveWithFallbacks([
  {type: 'id', value: 'submit'},
  {type: 'css', value: '.submit-btn'},
  {type: 'text', value: 'Submit'}
])
→ Tries each until found

// AI-powered resolution
resolver.resolveWithAI("blue submit button at bottom")
→ Uses AI to find element

// Smart resolution with healing
resolver.resolveSmartly({
  primary: '#old-id',
  description: 'Submit button',
  fallbacks: ['text=Submit', '.btn-primary']
})
→ Self-heals if primary fails
```

## 4. PAGE OBJECT FRAMEWORK

### 3.1 CSBasePage - Complete Methods

#### Navigation Methods
```
page.goto(url) // Navigate to URL
page.gotoWithWaitUntil(url, 'load') // Wait for load event
page.gotoWithWaitUntil(url, 'domcontentloaded') // Wait for DOM
page.gotoWithWaitUntil(url, 'networkidle') // Wait for network idle
page.gotoWithTimeout(url, 60000) // 60 second timeout
page.gotoWithReferer(url, 'https://google.com') // With referer

page.reload() // Reload page
page.reloadWithBypassCache() // Hard reload
page.reloadWithWaitUntil('networkidle') // Reload and wait

page.goBack() // Navigate back
page.goBackWithTimeout(5000) // With timeout
page.goBackWithWaitUntil('load') // Wait after back

page.goForward() // Navigate forward
page.goForwardWithTimeout(5000) // With timeout
```

#### Wait Methods
```
page.waitForTimeout(5000) // Wait 5 seconds
page.waitForLoadState('load') // Wait for load
page.waitForLoadState('domcontentloaded') // Wait for DOM
page.waitForLoadState('networkidle') // Wait for network

page.waitForURL('https://example.com') // Wait for specific URL
page.waitForURL(/.*\/success/) // Wait for URL pattern
page.waitForURLWithTimeout('**/login', 10000) // With timeout

page.waitForFunction(() => window.ready) // Wait for JS condition
page.waitForFunctionWithPolling(() => count > 5, 100) // Poll every 100ms

page.waitForEvent('response') // Wait for event
page.waitForRequest('**/api/users') // Wait for request
page.waitForResponse('**/api/login') // Wait for response
```

#### Page State Methods
```
page.title() // Get page title
page.url() // Get current URL
page.content() // Get page HTML
page.innerText(selector) // Get element text
page.innerHTML(selector) // Get element HTML
page.getAttribute(selector, 'href') // Get attribute
page.isVisible(selector) // Check visibility
page.isEnabled(selector) // Check enabled
page.isChecked(selector) // Check checked
page.isEditable(selector) // Check editable
```

#### Viewport Methods
```
page.setViewportSize({width: 1920, height: 1080}) // Set size
page.viewportSize() // Get current size
page.setViewportToMobile() // iPhone viewport
page.setViewportToTablet() // iPad viewport
page.setViewportToDesktop() // Desktop viewport
```

#### Cookie Methods
```
page.setCookie({name: 'session', value: 'abc123'}) // Set cookie
page.getCookies() // Get all cookies
page.getCookie('session') // Get specific cookie
page.deleteCookie('session') // Delete cookie
page.clearCookies() // Clear all cookies
```

#### Storage Methods
```
page.setLocalStorageItem('key', 'value') // Set localStorage
page.getLocalStorageItem('key') // Get localStorage
page.removeLocalStorageItem('key') // Remove item
page.clearLocalStorage() // Clear all

page.setSessionStorageItem('key', 'value') // Set sessionStorage
page.getSessionStorageItem('key') // Get sessionStorage
page.clearSessionStorage() // Clear session storage
```

#### Dialog Methods
```
page.acceptDialog() // Accept alert/confirm
page.dismissDialog() // Dismiss dialog
page.handleDialog(accept: true, text: 'Input text') // Handle prompt
page.expectDialog(type: 'alert') // Expect specific dialog
```

#### Console Methods
```
page.onConsoleMessage(msg => console.log(msg)) // Listen to console
page.getConsoleLogs() // Get all console logs
page.clearConsoleLogs() // Clear captured logs
page.expectConsoleMessage('Error') // Wait for message
```

#### Network Methods
```
page.route('**/api/**', route => route.abort()) // Block requests
page.routeWithHandler('**/api/**', customHandler) // Custom handler
page.unroute('**/api/**') // Remove route

page.setOffline(true) // Go offline
page.setOnline() // Go online
page.emulateNetworkConditions('3G') // Slow network
```

#### PDF Generation
```
page.pdf() // Generate PDF
page.pdfWithPath('page.pdf') // Save to file
page.pdfWithFormat('A4') // A4 size
page.pdfWithLandscape() // Landscape orientation
page.pdfWithMargins({top: 20, bottom: 20}) // Custom margins
page.pdfWithPageRanges('1-5') // Specific pages
page.pdfWithHeaderFooter(header, footer) // Headers/footers
page.pdfWithScale(0.8) // Scale content
```

### 3.2 Page Injection & Factory

#### Page Factory Pattern
```
// Register pages
CSPageFactory.register('LoginPage', new LoginPage())
CSPageFactory.register('DashboardPage', new DashboardPage())
CSPageFactory.register('SettingsPage', new SettingsPage())

// Get page instance
const loginPage = CSPageFactory.get<LoginPage>('LoginPage')
```

#### Dependency Injection in Steps
```
@StepDefinitions
class LoginSteps {
  @Page('LoginPage')
  private loginPage: LoginPage
  
  @Page('DashboardPage')
  private dashboardPage: DashboardPage
  
  // Pages auto-injected when step executes
}
```

#### Context Injection
```
@StepDefinitions
class TestSteps {
  @Context
  private context: CSBDDContext
  
  @ScenarioContext
  private scenarioData: CSScenarioContext
  
  @FeatureContext
  private featureData: CSFeatureContext
}
```

## 5. BDD MODULE (CSBDDRunner, CSBDDEngine)

### 5.0 Browser Management in BDD Scenarios

#### Browser Restart Between Users
```gherkin
Feature: Multi-User Testing with Browser Restart

  @BrowserRestart
  Scenario: Admin user workflow
    Given I restart browser and login as "admin"
    When I access admin dashboard
    Then I should see admin controls
    
  @BrowserRestart  
  Scenario: Regular user workflow
    Given I restart browser and login as "employee"
    When I access user dashboard
    Then I should not see admin controls

  # Each scenario gets fresh browser instance
```

#### Browser Switching Mid-Scenario
```gherkin
Feature: Cross-Browser Testing

  @BrowserSwitch
  Scenario: Verify cross-browser compatibility
    Given I open application in "chrome"
    When I create a document
    And I save the document ID
    Then I switch to "firefox" browser
    When I open the saved document
    Then document should render correctly
    And I switch to "edge" browser
    When I open the saved document
    Then document should render correctly

  # Seamless browser switching during execution
```

#### Browser Pool for Parallel Execution
```gherkin
Feature: Parallel User Testing

  @Parallel @BrowserPool
  Scenario Outline: Multiple users accessing system
    Given I get browser from pool
    When I login as "<user>"
    And I perform "<action>"
    Then I should see "<result>"
    And I return browser to pool
    
    Examples:
      | user  | action        | result       |
      | user1 | view_profile  | profile_page |
      | user2 | edit_settings | settings_page|
      | user3 | check_reports | reports_page |
      # All run in parallel using browser pool
```

#### Session Preservation Across Browsers
```gherkin
Feature: Shopping Cart Persistence

  @SessionPreservation
  Scenario: Cart persists across browsers
    Given I open "chrome" browser
    When I add items to cart:
      | item   | quantity |
      | laptop | 1        |
      | mouse  | 2        |
    And I save browser session
    Then I close browser
    When I open "firefox" browser
    And I restore browser session
    Then cart should contain:
      | item   | quantity |
      | laptop | 1        |
      | mouse  | 2        |
```

#### Browser Context Management
```gherkin
Feature: Context Isolation Testing

  @NewContext
  Scenario: Test with fresh context
    Given I create new browser context
    When I navigate to application
    Then no cookies should exist
    
  @ReuseContext
  Scenario: Test with existing context
    Given I reuse existing browser context
    When I navigate to application
    Then previous session should be active
```

### 4.1 CSBDDRunner - Test Execution

#### Running Tests
```
// Run single feature
CSBDDRunner.run('features/login.feature')

// Run with tags
CSBDDRunner.run({
  features: ['features/'],
  tags: '@smoke and not @skip'
})

// Run specific scenario
CSBDDRunner.run({
  features: ['login.feature'],
  scenario: 'Successful login'
})

// Parallel execution
CSBDDRunner.run({
  features: ['features/'],
  parallel: 8,
  strategy: 'feature' // or 'scenario'
})
```

#### Execution Options
```
CSBDDRunner.run({
  features: ['features/'],
  tags: '@regression',
  dryRun: true, // Check steps without execution
  strict: true, // Fail on undefined steps
  retry: 2, // Retry failed scenarios
  retryTagFilter: '@flaky', // Only retry flaky tests
  timeout: 60000, // Global timeout
  parallel: 4,
  format: ['html', 'json', 'junit'],
  publishQuietly: true
})
```

### 4.2 CSBDDEngine - Feature Parsing

#### Parse Feature Files
```
// Parse single file
const feature = CSBDDEngine.parseFeature('login.feature')

// Parse with validation
const feature = CSBDDEngine.parseFeatureWithValidation('login.feature')
→ Validates all steps have definitions

// Parse directory
const features = CSBDDEngine.parseDirectory('features/')
→ Returns array of parsed features

// Parse with filters
const features = CSBDDEngine.parseWithFilters('features/', {
  tags: '@smoke',
  excludeTags: '@skip'
})
```

#### Gherkin Parsing
```
// Parse Gherkin text
const feature = CSBDDEngine.parseGherkin(`
  Feature: Login
    Scenario: Valid login
      Given I am on login page
      When I login with valid credentials
      Then I should see dashboard
`)

// Get AST
const ast = CSBDDEngine.getAST('login.feature')
→ Returns Gherkin AST structure
```

### 4.3 CSStepRegistry - Step Registration

#### Register Steps
```
// Register with regex
CSStepRegistry.register(/^I login with "([^"]*)" and "([^"]*)"$/, loginFunction)

// Register with string
CSStepRegistry.register('I click the {string} button', clickFunction)

// Register with expression
CSStepRegistry.register('I have {int} items in cart', checkCartFunction)

// Register with custom type
CSStepRegistry.defineParameterType({
  name: 'color',
  regexp: /red|blue|green/,
  transformer: s => new Color(s)
})
CSStepRegistry.register('I select {color}', selectColorFunction)
```

#### Find Steps
```
// Find matching step
const match = CSStepRegistry.findStep('I login with "john" and "pass123"')
→ Returns: {definition, parameters: ['john', 'pass123']}

// Get all steps
const allSteps = CSStepRegistry.getAllSteps()
→ Returns array of all registered steps

// Check if step exists
const exists = CSStepRegistry.hasStep('I click login')
→ Returns: true/false
```

### 4.4 Context Management

#### CSBDDContext - Global Context
```
// Set global data
CSBDDContext.set('baseUrl', 'https://example.com')
CSBDDContext.set('apiToken', 'abc123')

// Get global data
const url = CSBDDContext.get('baseUrl')

// Check existence
if (CSBDDContext.has('apiToken')) { }

// Clear context
CSBDDContext.clear()
```

#### CSFeatureContext - Feature Level
```
// Available throughout feature
CSFeatureContext.set('featureUser', testUser)
const user = CSFeatureContext.get('featureUser')
```

#### CSScenarioContext - Scenario Level
```
// Available within scenario
CSScenarioContext.set('orderId', '12345')
const id = CSScenarioContext.get('orderId')

// Auto-cleared after scenario
```

#### CSStepContext - Step Level
```
// Current step info
CSStepContext.getCurrentStep() // Returns step text
CSStepContext.getStepKeyword() // Given/When/Then
CSStepContext.getStepLine() // Line number
CSStepContext.attachScreenshot('screenshot.png')
CSStepContext.attachText('Additional info')
```

## 6. DATA PROVIDERS - ALL SOURCES WITH FEATURE FILE EXAMPLES

### 5.1 Excel Data Provider - Feature File Configuration

#### Tag-Based Configuration
```gherkin
@DataProvider(source="testdata/users.xlsx", type="excel", sheet="LoginData", filter="status='active'")
Feature: User Management
  
  @excel-data
  Scenario Outline: Login with Excel data
    When I login with username "<username>" and password "<password>"
    Then I should see role "<role>"
    # Data comes from Excel sheet, no Examples section needed
```

#### Examples Keyword with JSON Configuration
```gherkin
Feature: User Management

  Scenario Outline: Login with Excel data
    When I login with username "<username>" and password "<password>"
    Then I should see role "<role>"
    
    Examples: {"type": "excel", "source": "testdata/users.xlsx", "sheet": "LoginData", "filter": "executeTest=true"}
```

#### Excel File Structure Expected
```
| username    | password   | role      | executeTest |
| john.doe    | Pass@123   | admin     | true        |
| jane.smith  | Secret@456 | user      | true        |
| test.user   | Test@789   | guest     | false       |
```

### 5.2 CSV Data Provider - Feature File Configuration

#### Tag-Based Configuration
```gherkin
@DataProvider(source="testdata/users.csv", type="csv", delimiter=",", skipHeader=false)
Feature: CSV Data Testing
  
  Scenario Outline: Login with CSV data
    When I login with "<username>" and "<password>"
    Then I should see "<expected>"
```

#### Examples Keyword Configuration
```gherkin
Scenario Outline: Login with CSV data
  When I login with "<username>" and "<password>"
  Then I should see "<expected>"
  
  Examples: {"type": "csv", "source": "testdata/users.csv", "delimiter": ","}
```

### 5.3 JSON Data Provider - Feature File Configuration

#### Tag-Based Configuration
```gherkin
@DataProvider(source="testdata/users.json", type="json", path="$.testUsers[*]")
Feature: JSON Data Testing

  Scenario Outline: User validation
    Given I validate user "<username>"
    When I check status
    Then status should be "<status>"
```

#### Examples Keyword Configuration
```gherkin
Scenario Outline: User validation from JSON
  Given I validate user "<username>"
  Then status should be "<status>"
  
  Examples: {"type": "json", "source": "testdata/users.json", "path": "$.users[?(@.active==true)]"}
```

#### JSON File Structure
```json
{
  "users": [
    {"username": "john", "password": "pass123", "status": "active", "active": true},
    {"username": "jane", "password": "pass456", "status": "inactive", "active": false}
  ]
}
```

### 5.4 XML Data Provider - Feature File Configuration

#### Tag-Based Configuration
```gherkin
@DataProvider(source="testdata/products.xml", type="xml", xpath="//product[@available='true']")
Feature: Product Testing

  Scenario Outline: Validate product details
    When I search for product "<sku>"
    Then price should be "<price>"
    And stock should be "<stock>"
```

#### Examples Keyword Configuration  
```gherkin
Scenario Outline: Product validation from XML
  When I search for product "<sku>"
  Then price should be "<price>"
  
  Examples: {"type": "xml", "source": "testdata/products.xml", "xpath": "//product[price < 100]"}
```

#### XML File Structure
```xml
<?xml version="1.0"?>
<products>
  <product sku="PROD-001" available="true">
    <name>Laptop</name>
    <price>999.99</price>
    <stock>50</stock>
  </product>
  <product sku="PROD-002" available="false">
    <name>Mouse</name>
    <price>29.99</price>
    <stock>0</stock>
  </product>
</products>
```

### 5.5 Database Data Provider
```
// SQL query
@DataProvider(source="SELECT * FROM users WHERE active = 1", type="sql")

// With parameters
@DataProvider(source="SELECT * FROM users WHERE role = ?", params=["admin"], type="sql")

// Stored procedure
@DataProvider(source="EXEC GetActiveUsers", type="sql")

// MongoDB query
@DataProvider(source="users.find({status: 'active'})", type="mongodb")
```

### 5.6 API Data Provider
```
// GET request
@DataProvider(source="https://api.example.com/users", type="api")

// With authentication
@DataProvider(source="https://api.example.com/users", type="api", headers={"Authorization": "Bearer token123"})

// POST request
@DataProvider(source="https://api.example.com/query", type="api", method="POST", body={"filter": "active"})
```

### 5.7 Dynamic Data Generation
```
// Random values in data
@DataProvider(source="data/template.json")
Template: {"username": "user_<random>", "email": "<random>@test.com"}
Generates: {"username": "user_8234", "email": "7623@test.com"}

// UUID generation
Template: {"id": "<uuid>", "sessionId": "<uuid>"}
Generates: {"id": "f47ac10b-58cc-4372-a567-0e02b2c3d479", "sessionId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"}

// Timestamps
Template: {"created": "<now>", "date": "<today>"}
Generates: {"created": "2024-01-15T10:30:45.123Z", "date": "2024-01-15"}

// Sequential values
Template: {"id": "<sequence>", "code": "CODE_<sequence>"}
Generates: {"id": "1", "code": "CODE_1"}, {"id": "2", "code": "CODE_2"}
```

## 7. REPORTING (CSReporter, CSReportGenerator)

### 6.1 CSReporter Methods
```
// Success reporting
CSReporter.pass("Login successful", {username: "john", duration: 2.5})
→ Green checkmark in report

// Information
CSReporter.info("Navigating to dashboard", {url: "/dashboard"})
→ Info icon in report

// Warning
CSReporter.warn("Response slow", {responseTime: 5000, threshold: 2000})
→ Yellow warning in report

// Failure
CSReporter.fail("Element not found", error, true) // true = capture screenshot
→ Red X in report with screenshot

// Custom entries
CSReporter.log({
  level: 'debug',
  message: 'Debug information',
  data: complexObject,
  screenshot: true
})
```

### 6.1.1 Log Level Configuration

The framework supports log level filtering to control console output verbosity:

```properties
# In config/global.env
LOG_LEVEL=INFO  # Set the minimum log level to display
```

**Log Level Hierarchy (from lowest to highest):**
- `DEBUG` - Detailed debugging information (gray)
- `INFO` - General informational messages (cyan)
- `WARN` - Warning messages (yellow)
- `ERROR` - Error messages (red)

**How it works:**
When you set a log level, you see that level and all higher priority levels:

| LOG_LEVEL | Visible Logs | Hidden Logs |
|-----------|-------------|-------------|
| DEBUG | All logs (DEBUG, INFO, WARN, ERROR) | None |
| INFO | INFO, WARN, ERROR | DEBUG |
| WARN | WARN, ERROR | DEBUG, INFO |
| ERROR | ERROR only | DEBUG, INFO, WARN |

**Usage Examples:**
```bash
# Hide debug messages in production
LOG_LEVEL=INFO npm run test

# Show only warnings and errors
LOG_LEVEL=WARN npm run test

# Show everything (default)
LOG_LEVEL=DEBUG npm run test
```

**Note:** Test-specific messages (PASS, FAIL, FEATURE, TEST, STEP) are always shown regardless of LOG_LEVEL.

### 6.2 CSReportGenerator - Report Formats

#### HTML Report
```
CSReportGenerator.generateHTML({
  includeScreenshots: true,
  includeVideos: true,
  includeConsoleLogs: true,
  expandFailures: true,
  theme: 'dark'
})
→ Creates interactive HTML report
```

#### PDF Report
```
CSReportGenerator.generatePDF({
  orientation: 'landscape',
  format: 'A4',
  includeCharts: true,
  includeExecutiveSummary: true,
  companyLogo: 'logo.png'
})
→ Creates professional PDF
```

#### Excel Report
```
CSReportGenerator.generateExcel({
  sheets: ['Summary', 'Details', 'Failures', 'Performance'],
  includeCharts: true,
  includeFormulas: true
})
→ Creates multi-sheet Excel
```

#### Custom Format
```
CSReportGenerator.generateCustom({
  template: 'templates/custom-report.hbs',
  data: testResults,
  output: 'report.html'
})
```

### 6.3 Evidence Collection

#### Screenshots
```
CSScreenshotManager.capture() // Full page
CSScreenshotManager.captureElement(selector) // Specific element
CSScreenshotManager.captureWithAnnotation(selector, "Click here") // With arrow
CSScreenshotManager.captureViewport() // Visible area only
CSScreenshotManager.compareWithBaseline('baseline.png') // Visual regression
```

#### Videos
```
CSVideoRecorder.start()
CSVideoRecorder.stop()
CSVideoRecorder.pause()
CSVideoRecorder.resume()
CSVideoRecorder.saveAs('test-execution.mp4')
CSVideoRecorder.attachToReport()
```

#### HAR Files
```
CSNetworkRecorder.startHAR()
CSNetworkRecorder.stopHAR()
CSNetworkRecorder.saveHAR('network.har')
CSNetworkRecorder.filterHAR('**/api/**')
```

## 8. API MODULE (CSHttpClient, CSAPIValidator)

### 7.1 CSHttpClient - All HTTP Methods

#### Request Methods
```
// GET
CSHttpClient.get('/users')
CSHttpClient.getWithParams('/users', {page: 2, limit: 10})
CSHttpClient.getWithHeaders('/users', {'Accept': 'application/json'})

// POST
CSHttpClient.post('/users', {name: 'John'})
CSHttpClient.postForm('/upload', formData)
CSHttpClient.postJSON('/api/users', jsonData)

// PUT
CSHttpClient.put('/users/123', updatedData)
CSHttpClient.putWithHeaders('/users/123', data, headers)

// PATCH
CSHttpClient.patch('/users/123', {email: 'new@email.com'})

// DELETE
CSHttpClient.delete('/users/123')
CSHttpClient.deleteWithBody('/bulk-delete', {ids: [1,2,3]})

// OPTIONS
CSHttpClient.options('/api/endpoint')

// HEAD
CSHttpClient.head('/file.pdf')
```

#### Advanced Features
```
// Retry configuration
CSHttpClient.withRetry(3, 1000) // 3 retries, 1s delay
  .get('/flaky-endpoint')

// Timeout
CSHttpClient.withTimeout(60000)
  .get('/slow-endpoint')

// Proxy
CSHttpClient.withProxy('http://proxy:8080')
  .get('/external-api')

// Certificate
CSHttpClient.withCert('client.crt', 'client.key')
  .get('/secure-endpoint')
```

### 7.2 CSAPIValidator

#### Response Validation
```
// Status validation
CSAPIValidator.assertStatus(response, 200)
CSAPIValidator.assertStatusRange(response, 200, 299)

// Header validation
CSAPIValidator.assertHeader(response, 'Content-Type', 'application/json')
CSAPIValidator.assertHeaderExists(response, 'X-Request-ID')
CSAPIValidator.assertHeaderPattern(response, 'X-Request-ID', /^[A-Z0-9-]+$/)

// Body validation
CSAPIValidator.assertBodyContains(response, 'success')
CSAPIValidator.assertBodyJSON(response, {status: 'success'})
CSAPIValidator.assertBodySchema(response, jsonSchema)

// JSONPath validation
CSAPIValidator.assertJSONPath(response, '$.data.id', 123)
CSAPIValidator.assertJSONPathExists(response, '$.data.users[0].email')
CSAPIValidator.assertJSONPathArray(response, '$.data.items', 10) // Array length

// Response time
CSAPIValidator.assertResponseTime(response, 2000) // Under 2 seconds
```

## 9. DATABASE MODULE (CSDatabase, CSQueryBuilder)

### 8.1 CSDatabase - All Operations

#### Connection Management
```
// MySQL
CSDatabase.connect({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  database: 'testdb',
  user: 'root',
  password: 'password',
  pool: {min: 2, max: 10}
})

// PostgreSQL
CSDatabase.connect({
  type: 'postgresql',
  connectionString: 'postgresql://user:pass@localhost/db'
})

// MongoDB
CSDatabase.connect({
  type: 'mongodb',
  url: 'mongodb://localhost:27017',
  database: 'testdb'
})

// Oracle
CSDatabase.connect({
  type: 'oracle',
  connectString: 'localhost:1521/XEPDB1',
  user: 'system',
  password: 'oracle'
})
```

#### Query Execution
```
// Simple query
const users = await CSDatabase.query('SELECT * FROM users')

// Parameterized query
const user = await CSDatabase.query(
  'SELECT * FROM users WHERE id = ?',
  [123]
)

// Stored procedure
const result = await CSDatabase.execute('CALL GetUserById(?)', [123])

// Batch operations
await CSDatabase.batch([
  {sql: 'INSERT INTO users VALUES (?, ?)', params: ['John', 'john@test.com']},
  {sql: 'INSERT INTO users VALUES (?, ?)', params: ['Jane', 'jane@test.com']}
])
```

### 8.2 CSQueryBuilder

#### Select Queries
```
const query = CSQueryBuilder
  .select('users')
  .columns(['id', 'name', 'email'])
  .where('status', '=', 'active')
  .where('age', '>', 18)
  .orderBy('created_at', 'DESC')
  .limit(10)
  .offset(20)
  .build()

→ SELECT id, name, email FROM users WHERE status = 'active' AND age > 18 ORDER BY created_at DESC LIMIT 10 OFFSET 20
```

#### Join Queries
```
const query = CSQueryBuilder
  .select('orders o')
  .columns(['o.id', 'o.total', 'u.name'])
  .innerJoin('users u', 'o.user_id', 'u.id')
  .leftJoin('payments p', 'o.id', 'p.order_id')
  .where('o.status', '=', 'completed')
  .build()
```

#### Insert/Update/Delete
```
// Insert
CSQueryBuilder.insert('users')
  .values({name: 'John', email: 'john@test.com'})
  .returning('id')

// Update
CSQueryBuilder.update('users')
  .set({status: 'inactive'})
  .where('last_login', '<', '2023-01-01')

// Delete
CSQueryBuilder.delete('users')
  .where('status', '=', 'deleted')
```

### 8.3 CSTransactionManager

#### Transaction Management
```
const transaction = await CSTransactionManager.begin()

try {
  await transaction.query('INSERT INTO users...')
  await transaction.query('UPDATE accounts...')
  await transaction.commit()
} catch (error) {
  await transaction.rollback()
}

// Auto-rollback on test failure
CSTransactionManager.withTransaction(async (trx) => {
  await trx.query('INSERT...')
  await trx.query('UPDATE...')
  // Auto-commits if success, auto-rollback if error
})
```

## 10. AI & SELF-HEALING (CSSelfHealingEngine, CSAIElementIdentifier)

### 9.1 CSSelfHealingEngine

#### Healing Strategies
```
// Strategy 1: Nearby elements
Original: id="submit"
Page changed: id removed
Healing: Finds button near same position
Result: Test continues

// Strategy 2: Similar text
Original: text="Sign In"
Page changed: text="Log In"
Healing: Finds similar text (Levenshtein distance)
Result: Clicks "Log In"

// Strategy 3: Visual similarity
Original: Blue button, bottom right
Page changed: Button moved slightly
Healing: Finds visually similar element
Result: Finds blue button in new position

// Strategy 4: DOM structure
Original: div > form > button
Page changed: div > div > form > button
Healing: Finds similar structure
Result: Adapts to new DOM

// Strategy 5: AI identification
Original: Any selector
Page changed: Major changes
Healing: Uses AI to understand intent
Result: Finds correct element
```

#### Healing Configuration
```
CSSelfHealingEngine.configure({
  enabled: true,
  strategies: ['nearby', 'text', 'visual', 'structure', 'ai'],
  confidenceThreshold: 0.7,
  maxAttempts: 5,
  updateSelectors: true, // Auto-update successful healings
  notifyOnHealing: true // Send notifications
})
```

### 9.2 CSAIElementIdentifier

#### Natural Language Identification
```
// Describe element in plain English
CSAIElementIdentifier.find("blue submit button at the bottom of the form")
CSAIElementIdentifier.find("red error message below email field")
CSAIElementIdentifier.find("navigation menu on the left side")
CSAIElementIdentifier.find("largest image in the article")
```

#### Visual Recognition
```
// Find by visual attributes
CSAIElementIdentifier.findByAppearance({
  color: 'blue',
  shape: 'rounded',
  size: 'large',
  position: 'bottom-right'
})
```

#### Pattern Learning
```
// Train on successful identifications
CSAIElementIdentifier.train({
  description: "login button",
  selector: "#login-btn",
  success: true
})

// Gets smarter over time
First identification: 3 seconds
After 10 similar: 1 second
After 100: Instant
```

## 11. AZURE DEVOPS INTEGRATION (CSADOClient, CSTestPlanManager)

### 10.1 CSADOClient - API Integration with Proxy Support

#### Authentication with Proxy Configuration
```javascript
// Basic configuration
CSADOClient.configure({
  organization: CSConfigurationManager.get('ADO_ORGANIZATION'),
  project: CSConfigurationManager.get('ADO_PROJECT'),
  pat: CSConfigurationManager.get('ADO_PAT') // Automatically decrypted
})

// Full configuration with corporate proxy
CSADOClient.configure({
  // Basic ADO settings
  organization: CSConfigurationManager.get('ADO_ORGANIZATION'),
  project: CSConfigurationManager.get('ADO_PROJECT'),
  pat: CSConfigurationManager.get('ADO_PAT'),
  baseUrl: CSConfigurationManager.get('ADO_API_BASE_URL'),
  apiVersion: CSConfigurationManager.get('ADO_API_VERSION'),
  
  // Proxy configuration for API calls
  proxy: {
    enabled: CSConfigurationManager.get('ADO_PROXY_ENABLED'),
    host: CSConfigurationManager.get('ADO_PROXY_HOST'),
    port: CSConfigurationManager.get('ADO_PROXY_PORT'),
    protocol: CSConfigurationManager.get('ADO_PROXY_PROTOCOL'), // http|https|socks5
    
    // Proxy authentication
    auth: {
      required: CSConfigurationManager.get('ADO_PROXY_AUTH_REQUIRED'),
      username: CSConfigurationManager.get('ADO_PROXY_USERNAME'),
      password: CSConfigurationManager.get('ADO_PROXY_PASSWORD') // Decrypted
    },
    
    // Bypass proxy for internal URLs
    bypass: CSConfigurationManager.get('ADO_PROXY_BYPASS_LIST')?.split(';')
  },
  
  // SSL/TLS configuration
  ssl: {
    verify: CSConfigurationManager.get('ADO_SSL_VERIFY'),
    clientCert: CSConfigurationManager.get('ADO_CLIENT_CERT_PATH'),
    clientKey: CSConfigurationManager.get('ADO_CLIENT_KEY_PATH'),
    caCert: CSConfigurationManager.get('ADO_CA_CERT_PATH')
  },
  
  // Connection settings
  timeout: CSConfigurationManager.get('ADO_API_TIMEOUT'),
  retryCount: CSConfigurationManager.get('ADO_API_RETRY_COUNT'),
  retryDelay: CSConfigurationManager.get('ADO_API_RETRY_DELAY')
})

// Example: Making API call through proxy
const response = await CSADOClient.makeRequest({
  method: 'GET',
  endpoint: '/wit/workitems',
  // Request automatically routed through configured proxy
})
```

#### Work Items
```
// Create bug
const bug = await CSADOClient.createBug({
  title: 'Login button not working',
  description: 'Button is disabled when it should be enabled',
  priority: 2,
  severity: 'High',
  attachments: ['screenshot.png', 'video.mp4'],
  assignedTo: 'dev.team@company.com'
})

// Update test case
await CSADOClient.updateTestCase(12345, {
  state: 'Passed',
  outcome: 'Passed',
  duration: 45,
  comment: 'All assertions passed'
})

// Link items
await CSADOClient.linkWorkItems(bug.id, testCase.id, 'Tested By')
```

### 10.2 CSTestPlanManager

#### Test Plan Operations
```
// Get test plan
const plan = await CSTestPlanManager.getTestPlan(100)

// Get test suites
const suites = await CSTestPlanManager.getTestSuites(100)

// Get test cases
const cases = await CSTestPlanManager.getTestCases(100, 200) // Plan 100, Suite 200

// Update test results
await CSTestPlanManager.updateTestResult({
  planId: 100,
  suiteId: 200,
  testCaseId: 12345,
  outcome: 'Passed',
  duration: 5000,
  comment: 'Test passed successfully',
  attachments: ['report.html']
})
```

#### Test Run Management
```
// Create test run
const run = await CSTestPlanManager.createTestRun({
  name: 'Regression Run ' + new Date(),
  plan: 100,
  automated: true,
  testCases: [12345, 12346, 12347]
})

// Update run results
await CSTestPlanManager.updateRunResults(run.id, results)

// Complete run
await CSTestPlanManager.completeRun(run.id)
```

## 12. COMPLETE WORKING EXAMPLE

### Feature File with All Features
```gherkin
@regression @TestCase:TC-1001 @priority:high
Feature: Complete E-Commerce Flow
  
  Background:
    Given I am on the application
    And configuration is loaded from "<config:ENVIRONMENT>"
  
  @DataProvider(source="testdata/products.xlsx", sheet="Products", filter="inStock=true")
  Scenario Outline: Purchase products with Excel data
    Given I login with "<config:TEST_USER>" and "<config:TEST_PASSWORD>"
    When I search for "<productName>"
    And I add <quantity> items to cart
    And I apply coupon "<couponCode>"
    Then cart total should be <expectedTotal>
    
  @data-driven @xml
  Scenario Outline: Validate product details from XML
    When I view product "<sku>"
    Then product details should match:
      | Field       | Value         |
      | Name        | <name>        |
      | Price       | <price>       |
      | Description | <description> |
    
    Examples: {"type": "xml", "source": "testdata/products.xml", "xpath": "//product[@available='true']"}
  
  @api-test @database-validation
  Scenario: Complete order with API and database validation
    Given I create order via API:
      """json
      {
        "userId": "<uuid>",
        "items": [
          {"sku": "PROD-001", "quantity": 2},
          {"sku": "PROD-002", "quantity": 1}
        ],
        "timestamp": "<now>"
      }
      """
    When I store response field "orderId" as "ORDER_ID"
    Then database should have order with id "{{ORDER_ID}}"
    And order status in database should be "pending"
    
  @dynamic-data @config-interpolation
  Scenario: User registration with dynamic data
    Given I am on registration page
    When I register with:
      | Field           | Value                                    |
      | Username        | testuser_<random>                        |
      | Email           | test_<random>@<config:EMAIL_DOMAIN>      |
      | Password        | <config:DEFAULT_PASSWORD>                |
      | Phone           | <config:COUNTRY_CODE>-555-<random>       |
      | Referral Code   | <env:REFERRAL_CODE>                      |
      | Account Type    | <config:DEFAULT_ACCOUNT_TYPE>            |
      | Created Date    | <today>                                  |
      | Session ID      | <uuid>                                   |
    Then user should be created successfully
    And welcome email should be sent
```

This comprehensive guide covers ALL CS-prefixed classes, configuration interpolation, encryption/decryption, XML data sources, Playwright API methods with variants, page injection, step registry, and every other feature you mentioned. Each example shows exactly how to use the feature with concrete inputs and outputs.