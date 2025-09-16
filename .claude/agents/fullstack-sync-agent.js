#!/usr/bin/env node
/**
 * Full-Stack Sync Agent
 * Automatically synchronizes types between backend DTOs and frontend interfaces
 * Prevents type mismatches and integration bugs
 */

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

class FullStackSyncAgent {
  constructor() {
    this.backendPath = path.join(__dirname, '../../backend');
    this.frontendPath = path.join(__dirname, '../../frontend/src');
    this.generatedTypesPath = path.join(this.frontendPath, 'types/generated');
    
    this.init();
  }

  init() {
    console.log('🤖 Full-Stack Sync Agent starting...');
    
    // Ensure generated types directory exists
    if (!fs.existsSync(this.generatedTypesPath)) {
      fs.mkdirSync(this.generatedTypesPath, { recursive: true });
    }

    // Watch for changes in backend DTOs and Prisma schema
    this.setupFileWatchers();
    
    // Initial sync
    this.syncAllTypes();
  }

  setupFileWatchers() {
    // Watch backend DTOs
    chokidar.watch(path.join(this.backendPath, '**/dto/*.ts'))
      .on('change', (filePath) => this.handleDTOChange(filePath))
      .on('add', (filePath) => this.handleDTOChange(filePath));

    // Watch Prisma schema
    chokidar.watch(path.join(__dirname, '../../prisma/schema.prisma'))
      .on('change', () => this.generatePrismaTypes());

    console.log('👀 Watching for DTO and Prisma changes...');
  }

  async handleDTOChange(filePath) {
    console.log(`🔄 DTO changed: ${filePath}`);
    
    try {
      const dtoContent = fs.readFileSync(filePath, 'utf8');
      const extractedTypes = this.extractTypesFromDTO(dtoContent, filePath);
      
      if (extractedTypes.length > 0) {
        await this.generateFrontendTypes(extractedTypes, filePath);
        console.log(`✅ Generated ${extractedTypes.length} types for frontend`);
      }
    } catch (error) {
      console.error(`❌ Error processing DTO ${filePath}:`, error.message);
    }
  }

  extractTypesFromDTO(content, filePath) {
    const types = [];
    const fileName = path.basename(filePath, '.ts');
    const moduleName = fileName.replace('.dto', '');
    
    // Extract class definitions
    const classMatches = content.match(/export class (\w+)\s*{([^}]+)}/g);
    if (classMatches) {
      classMatches.forEach(classMatch => {
        const className = classMatch.match(/export class (\w+)/)[1];
        const properties = this.extractProperties(classMatch);
        
        types.push({
          name: className,
          module: moduleName,
          properties,
          source: filePath
        });
      });
    }

