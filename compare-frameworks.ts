import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface ModuleDifference {
    module: string;
    backupSize: number;
    currentSize: number;
    backupHash: string;
    currentHash: string;
    isDifferent: boolean;
}

function getFileHash(filePath: string): string {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return crypto.createHash('md5').update(content).digest('hex');
    } catch {
        return '';
    }
}

function compareModules() {
    const differences: ModuleDifference[] = [];

    // Get all modules from both directories
    const backupModules = new Set<string>();
    const currentModules = new Set<string>();

    function scanDir(dir: string, baseDir: string, moduleSet: Set<string>) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory() && file !== 'node_modules') {
                scanDir(fullPath, baseDir, moduleSet);
            } else if (file.endsWith('.ts')) {
                const relativePath = path.relative(baseDir, fullPath);
                moduleSet.add(relativePath);
            }
        }
    }

    scanDir('backup_framework/src', 'backup_framework/src', backupModules);
    scanDir('src', 'src', currentModules);

    console.log('\n=== FRAMEWORK COMPARISON REPORT ===\n');

    // Modules only in backup
    console.log('📦 MODULES ONLY IN BACKUP (Need to add):');
    console.log('─'.repeat(50));
    for (const module of backupModules) {
        if (!currentModules.has(module)) {
            console.log(`  ❌ ${module}`);
        }
    }

    // Modules only in current
    console.log('\n📦 MODULES ONLY IN CURRENT (Our additions):');
    console.log('─'.repeat(50));
    for (const module of currentModules) {
        if (!backupModules.has(module)) {
            console.log(`  ✅ ${module}`);
        }
    }

    // Compare common modules
    console.log('\n📊 COMMON MODULES WITH DIFFERENCES:');
    console.log('─'.repeat(50));

    for (const module of backupModules) {
        if (currentModules.has(module)) {
            const backupPath = path.join('backup_framework/src', module);
            const currentPath = path.join('src', module);

            const backupHash = getFileHash(backupPath);
            const currentHash = getFileHash(currentPath);

            if (backupHash !== currentHash) {
                const backupSize = fs.statSync(backupPath).size;
                const currentSize = fs.statSync(currentPath).size;

                const sizeDiff = currentSize - backupSize;
                const sizeIndicator = sizeDiff > 0 ? `+${sizeDiff}` : `${sizeDiff}`;

                console.log(`  📝 ${module}`);
                console.log(`     Backup: ${backupSize} bytes | Current: ${currentSize} bytes (${sizeIndicator})`);

                differences.push({
                    module,
                    backupSize,
                    currentSize,
                    backupHash,
                    currentHash,
                    isDifferent: true
                });
            }
        }
    }

    // Key modules to check in detail
    const keyModules = [
        'bdd/CSBDDRunner.ts',
        'data/CSDataProvider.ts',
        'browser/CSBrowserManager.ts',
        'reporter/CSWorldClassReportGenerator_Enhanced.ts',
        'core/CSConfigurationManager.ts',
        'evidence/CSEvidenceCollector.ts'
    ];

    console.log('\n🔍 KEY MODULE DETAILED COMPARISON:');
    console.log('─'.repeat(50));

    for (const module of keyModules) {
        if (backupModules.has(module) && currentModules.has(module)) {
            console.log(`\n  📌 ${module}:`);

            const backupPath = path.join('backup_framework/src', module);
            const currentPath = path.join('src', module);

            const backupContent = fs.readFileSync(backupPath, 'utf8');
            const currentContent = fs.readFileSync(currentPath, 'utf8');

            // Check for specific patterns
            const patterns = [
                { name: 'Data-driven support', pattern: /Scenario Outline|Examples|dataSource/gi },
                { name: 'Excel support', pattern: /xlsx|XLSX|loadExcelData/gi },
                { name: 'XML support', pattern: /xml2js|parseXML|loadXMLData/gi },
                { name: 'Parallel execution', pattern: /worker|Worker|parallel|fork/gi },
                { name: 'Report generation', pattern: /generateReport|testData|dataDisplay/gi }
            ];

            for (const { name, pattern } of patterns) {
                const backupMatches = (backupContent.match(pattern) || []).length;
                const currentMatches = (currentContent.match(pattern) || []).length;

                if (backupMatches !== currentMatches) {
                    const diff = currentMatches - backupMatches;
                    const indicator = diff > 0 ? '✅' : '⚠️';
                    console.log(`    ${indicator} ${name}: Backup(${backupMatches}) vs Current(${currentMatches})`);
                }
            }
        }
    }

    return differences;
}

// Run comparison
compareModules();