#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { Parser, AstBuilder, GherkinClassicTokenMatcher } from '@cucumber/gherkin';

// Simple UUID function for AstBuilder
function uuidFn(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Parse feature file
const featureFile = path.join(process.cwd(), 'test/orangehrm/features/orangehrm-login-navigation.feature');
const featureContent = fs.readFileSync(featureFile, 'utf8');

const parser = new Parser(new AstBuilder(uuidFn), new GherkinClassicTokenMatcher());
const gherkinDocument = parser.parse(featureContent);

if (!gherkinDocument.feature) {
    throw new Error('No feature found in file');
}

console.log('Feature:', gherkinDocument.feature.name);
console.log('\nScenarios:');

let totalScenarios = 0;
gherkinDocument.feature.children.forEach((child: any, index: number) => {
    if (child.scenario) {
        console.log(`\n${index + 1}. ${child.scenario.name}`);
        console.log('   Type:', child.scenario.examples ? 'Scenario Outline' : 'Scenario');

        if (child.scenario.examples && child.scenario.examples.length > 0) {
            console.log('   Examples:');
            child.scenario.examples.forEach((example: any) => {
                if (example.tableHeader) {
                    const headers = example.tableHeader.cells.map((c: any) => c.value);
                    console.log('      Headers:', headers.join(' | '));
                }
                if (example.tableBody) {
                    console.log(`      Rows: ${example.tableBody.length}`);
                    example.tableBody.forEach((row: any, rowIndex: number) => {
                        const values = row.cells.map((c: any) => c.value);
                        console.log(`        Row ${rowIndex + 1}: ${values.join(' | ')}`);
                        totalScenarios++;
                    });
                } else {
                    totalScenarios++;
                }
            });
        } else {
            totalScenarios++;
        }
    }
});

console.log(`\nTotal scenario count (with examples expanded): ${totalScenarios}`);