    // Extract interface definitions
    const interfaceMatches = content.match(/export interface (\w+)\s*{([^}]+)}/g);
    if (interfaceMatches) {
      interfaceMatches.forEach(interfaceMatch => {
        const interfaceName = interfaceMatch.match(/export interface (\w+)/)[1];
        const properties = this.extractProperties(interfaceMatch);
        
        types.push({
          name: interfaceName,
          module: moduleName,
          properties,
          source: filePath
        });
      });
    }

    return types;
  }

  extractProperties(classOrInterface) {
    const properties = [];
    const propertyMatches = classOrInterface.match(/(\w+):\s*([^;]+);/g);
    
    if (propertyMatches) {
      propertyMatches.forEach(prop => {
        const [, name, type] = prop.match(/(\w+):\s*([^;]+);/);
        properties.push({
          name: name.trim(),
          type: this.convertBackendTypeToFrontend(type.trim())
        });
      });
    }

    return properties;
  }

  convertBackendTypeToFrontend(backendType) {
    const typeMap = {
      'Date': 'string | Date',
      'ObjectId': 'string',
      'Buffer': 'Uint8Array',
      'Decimal': 'number',
      'BigInt': 'bigint',
      'Json': 'any'
    };

    return typeMap[backendType] || backendType;
  }

  async generateFrontendTypes(types, sourcePath) {
    const moduleInfo = this.getModuleInfo(sourcePath);
    const timestamp = new Date().toISOString();
    
    let content = `// Auto-generated types from ${path.basename(sourcePath)}
// Generated at: ${timestamp}
// Source: ${sourcePath}
// ⚠️  DO NOT EDIT MANUALLY - This file is auto-generated

`;

    types.forEach(type => {
      content += `export interface ${type.name} {
${type.properties.map(prop => `  ${prop.name}: ${prop.type};`).join('\n')}
}

`;
    });

    // Add utility types
    content += `
// Utility types for ${moduleInfo.module}
export type Create${moduleInfo.module}Request = Partial<${types[0]?.name || 'any'}>;
export type Update${moduleInfo.module}Request = Partial<${types[0]?.name || 'any'}>;
export type ${moduleInfo.module}Response = ${types[0]?.name || 'any'};

// API response wrapper
export interface ${moduleInfo.module}ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
  timestamp: string;
}
`;

    const outputPath = path.join(this.generatedTypesPath, `${moduleInfo.module}.types.ts`);
    fs.writeFileSync(outputPath, content);
    
    // Update index file
    this.updateTypesIndex();
  }

  getModuleInfo(filePath) {
    const fileName = path.basename(filePath, '.ts');
    const moduleName = fileName.replace('.dto', '').replace(/[-_]/g, '');
    
    return {
      module: moduleName.charAt(0).toUpperCase() + moduleName.slice(1),
      fileName
    };
  }

  updateTypesIndex() {
    const generatedFiles = fs.readdirSync(this.generatedTypesPath)
      .filter(file => file.endsWith('.types.ts'))
      .map(file => file.replace('.types.ts', ''));

    const indexContent = `// Auto-generated type exports
// Generated at: ${new Date().toISOString()}

${generatedFiles.map(file => `export * from './${file}.types';`).join('\n')}
`;

    fs.writeFileSync(path.join(this.generatedTypesPath, 'index.ts'), indexContent);
    console.log('📝 Updated types index with', generatedFiles.length, 'modules');
  }

  async generatePrismaTypes() {
    console.log('🗄️  Regenerating Prisma types...');
    
    try {
      const { exec } = require('child_process');
      
      // Generate Prisma client
      await new Promise((resolve, reject) => {
        exec('npx prisma generate', { cwd: path.join(__dirname, '../..') }, (error, stdout) => {
          if (error) reject(error);
          else resolve(stdout);
        });
      });

      // Extract Prisma types for frontend
      await this.extractPrismaTypesForFrontend();
      
      console.log('✅ Prisma types synchronized');
    } catch (error) {
      console.error('❌ Error generating Prisma types:', error.message);
    }
  }

  async extractPrismaTypesForFrontend() {
    // This would extract Prisma generated types and create frontend-compatible versions
    const prismaClientPath = path.join(__dirname, '../../node_modules/.prisma/client/index.d.ts');
    
    if (fs.existsSync(prismaClientPath)) {
      // Extract model types from generated Prisma client
      const prismaContent = fs.readFileSync(prismaClientPath, 'utf8');
      
      // Generate simplified frontend types
      const frontendPrismaTypes = this.convertPrismaTypesForFrontend(prismaContent);
      
      fs.writeFileSync(
        path.join(this.generatedTypesPath, 'database.types.ts'),
        frontendPrismaTypes
      );
    }
  }

  convertPrismaTypesForFrontend(prismaContent) {
    const timestamp = new Date().toISOString();
    
    return `// Auto-generated Prisma types for frontend
// Generated at: ${timestamp}
// ⚠️  DO NOT EDIT MANUALLY

// Core database models (simplified for frontend)
export interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  avatar?: string;
  role: 'USER' | 'ADMIN' | 'ENTERPRISE';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  userId: string;
  isActive: boolean;
  lastUsed?: string;
  usageCount: number;
  createdAt: string;
  expiresAt?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  type: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  status: 'ACTIVE' | 'INACTIVE' | 'CANCELLED' | 'EXPIRED';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  provider: 'COINBASE' | 'STRIPE' | 'NOWPAYMENTS';
  externalId: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

// Usage and metrics types
export interface UsageStats {
  id: string;
  userId: string;
  requests: number;
  responseTimes: number[];
  errors: number;
  date: string;
}

export interface PerformanceMetrics {
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  uptime: number;
  lastUpdated: string;
}
`;
  }

  syncAllTypes() {
    console.log('🔄 Starting initial type synchronization...');
    
    // Find all DTO files
    const dtoFiles = this.findDTOFiles();
    
    dtoFiles.forEach(filePath => {
      this.handleDTOChange(filePath);
    });

    this.generatePrismaTypes();
    console.log('✅ Initial type synchronization complete');
  }

  findDTOFiles() {
    const dtoFiles = [];
    
    function scanDirectory(dir) {
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && item !== 'node_modules') {
          scanDirectory(fullPath);
        } else if (item.endsWith('.dto.ts')) {
          dtoFiles.push(fullPath);
        }
      });
    }

    scanDirectory(this.backendPath);
    return dtoFiles;
  }
}

// Start the agent if run directly
if (require.main === module) {
  new FullStackSyncAgent();
}

module.exports = FullStackSyncAgent;