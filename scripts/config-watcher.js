#!/usr/bin/env node

/**
 * Configuration File Watcher
 * Monitors configuration files and triggers appropriate actions on changes
 */

const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const crypto = require('crypto');

// File configurations to watch
const watchConfigs = [
  {
    path: '/home/sol/n0de-deploy/.env',
    name: '.env',
    action: 'reload-env',
    checksum: null
  },
  {
    path: '/home/sol/n0de-deploy/.env.local',
    name: '.env.local',
    action: 'reload-env',
    checksum: null
  },
  {
    path: '/home/sol/n0de-deploy/prisma/schema.prisma',
    name: 'Prisma Schema',
    action: 'regenerate-prisma',
    checksum: null
  },
  {
    path: '/home/sol/n0de-deploy/nginx/n0de-enhanced.conf',
    name: 'Nginx Config',
    action: 'reload-nginx',
    checksum: null
  },
  {
    path: '/home/sol/n0de-deploy/ecosystem.dev.config.js',
    name: 'PM2 Dev Config',
    action: 'reload-pm2',
    checksum: null
  }
];

// SQL migration directory
const migrationDir = '/home/sol/n0de-deploy/prisma/migrations';

// Action handlers
const actions = {
  'reload-env': async (file) => {
    console.log(`🔄 Environment file changed: ${file.name}`);
    console.log('   → Backend will reload automatically via nodemon');
    console.log('   → Frontend requires manual restart for env changes');
  },
  
  'regenerate-prisma': async (file) => {
    console.log(`📦 Prisma schema changed: ${file.name}`);
    console.log('   → Regenerating Prisma client...');
    
    await executeCommand('npx prisma generate', '/home/sol/n0de-deploy');
    
    // Check if there are pending migrations
    const migrationStatus = await executeCommand('npx prisma migrate status', '/home/sol/n0de-deploy');
    if (migrationStatus.includes('Database schema is not up to date')) {
      console.log('   → Applying pending migrations...');
      await executeCommand('npx prisma migrate dev', '/home/sol/n0de-deploy');
    }
    
    console.log('   ✅ Prisma client regenerated');
  },
  
  'reload-nginx': async (file) => {
    console.log(`🌐 Nginx config changed: ${file.name}`);
    console.log('   → Testing configuration...');
    
    const testResult = await executeCommand('nginx -t');
    if (testResult.includes('test is successful') || testResult.includes('syntax is ok')) {
      console.log('   → Reloading Nginx...');
      await executeCommand('nginx -s reload');
      console.log('   ✅ Nginx reloaded');
    } else {
      console.error('   ❌ Nginx config test failed:', testResult);
    }
  },
  
  'reload-pm2': async (file) => {
    console.log(`⚙️  PM2 config changed: ${file.name}`);
    console.log('   → PM2 will pick up changes on next restart');
  },
  
  'apply-migration': async (migrationFile) => {
    console.log(`🗃️  New migration detected: ${path.basename(migrationFile)}`);
    console.log('   → Applying migration...');
    
    await executeCommand('npx prisma migrate deploy', '/home/sol/n0de-deploy');
    console.log('   ✅ Migration applied');
  }
};

// Execute command helper
function executeCommand(command, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error && !stderr.includes('already in sync')) {
        console.error(`   ❌ Command failed: ${command}`);
        console.error(`   Error: ${stderr || error.message}`);
        reject(error);
      } else {
        resolve(stdout + stderr);
      }
    });
  });
}

// Calculate file checksum
function getFileChecksum(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    return crypto.createHash('md5').update(content).digest('hex');
  } catch (error) {
    return null;
  }
}

// Watch for SQL migrations
function watchMigrations() {
  if (!fs.existsSync(migrationDir)) return;
  
  let knownMigrations = new Set(fs.readdirSync(migrationDir));
  
  fs.watch(migrationDir, (eventType, filename) => {
    if (filename && filename.endsWith('.sql')) {
      const fullPath = path.join(migrationDir, filename);
      
      if (eventType === 'rename' && fs.existsSync(fullPath)) {
        if (!knownMigrations.has(filename)) {
          knownMigrations.add(filename);
          actions['apply-migration'](fullPath);
        }
      }
    }
  });
  
  console.log(`👁️  Watching migrations directory: ${migrationDir}`);
}

// Initialize watchers
function initWatchers() {
  console.log('🔍 Configuration File Watcher Started\n');
  console.log('Watching the following files:');
  
  for (const config of watchConfigs) {
    if (!fs.existsSync(config.path)) {
      console.log(`  ⚠️  ${config.name} - File not found`);
      continue;
    }
    
    // Calculate initial checksum
    config.checksum = getFileChecksum(config.path);
    
    // Set up watcher
    fs.watchFile(config.path, { interval: 1000 }, (curr, prev) => {
      // Check if file was actually modified (not just accessed)
      if (curr.mtime.getTime() === prev.mtime.getTime()) return;
      
      // Verify content actually changed via checksum
      const newChecksum = getFileChecksum(config.path);
      if (newChecksum === config.checksum) return;
      
      config.checksum = newChecksum;
      
      // Debounce rapid changes
      if (config.debounceTimer) {
        clearTimeout(config.debounceTimer);
      }
      
      config.debounceTimer = setTimeout(() => {
        actions[config.action](config);
        delete config.debounceTimer;
      }, 500);
    });
    
    console.log(`  ✅ ${config.name} - ${config.path}`);
  }
  
  // Watch for new migrations
  watchMigrations();
  
  console.log('\n💡 Tips:');
  console.log('  - Environment changes reload backend automatically');
  console.log('  - Prisma schema changes trigger client regeneration');
  console.log('  - Nginx config changes trigger safe reload');
  console.log('  - New SQL migrations are applied automatically');
  console.log('\nPress Ctrl+C to stop watching\n');
}

// Cleanup on exit
function cleanup() {
  console.log('\n👋 Stopping configuration watcher...');
  
  for (const config of watchConfigs) {
    if (fs.existsSync(config.path)) {
      fs.unwatchFile(config.path);
    }
  }
  
  process.exit(0);
}

// Register cleanup handlers
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start watching
initWatchers();

// Keep process alive
setInterval(() => {
  // Heartbeat to keep process running
}, 60000);