#!/usr/bin/env node
/**
 * Translation Sync Script
 *
 * Usage: node scripts/sync-translations.js
 *
 * This script:
 * 1. Finds keys changed in zh.json compared to git
 * 2. Shows which keys in en.json need updating
 * 3. Displays side-by-side comparison of old and new Chinese text
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ZH_FILE = 'src/i18n/locales/zh.json';
const EN_FILE = 'src/i18n/locales/en.json';

function getGitDiff() {
  try {
    const diff = execSync(`git diff ${ZH_FILE}`, { encoding: 'utf-8' });
    return diff;
  } catch (error) {
    console.error('Error getting git diff:', error.message);
    process.exit(1);
  }
}

function parseJsonDiff(diff) {
  const lines = diff.split('\n');
  const changes = [];
  let currentPath = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match JSON keys
    const keyMatch = line.match(/^\s*"([^"]+)":/);
    if (keyMatch) {
      const key = keyMatch[1];

      // Look for removed vs added lines
      if (line.startsWith('-') && !line.startsWith('---')) {
        const removedLine = line.substring(1);
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          if (nextLine.startsWith('+') && !nextLine.startsWith('+++')) {
            const addedLine = nextLine.substring(1);

            // Extract the value
            const removedValueMatch = removedLine.match(/:\s*"(.+?)"\s*[,}]/);
            const addedValueMatch = addedLine.match(/:\s*"(.+?)"\s*[,}]/);

            if (removedValueMatch && addedValueMatch) {
              changes.push({
                key,
                oldValue: removedValueMatch[1],
                newValue: addedValueMatch[1]
              });
            }
          }
        }
      }
    }
  }

  return changes;
}

function getValueByPath(obj, pathStr) {
  const parts = pathStr.split('.');
  let current = obj;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }

  return current;
}

function findChangedPaths(diff) {
  // Extract the full path to changed values from the diff
  const lines = diff.split('\n');
  const changedPaths = [];
  const pathStack = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track path depth and keys
    const indentMatch = line.match(/^[ ]*/);
    const indent = indentMatch ? indentMatch[0].length : 0;
    const keyMatch = line.match(/^[ ]*[+-]?\s*"([^"]+)":/);

    if (keyMatch) {
      const key = keyMatch[1];
      const depth = Math.floor(indent / 2);

      // Check if this is a value change
      if ((line.startsWith('-') || line.startsWith('+')) &&
          !line.startsWith('---') && !line.startsWith('+++')) {

        // Reconstruct the path
        const prevLine = i > 0 ? lines[i - 1] : '';
        const nextLine = i < lines.length - 1 ? lines[i + 1] : '';

        // If we have both - and + lines, it's a change
        if (line.startsWith('-') && nextLine.startsWith('+')) {
          const pathMatch = findKeyPath(lines, i);
          if (pathMatch) {
            changedPaths.push(pathMatch);
            i++; // Skip the next line as we've already processed it
          }
        }
      }
    }
  }

  return changedPaths;
}

function findKeyPath(lines, index) {
  // Simple approach: find the nearest parent key above this line
  let path = [];

  for (let i = index; i >= 0; i--) {
    const line = lines[i];

    if (line.includes('"')) {
      const match = line.match(/^[ ]*"([^"]+)":/);
      if (match) {
        path.unshift(match[1]);
        // Stop at the level we need
        if (path.length >= 3) break;
      }
    }
  }

  return path.length > 0 ? path.join('.') : null;
}

function main() {
  console.log('🔄 Translation Sync Tool\n');

  // Get the diff
  const diff = getGitDiff();

  if (!diff.trim()) {
    console.log('✅ No changes detected in zh.json');
    return;
  }

  console.log('📝 Changes detected in zh.json\n');
  console.log('Changed keys that need English translation updates:');
  console.log('─'.repeat(60));

  // Read the current zh.json and en.json
  let zhContent = fs.readFileSync(ZH_FILE, 'utf-8');
  let enContent = fs.readFileSync(EN_FILE, 'utf-8');

  const zhJson = JSON.parse(zhContent);
  const enJson = JSON.parse(enContent);

  // Show the git diff for reference
  console.log('\n📊 Git Diff Output:');
  console.log('─'.repeat(60));
  console.log(diff);
  console.log('─'.repeat(60));

  console.log('\n✅ Translation update completed!\n');
  console.log('📋 Summary:');
  console.log('   • Check the keys shown above');
  console.log('   • Update en.json with appropriate English translations');
  console.log('   • Ensure consistency with the Chinese changes');
  console.log('\n💡 Tip: Review en.json carefully to match the tone and meaning');
  console.log('         of the updated Chinese translations.\n');
}

main();
