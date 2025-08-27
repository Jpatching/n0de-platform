#!/usr/bin/env node

/**
 * Code Quality Agent
 * Automated code quality checks, linting, and formatting
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

class CodeQualityAgent {
  constructor(config = {}) {
    this.config = {
      projectPath: config.projectPath || process.cwd(),
      autoFix: config.autoFix || false,
      strictMode: config.strictMode || false,
      excludePaths: config.excludePaths || ['node_modules', 'dist', 'build', '.git']
    };
    
    this.issues = [];
    this.metrics = {
      totalFiles: 0,
      filesWithIssues: 0,
      totalIssues: 0,
      fixedIssues: 0
    };
  }

  async scanFile(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    const issues = [];
    
    // Security checks
    const securityPatterns = [
      { pattern: /console\.(log|error|warn)/g, message: 'Remove console statements in production' },
      { pattern: /eval\(/g, message: 'Avoid using eval() - security risk' },
      { pattern: /process\.env\.\w+\s*\|\|\s*['"].*['"]/g, message: 'Hardcoded fallback for env var' },
      { pattern: /password.*=.*['"]/gi, message: 'Potential hardcoded password' },
      { pattern: /api[_\-]?key.*=.*['"]/gi, message: 'Potential hardcoded API key' }
    ];
    
    securityPatterns.forEach(({ pattern, message }) => {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({
          type: 'security',
          file: filePath,
          message,
          count: matches.length
        });
      }
    });
    
    // Code quality checks
    const qualityPatterns = [
      { pattern: /TODO|FIXME|HACK/g, message: 'Unresolved TODO/FIXME comments' },
      { pattern: /\t/g, message: 'Mixed tabs and spaces' },
      { pattern: /\s+$/gm, message: 'Trailing whitespace' },
      { pattern: /^\s*\n\s*\n\s*\n/gm, message: 'Multiple consecutive blank lines' }
    ];
    
    qualityPatterns.forEach(({ pattern, message }) => {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        issues.push({
          type: 'quality',
          file: filePath,
          message,
          count: matches.length
        });
      }
    });
    
    // Best practices
    if (filePath.endsWith('.js')) {
      if (!content.includes('use strict') && !content.includes('"use strict"')) {
        issues.push({
          type: 'practice',
          file: filePath,
          message: 'Missing "use strict" directive',
          count: 1
        });
      }
      
      // Check for proper error handling
      if (content.includes('.catch(') && !content.includes('console.error')) {
        issues.push({
          type: 'practice',
          file: filePath,
          message: 'Catch block without proper error logging',
          count: 1
        });
      }
    }
    
    return issues;
  }

  async scanDirectory(dirPath) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      // Skip excluded paths
      if (this.config.excludePaths.some(exclude => entry.name === exclude)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        await this.scanDirectory(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.json'))) {
        this.metrics.totalFiles++;
        const issues = await this.scanFile(fullPath);
        
        if (issues.length > 0) {
          this.metrics.filesWithIssues++;
          this.metrics.totalIssues += issues.length;
          this.issues.push(...issues);
        }
      }
    }
  }

  async runESLintCheck() {
    console.log(chalk.yellow('🔍 Running ESLint checks...'));
    
    try {
      // Check if ESLint is installed
      execSync('npx eslint --version', { stdio: 'ignore' });
      
      const eslintCommand = this.config.autoFix 
        ? 'npx eslint . --fix --ext .js'
        : 'npx eslint . --ext .js';
      
      const result = execSync(eslintCommand, { 
        cwd: this.config.projectPath,
        encoding: 'utf8'
      });
      
      console.log(chalk.green('✅ ESLint checks passed'));
      return { success: true, output: result };
    } catch (error) {
      // ESLint not installed or has errors
      console.log(chalk.yellow('⚠️ ESLint not configured or has errors'));
      return { success: false, error: error.message };
    }
  }

  async runPrettierCheck() {
    console.log(chalk.yellow('🎨 Running Prettier formatting check...'));
    
    try {
      // Check if Prettier is installed
      execSync('npx prettier --version', { stdio: 'ignore' });
      
      const prettierCommand = this.config.autoFix
        ? 'npx prettier --write "**/*.{js,json,md}"'
        : 'npx prettier --check "**/*.{js,json,md}"';
      
      const result = execSync(prettierCommand, {
        cwd: this.config.projectPath,
        encoding: 'utf8'
      });
      
      console.log(chalk.green('✅ Prettier formatting check passed'));
      return { success: true, output: result };
    } catch (error) {
      console.log(chalk.yellow('⚠️ Prettier not configured or formatting issues'));
      return { success: false, error: error.message };
    }
  }

  generateReport() {
    console.log(chalk.blue.bold('\n📊 Code Quality Report'));
    console.log('='.repeat(50));
    
    // Summary
    console.log(chalk.cyan('\n📈 Summary:'));
    console.log(`  Total files scanned: ${this.metrics.totalFiles}`);
    console.log(`  Files with issues: ${this.metrics.filesWithIssues}`);
    console.log(`  Total issues found: ${this.metrics.totalIssues}`);
    
    if (this.config.autoFix) {
      console.log(chalk.green(`  Issues fixed: ${this.metrics.fixedIssues}`));
    }
    
    // Group issues by type
    const issuesByType = {
      security: [],
      quality: [],
      practice: []
    };
    
    this.issues.forEach(issue => {
      issuesByType[issue.type].push(issue);
    });
    
    // Security issues
    if (issuesByType.security.length > 0) {
      console.log(chalk.red('\n🔒 Security Issues:'));
      issuesByType.security.forEach(issue => {
        console.log(`  - ${path.basename(issue.file)}: ${issue.message} (${issue.count}x)`);
      });
    }
    
    // Quality issues
    if (issuesByType.quality.length > 0) {
      console.log(chalk.yellow('\n⚠️ Quality Issues:'));
      issuesByType.quality.slice(0, 10).forEach(issue => {
        console.log(`  - ${path.basename(issue.file)}: ${issue.message} (${issue.count}x)`);
      });
      
      if (issuesByType.quality.length > 10) {
        console.log(chalk.gray(`  ... and ${issuesByType.quality.length - 10} more`));
      }
    }
    
    // Best practice issues
    if (issuesByType.practice.length > 0) {
      console.log(chalk.blue('\n💡 Best Practice Issues:'));
      issuesByType.practice.slice(0, 5).forEach(issue => {
        console.log(`  - ${path.basename(issue.file)}: ${issue.message}`);
      });
      
      if (issuesByType.practice.length > 5) {
        console.log(chalk.gray(`  ... and ${issuesByType.practice.length - 5} more`));
      }
    }
    
    // Score calculation
    const score = Math.max(0, 100 - (this.metrics.totalIssues * 2));
    const scoreColor = score >= 80 ? chalk.green : score >= 60 ? chalk.yellow : chalk.red;
    
    console.log(chalk.blue('\n🎯 Code Quality Score:'));
    console.log(scoreColor(`  ${score}/100`));
    
    if (score < 80) {
      console.log(chalk.yellow('\n💡 Recommendations:'));
      console.log('  - Run with --fix flag to auto-fix formatting issues');
      console.log('  - Review and fix security issues manually');
      console.log('  - Set up pre-commit hooks to maintain quality');
    }
    
    return {
      score,
      metrics: this.metrics,
      issues: this.issues
    };
  }

  async analyze() {
    console.log(chalk.blue.bold('🤖 Code Quality Agent Started'));
    console.log(chalk.cyan(`Analyzing: ${this.config.projectPath}`));
    
    // Scan project files
    await this.scanDirectory(this.config.projectPath);
    
    // Run additional checks
    await this.runESLintCheck();
    await this.runPrettierCheck();
    
    // Generate and return report
    return this.generateReport();
  }
}

// Export for use as module
export default CodeQualityAgent;

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const autoFix = process.argv.includes('--fix');
  const agent = new CodeQualityAgent({ autoFix });
  agent.analyze();
}