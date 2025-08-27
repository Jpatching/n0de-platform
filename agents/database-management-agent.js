#!/usr/bin/env node

/**
 * Database Management Agent
 * Automated database operations, backups, and optimization
 */

import pg from 'pg';
import Redis from 'ioredis';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

class DatabaseManagementAgent {
  constructor(config = {}) {
    this.config = {
      postgresUrl: config.postgresUrl || process.env.DATABASE_URL,
      redisUrl: config.redisUrl || process.env.REDIS_URL,
      backupPath: config.backupPath || './backups',
      maxBackups: config.maxBackups || 7,
      autoOptimize: config.autoOptimize || true
    };
    
    this.pgClient = null;
    this.redisClient = null;
    this.metrics = {
      tables: [],
      totalRows: 0,
      databaseSize: 0,
      cacheHitRate: 0,
      slowQueries: []
    };
  }

  async connect() {
    // PostgreSQL connection
    if (this.config.postgresUrl) {
      try {
        const { Client } = pg;
        this.pgClient = new Client({
          connectionString: this.config.postgresUrl,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        await this.pgClient.connect();
        console.log(chalk.green('✅ PostgreSQL connected'));
      } catch (error) {
        console.error(chalk.red('❌ PostgreSQL connection failed:'), error.message);
      }
    }
    
    // Redis connection
    if (this.config.redisUrl) {
      try {
        this.redisClient = new Redis(this.config.redisUrl);
        await this.redisClient.ping();
        console.log(chalk.green('✅ Redis connected'));
      } catch (error) {
        console.error(chalk.red('❌ Redis connection failed:'), error.message);
      }
    }
  }

  async analyzeDatabaseHealth() {
    if (!this.pgClient) {
      console.log(chalk.yellow('⚠️ PostgreSQL not connected'));
      return;
    }
    
    console.log(chalk.blue('🔍 Analyzing database health...'));
    
    try {
      // Get table information
      const tablesResult = await this.pgClient.query(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
          n_live_tup AS row_count
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `);
      
      this.metrics.tables = tablesResult.rows;
      this.metrics.totalRows = tablesResult.rows.reduce((sum, table) => sum + parseInt(table.row_count), 0);
      
      // Get database size
      const sizeResult = await this.pgClient.query(`
        SELECT pg_database_size(current_database()) AS size,
               pg_size_pretty(pg_database_size(current_database())) AS size_pretty
      `);
      
      this.metrics.databaseSize = sizeResult.rows[0].size_pretty;
      
      // Get slow queries
      const slowQueriesResult = await this.pgClient.query(`
        SELECT 
          calls,
          mean_exec_time,
          query
        FROM pg_stat_statements
        WHERE mean_exec_time > 100
        ORDER BY mean_exec_time DESC
        LIMIT 10
      `).catch(() => ({ rows: [] })); // pg_stat_statements might not be enabled
      
      this.metrics.slowQueries = slowQueriesResult.rows;
      
      // Check for unused indexes
      const unusedIndexesResult = await this.pgClient.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
        AND indexrelname NOT LIKE '%_pkey'
      `);
      
      this.metrics.unusedIndexes = unusedIndexesResult.rows;
      
      console.log(chalk.green('✅ Database health analysis complete'));
      
    } catch (error) {
      console.error(chalk.red('❌ Database analysis failed:'), error.message);
    }
  }

  async analyzeCacheHealth() {
    if (!this.redisClient) {
      console.log(chalk.yellow('⚠️ Redis not connected'));
      return;
    }
    
    console.log(chalk.blue('🔍 Analyzing cache health...'));
    
    try {
      // Get Redis info
      const info = await this.redisClient.info('stats');
      const stats = this.parseRedisInfo(info);
      
      this.metrics.cacheHitRate = stats.keyspace_hits 
        ? (stats.keyspace_hits / (stats.keyspace_hits + stats.keyspace_misses) * 100).toFixed(2)
        : 0;
      
      // Get memory usage
      const memoryInfo = await this.redisClient.info('memory');
      const memoryStats = this.parseRedisInfo(memoryInfo);
      this.metrics.cacheMemory = memoryStats.used_memory_human;
      
      // Get key count
      const dbSize = await this.redisClient.dbsize();
      this.metrics.cacheKeys = dbSize;
      
      console.log(chalk.green('✅ Cache health analysis complete'));
      
    } catch (error) {
      console.error(chalk.red('❌ Cache analysis failed:'), error.message);
    }
  }

  parseRedisInfo(info) {
    const lines = info.split('\\r\\n');
    const result = {};
    
    lines.forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key] = value;
        }
      }
    });
    
    return result;
  }

  async performBackup() {
    console.log(chalk.blue('💾 Starting database backup...'));
    
    // Ensure backup directory exists
    await fs.mkdir(this.config.backupPath, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.config.backupPath, `backup-${timestamp}.sql`);
    
    if (this.pgClient) {
      try {
        // Export schema and data
        const { execSync } = await import('child_process');
        const databaseUrl = this.config.postgresUrl;
        
        execSync(`pg_dump ${databaseUrl} > ${backupFile}`, {
          encoding: 'utf8',
          stdio: 'pipe'
        });
        
        console.log(chalk.green(`✅ Database backed up to ${backupFile}`));
        
        // Cleanup old backups
        await this.cleanupOldBackups();
        
        return backupFile;
      } catch (error) {
        console.error(chalk.red('❌ Backup failed:'), error.message);
      }
    }
  }

  async cleanupOldBackups() {
    const files = await fs.readdir(this.config.backupPath);
    const backupFiles = files
      .filter(file => file.startsWith('backup-') && file.endsWith('.sql'))
      .sort()
      .reverse();
    
    if (backupFiles.length > this.config.maxBackups) {
      const filesToDelete = backupFiles.slice(this.config.maxBackups);
      
      for (const file of filesToDelete) {
        await fs.unlink(path.join(this.config.backupPath, file));
        console.log(chalk.yellow(`🗑️ Deleted old backup: ${file}`));
      }
    }
  }

  async optimizeDatabase() {
    if (!this.pgClient || !this.config.autoOptimize) {
      return;
    }
    
    console.log(chalk.blue('⚡ Optimizing database...'));
    
    try {
      // Run VACUUM ANALYZE on all tables
      const tables = this.metrics.tables || [];
      
      for (const table of tables) {
        await this.pgClient.query(`VACUUM ANALYZE ${table.schemaname}.${table.tablename}`);
        console.log(chalk.green(`  ✅ Optimized ${table.tablename}`));
      }
      
      // Reindex tables if needed
      for (const table of tables) {
        if (parseInt(table.row_count) > 10000) {
          await this.pgClient.query(`REINDEX TABLE ${table.schemaname}.${table.tablename}`);
          console.log(chalk.green(`  ✅ Reindexed ${table.tablename}`));
        }
      }
      
      console.log(chalk.green('✅ Database optimization complete'));
      
    } catch (error) {
      console.error(chalk.red('❌ Optimization failed:'), error.message);
    }
  }

  async clearCache(pattern = null) {
    if (!this.redisClient) {
      return;
    }
    
    console.log(chalk.blue('🗑️ Clearing cache...'));
    
    try {
      if (pattern) {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
          console.log(chalk.green(`✅ Cleared ${keys.length} cache keys matching ${pattern}`));
        }
      } else {
        await this.redisClient.flushdb();
        console.log(chalk.green('✅ Cleared all cache'));
      }
    } catch (error) {
      console.error(chalk.red('❌ Cache clear failed:'), error.message);
    }
  }

  generateReport() {
    console.log(chalk.blue.bold('\\n📊 Database Management Report'));
    console.log('='.repeat(50));
    
    // PostgreSQL metrics
    if (this.pgClient) {
      console.log(chalk.cyan('\\n🐘 PostgreSQL:'));
      console.log(`  Database size: ${this.metrics.databaseSize || 'N/A'}`);
      console.log(`  Total tables: ${this.metrics.tables.length}`);
      console.log(`  Total rows: ${this.metrics.totalRows.toLocaleString()}`);
      
      if (this.metrics.tables.length > 0) {
        console.log(chalk.gray('  Top tables by size:'));
        this.metrics.tables.slice(0, 3).forEach(table => {
          console.log(`    - ${table.tablename}: ${table.size} (${parseInt(table.row_count).toLocaleString()} rows)`);
        });
      }
      
      if (this.metrics.slowQueries && this.metrics.slowQueries.length > 0) {
        console.log(chalk.yellow('  ⚠️ Slow queries detected: ' + this.metrics.slowQueries.length));
      }
      
      if (this.metrics.unusedIndexes && this.metrics.unusedIndexes.length > 0) {
        console.log(chalk.yellow('  ⚠️ Unused indexes: ' + this.metrics.unusedIndexes.length));
      }
    }
    
    // Redis metrics
    if (this.redisClient) {
      console.log(chalk.cyan('\\n📦 Redis:'));
      console.log(`  Cache keys: ${this.metrics.cacheKeys || 'N/A'}`);
      console.log(`  Hit rate: ${this.metrics.cacheHitRate}%`);
      console.log(`  Memory usage: ${this.metrics.cacheMemory || 'N/A'}`);
    }
    
    // Health score
    let score = 100;
    if (this.metrics.slowQueries && this.metrics.slowQueries.length > 0) score -= 10;
    if (this.metrics.unusedIndexes && this.metrics.unusedIndexes.length > 0) score -= 10;
    if (this.metrics.cacheHitRate && this.metrics.cacheHitRate < 80) score -= 10;
    
    const scoreColor = score >= 80 ? chalk.green : score >= 60 ? chalk.yellow : chalk.red;
    
    console.log(chalk.blue('\\n🎯 Database Health Score:'));
    console.log(scoreColor(`  ${score}/100`));
    
    if (score < 100) {
      console.log(chalk.yellow('\\n💡 Recommendations:'));
      if (this.metrics.slowQueries && this.metrics.slowQueries.length > 0) {
        console.log('  - Optimize slow queries');
      }
      if (this.metrics.unusedIndexes && this.metrics.unusedIndexes.length > 0) {
        console.log('  - Remove unused indexes');
      }
      if (this.metrics.cacheHitRate && this.metrics.cacheHitRate < 80) {
        console.log('  - Improve cache hit rate');
      }
    }
    
    return {
      score,
      metrics: this.metrics
    };
  }

  async run() {
    console.log(chalk.blue.bold('🤖 Database Management Agent Started'));
    
    // Connect to databases
    await this.connect();
    
    // Analyze health
    await this.analyzeDatabaseHealth();
    await this.analyzeCacheHealth();
    
    // Perform maintenance
    if (this.config.autoOptimize) {
      await this.optimizeDatabase();
    }
    
    // Generate report
    return this.generateReport();
  }

  async disconnect() {
    if (this.pgClient) await this.pgClient.end();
    if (this.redisClient) await this.redisClient.quit();
  }
}

// Export for use as module
export default DatabaseManagementAgent;

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const agent = new DatabaseManagementAgent();
  agent.run().then(() => agent.disconnect());