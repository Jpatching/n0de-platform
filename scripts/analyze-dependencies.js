#!/usr/bin/env node

/**
 * N0DE Platform Dependency Analyzer
 * Analyzes circular dependencies and module structure
 */

const fs = require('fs');
const path = require('path');
const util = require('util');

class DependencyAnalyzer {
  constructor(srcDir) {
    this.srcDir = srcDir;
    this.modules = new Map();
    this.circularDeps = [];
    this.analysisReport = {
      totalModules: 0,
      circularDependencies: [],
      moduleStructure: {},
      warnings: [],
      recommendations: []
    };
  }

  async analyze() {
    console.log('🔍 Analyzing N0DE Platform Dependencies...\n');
    
    // 1. Scan all TypeScript files
    await this.scanDirectory(this.srcDir);
    
    // 2. Build dependency graph
    this.buildDependencyGraph();
    
    // 3. Detect circular dependencies
    this.detectCircularDependencies();
    
    // 4. Analyze module structure
    this.analyzeModuleStructure();
    
    // 5. Generate recommendations
    this.generateRecommendations();
    
    // 6. Create report
    return this.createReport();
  }

  async scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        await this.scanDirectory(fullPath);
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        await this.analyzeFile(fullPath);
      }
    }
  }

  async analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.srcDir, filePath);
      
      const imports = this.extractImports(content);
      const exports = this.extractExports(content);
      
      this.modules.set(relativePath, {
        path: filePath,
        relativePath,
        imports,
        exports,
        isModule: this.isModuleFile(relativePath),
        isService: this.isServiceFile(relativePath),
        isController: this.isControllerFile(relativePath)
      });
      
    } catch (error) {
      console.error(`Error analyzing ${filePath}:`, error.message);
    }
  }

  extractImports(content) {
    const imports = [];
    const importRegex = /import\s+.*?from\s+['"](.*?)['"];?/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        imports.push(importPath);
      }
    }
    
    return imports;
  }

  extractExports(content) {
    const exports = [];
    
    // Extract class exports
    const classRegex = /export\s+class\s+(\w+)/g;
    let match;
    while ((match = classRegex.exec(content)) !== null) {
      exports.push({ type: 'class', name: match[1] });
    }
    
    // Extract function exports
    const functionRegex = /export\s+(async\s+)?function\s+(\w+)/g;
    while ((match = functionRegex.exec(content)) !== null) {
      exports.push({ type: 'function', name: match[2] });
    }
    
    // Extract const exports
    const constRegex = /export\s+const\s+(\w+)/g;
    while ((match = constRegex.exec(content)) !== null) {
      exports.push({ type: 'const', name: match[1] });
    }
    
    return exports;
  }

  isModuleFile(relativePath) {
    return relativePath.endsWith('.module.ts');
  }

  isServiceFile(relativePath) {
    return relativePath.endsWith('.service.ts');
  }

  isControllerFile(relativePath) {
    return relativePath.endsWith('.controller.ts');
  }

  buildDependencyGraph() {
    console.log('📊 Building dependency graph...');
    
    for (const [modulePath, moduleInfo] of this.modules) {
      for (const importPath of moduleInfo.imports) {
        const resolvedPath = this.resolveImportPath(modulePath, importPath);
        if (resolvedPath && this.modules.has(resolvedPath)) {
          // Add edge in dependency graph
          if (!moduleInfo.dependencies) {
            moduleInfo.dependencies = [];
          }
          moduleInfo.dependencies.push(resolvedPath);
        }
      }
    }
  }

  resolveImportPath(fromPath, importPath) {
    const fromDir = path.dirname(fromPath);
    let resolvedPath = path.normalize(path.join(fromDir, importPath));
    
    // Try different file extensions
    const extensions = ['.ts', '.service.ts', '.controller.ts', '.module.ts'];
    
    for (const ext of extensions) {
      const candidate = resolvedPath + ext;
      if (this.modules.has(candidate)) {
        return candidate;
      }
    }
    
    // Try index files
    const indexPath = path.join(resolvedPath, 'index.ts');
    if (this.modules.has(indexPath)) {
      return indexPath;
    }
    
    return null;
  }

  detectCircularDependencies() {
    console.log('🔄 Detecting circular dependencies...');
    
    const visited = new Set();
    const recursionStack = new Set();
    const cycles = [];
    
    for (const [modulePath] of this.modules) {
      if (!visited.has(modulePath)) {
        const cycle = this.findCycleDFS(modulePath, visited, recursionStack, []);
        if (cycle) {
          cycles.push(cycle);
        }
      }
    }
    
    this.circularDeps = cycles;
    this.analysisReport.circularDependencies = cycles;
  }

  findCycleDFS(modulePath, visited, recursionStack, path) {
    visited.add(modulePath);
    recursionStack.add(modulePath);
    path.push(modulePath);
    
    const moduleInfo = this.modules.get(modulePath);
    if (moduleInfo?.dependencies) {
      for (const dependency of moduleInfo.dependencies) {
        if (!visited.has(dependency)) {
          const cycle = this.findCycleDFS(dependency, visited, recursionStack, [...path]);
          if (cycle) return cycle;
        } else if (recursionStack.has(dependency)) {
          // Found cycle
          const cycleStart = path.indexOf(dependency);
          return path.slice(cycleStart).concat([dependency]);
        }
      }
    }
    
    recursionStack.delete(modulePath);
    return null;
  }

  analyzeModuleStructure() {
    console.log('🏗️ Analyzing module structure...');
    
    const structure = {};
    
    for (const [modulePath, moduleInfo] of this.modules) {
      const parts = modulePath.split('/');
      const category = parts[0] || 'root';
      
      if (!structure[category]) {
        structure[category] = {
          modules: [],
          services: [],
          controllers: [],
          files: 0,
          dependencies: 0
        };
      }
      
      structure[category].files++;
      
      if (moduleInfo.isModule) {
        structure[category].modules.push(modulePath);
      } else if (moduleInfo.isService) {
        structure[category].services.push(modulePath);
      } else if (moduleInfo.isController) {
        structure[category].controllers.push(modulePath);
      }
      
      if (moduleInfo.dependencies) {
        structure[category].dependencies += moduleInfo.dependencies.length;
      }
    }
    
    this.analysisReport.moduleStructure = structure;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Check for circular dependencies
    if (this.circularDeps.length > 0) {
      recommendations.push({
        type: 'error',
        category: 'Circular Dependencies',
        message: `Found ${this.circularDeps.length} circular dependency cycles`,
        action: 'Refactor modules to remove circular imports using forwardRef() or restructuring'
      });
    }
    
    // Check for deeply nested dependencies
    for (const [modulePath, moduleInfo] of this.modules) {
      if (moduleInfo.dependencies && moduleInfo.dependencies.length > 10) {
        recommendations.push({
          type: 'warning',
          category: 'High Coupling',
          message: `${modulePath} has ${moduleInfo.dependencies.length} dependencies`,
          action: 'Consider breaking this module into smaller, more focused modules'
        });
      }
    }
    
    // Check for modules without proper separation
    const modulesByCategory = {};
    for (const [modulePath] of this.modules) {
      const category = modulePath.split('/')[0];
      if (!modulesByCategory[category]) {
        modulesByCategory[category] = 0;
      }
      modulesByCategory[category]++;
    }
    
    for (const [category, count] of Object.entries(modulesByCategory)) {
      if (count > 20) {
        recommendations.push({
          type: 'info',
          category: 'Module Organization',
          message: `${category} category has ${count} files`,
          action: 'Consider splitting into smaller, domain-specific modules'
        });
      }
    }
    
    this.analysisReport.recommendations = recommendations;
  }

  createReport() {
    const report = {
      ...this.analysisReport,
      totalModules: this.modules.size,
      timestamp: new Date().toISOString(),
      summary: this.generateSummary()
    };
    
    return report;
  }

  generateSummary() {
    const hasCircularDeps = this.circularDeps.length > 0;
    const warningCount = this.analysisReport.recommendations.filter(r => r.type === 'warning').length;
    const errorCount = this.analysisReport.recommendations.filter(r => r.type === 'error').length;
    
    let status = 'healthy';
    if (errorCount > 0) {
      status = 'critical';
    } else if (warningCount > 3) {
      status = 'warning';
    }
    
    return {
      status,
      hasCircularDependencies: hasCircularDeps,
      totalIssues: errorCount + warningCount,
      moduleCount: this.modules.size,
      mostComplexModule: this.findMostComplexModule()
    };
  }

  findMostComplexModule() {
    let maxDeps = 0;
    let mostComplex = null;
    
    for (const [modulePath, moduleInfo] of this.modules) {
      const depCount = moduleInfo.dependencies?.length || 0;
      if (depCount > maxDeps) {
        maxDeps = depCount;
        mostComplex = {
          path: modulePath,
          dependencies: depCount
        };
      }
    }
    
    return mostComplex;
  }

  printReport() {
    const report = this.createReport();
    
    console.log('\n📋 DEPENDENCY ANALYSIS REPORT');
    console.log('================================');
    console.log(`📊 Total Modules: ${report.totalModules}`);
    console.log(`🚨 Status: ${report.summary.status.toUpperCase()}`);
    console.log(`⚠️  Total Issues: ${report.summary.totalIssues}`);
    
    if (report.summary.hasCircularDependencies) {
      console.log('\n❌ CIRCULAR DEPENDENCIES FOUND:');
      report.circularDependencies.forEach((cycle, index) => {
        console.log(`   ${index + 1}. ${cycle.join(' → ')}`);
      });
    }
    
    if (report.summary.mostComplexModule) {
      console.log(`\n🏗️  Most Complex Module: ${report.summary.mostComplexModule.path} (${report.summary.mostComplexModule.dependencies} deps)`);
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      report.recommendations.forEach((rec, index) => {
        const icon = rec.type === 'error' ? '❌' : rec.type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`   ${index + 1}. ${icon} [${rec.category}] ${rec.message}`);
        console.log(`      → ${rec.action}`);
      });
    }
    
    console.log('\n🎯 MODULE STRUCTURE:');
    Object.entries(report.moduleStructure).forEach(([category, info]) => {
      console.log(`   📁 ${category}: ${info.files} files, ${info.dependencies} dependencies`);
      if (info.modules.length > 0) {
        console.log(`      └ Modules: ${info.modules.length}`);
      }
    });
    
    return report;
  }
}

// Main execution
async function main() {
  const srcDir = path.join(__dirname, '../src');
  
  if (!fs.existsSync(srcDir)) {
    console.error('❌ Source directory not found:', srcDir);
    process.exit(1);
  }
  
  const analyzer = new DependencyAnalyzer(srcDir);
  const report = await analyzer.analyze();
  analyzer.printReport();
  
  // Save detailed report
  const reportPath = path.join(__dirname, '../dependency-analysis-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Detailed report saved: ${reportPath}`);
  
  // Exit with appropriate code
  process.exit(report.summary.status === 'critical' ? 1 : 0);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { DependencyAnalyzer };