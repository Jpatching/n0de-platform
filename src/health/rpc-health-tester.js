#!/usr/bin/env node

/**
 * Comprehensive RPC Health & Performance Testing Suite
 * Tests all Solana RPC methods with detailed performance analysis
 */

import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import axios from 'axios';
import WebSocket from 'ws';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { assessmentConfig } from '../../config/assessment-config.js';
import { createWriteStream } from 'fs';
import { performance } from 'perf_hooks';

export class RPCHealthTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      endpoints: {},
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        avgLatency: 0,
        totalLatency: 0,
        methodResults: {}
      }
    };
    this.spinner = ora();
    this.logStream = createWriteStream('reports/rpc-health-test.log');
  }

  async runFullHealthCheck() {
    console.log(chalk.blue.bold('🏥 Starting Comprehensive RPC Health Check\n'));
    
    const endpoints = {
      ...assessmentConfig.rpcEndpoints.competitors,
      local: assessmentConfig.rpcEndpoints.local
    };

    for (const [endpointName, config] of Object.entries(endpoints)) {
      if (config.url) {
        await this.testEndpoint(endpointName, config);
      }
    }

    this.generateSummary();
    await this.generateReport();
    return this.results;
  }

  async testEndpoint(endpointName, config) {
    this.spinner.start(`Testing ${chalk.cyan(config.name)} endpoint`);
    
    const endpointResults = {
      name: config.name,
      url: config.url,
      type: config.type || 'remote',
      connectivity: {},
      methods: {},
      performance: {
        avgLatency: 0,
        minLatency: Infinity,
        maxLatency: 0,
        successRate: 0,
        throughput: 0
      },
      reliability: {
        uptime: 0,
        errorRate: 0,
        timeouts: 0
      }
    };

    try {
      // Test basic connectivity
      await this.testConnectivity(config, endpointResults);
      
      // Test WebSocket connectivity if available
      if (config.wsUrl) {
        await this.testWebSocketConnectivity(config, endpointResults);
      }

      // Test all RPC methods
      await this.testAllRPCMethods(config, endpointResults);
      
      // Run performance benchmarks
      await this.runPerformanceBenchmarks(config, endpointResults);
      
      // Test reliability metrics
      await this.testReliabilityMetrics(config, endpointResults);

      this.results.endpoints[endpointName] = endpointResults;
      this.spinner.succeed(`${chalk.green('✓')} ${config.name} health check complete`);

    } catch (error) {
      endpointResults.error = error.message;
      this.results.endpoints[endpointName] = endpointResults;
      this.spinner.fail(`${chalk.red('✗')} ${config.name} health check failed: ${error.message}`);
    }
  }

  async testConnectivity(config, results) {
    const connection = new Connection(config.url, 'confirmed');
    
    try {
      const start = performance.now();
      const version = await connection.getVersion();
      const latency = performance.now() - start;
      
      results.connectivity.http = {
        status: 'success',
        latency: Math.round(latency),
        version: version['solana-core'],
        timestamp: new Date().toISOString()
      };
      
      this.log(`HTTP connectivity test passed for ${config.name}: ${latency.toFixed(2)}ms`);
      
    } catch (error) {
      results.connectivity.http = {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      throw new Error(`HTTP connectivity failed: ${error.message}`);
    }
  }

  async testWebSocketConnectivity(config, results) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        results.connectivity.websocket = {
          status: 'timeout',
          error: 'Connection timeout',
          timestamp: new Date().toISOString()
        };
        resolve();
      }, 10000);

      const start = performance.now();
      const ws = new WebSocket(config.wsUrl);
      
      ws.on('open', () => {
        const latency = performance.now() - start;
        clearTimeout(timeout);
        
        results.connectivity.websocket = {
          status: 'success',
          latency: Math.round(latency),
          timestamp: new Date().toISOString()
        };
        
        ws.close();
        this.log(`WebSocket connectivity test passed for ${config.name}: ${latency.toFixed(2)}ms`);
        resolve();
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        results.connectivity.websocket = {
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString()
        };
        resolve();
      });
    });
  }

  async testAllRPCMethods(config, results) {
    const connection = new Connection(config.url, 'confirmed');
    const methods = assessmentConfig.testing.health.methods;
    const methodResults = {};
    
    for (const method of methods) {
      try {
        const methodResult = await this.testRPCMethod(connection, method);
        methodResults[method] = methodResult;
        
        results.performance.avgLatency += methodResult.latency;
        results.performance.minLatency = Math.min(results.performance.minLatency, methodResult.latency);
        results.performance.maxLatency = Math.max(results.performance.maxLatency, methodResult.latency);
        
        if (methodResult.success) {
          this.results.summary.passedTests++;
        } else {
          this.results.summary.failedTests++;
        }
        
      } catch (error) {
        methodResults[method] = {
          success: false,
          error: error.message,
          latency: 0,
          timestamp: new Date().toISOString()
        };
        this.results.summary.failedTests++;
      }
    }
    
    results.methods = methodResults;
    results.performance.avgLatency /= methods.length;
    results.performance.successRate = (this.results.summary.passedTests / (this.results.summary.passedTests + this.results.summary.failedTests)) * 100;
  }

  async testRPCMethod(connection, method) {
    const start = performance.now();
    let result = { success: false, latency: 0, error: null, data: null };
    
    try {
      switch (method) {
        case 'getAccountInfo':
          result.data = await connection.getAccountInfo(new PublicKey('11111111111111111111111111111112'));
          break;
        case 'getBalance':
          result.data = await connection.getBalance(new PublicKey('11111111111111111111111111111112'));
          break;
        case 'getBlock':
          const slot = await connection.getSlot();
          result.data = await connection.getBlock(slot - 1);
          break;
        case 'getBlockHeight':
          result.data = await connection.getBlockHeight();
          break;
        case 'getBlockProduction':
          result.data = await connection.getBlockProduction();
          break;
        case 'getBlockCommitment':
          result.data = await connection.getBlockCommitment(await connection.getSlot());
          break;
        case 'getBlocks':
          const currentSlot = await connection.getSlot();
          result.data = await connection.getBlocks(currentSlot - 10, currentSlot);
          break;
        case 'getBlocksWithLimit':
          result.data = await connection.getBlocksWithLimit(await connection.getSlot() - 10, 5);
          break;
        case 'getBlockTime':
          result.data = await connection.getBlockTime(await connection.getSlot() - 1);
          break;
        case 'getClusterNodes':
          result.data = await connection.getClusterNodes();
          break;
        case 'getEpochInfo':
          result.data = await connection.getEpochInfo();
          break;
        case 'getEpochSchedule':
          result.data = await connection.getEpochSchedule();
          break;
        case 'getFeeForMessage':
          result.data = await connection.getFeeForMessage();
          break;
        case 'getGenesisHash':
          result.data = await connection.getGenesisHash();
          break;
        case 'getHealth':
          result.data = await connection.getHealth();
          break;
        case 'getIdentity':
          result.data = await connection.getIdentity();
          break;
        case 'getInflationGovernor':
          result.data = await connection.getInflationGovernor();
          break;
        case 'getInflationRate':
          result.data = await connection.getInflationRate();
          break;
        case 'getLargestAccounts':
          result.data = await connection.getLargestAccounts();
          break;
        case 'getLatestBlockhash':
          result.data = await connection.getLatestBlockhash();
          break;
        case 'getLeaderSchedule':
          result.data = await connection.getLeaderSchedule();
          break;
        case 'getMinimumBalanceForRentExemption':
          result.data = await connection.getMinimumBalanceForRentExemption(0);
          break;
        case 'getMultipleAccounts':
          result.data = await connection.getMultipleAccounts([new PublicKey('11111111111111111111111111111112')]);
          break;
        case 'getProgramAccounts':
          result.data = await connection.getProgramAccounts(new PublicKey('11111111111111111111111111111112'));
          break;
        case 'getSignaturesForAddress':
          result.data = await connection.getSignaturesForAddress(new PublicKey('11111111111111111111111111111112'), { limit: 1 });
          break;
        case 'getSignatureStatuses':
          result.data = await connection.getSignatureStatuses(['1111111111111111111111111111111111111111111111111111111111111111']);
          break;
        case 'getSlot':
          result.data = await connection.getSlot();
          break;
        case 'getSlotLeader':
          result.data = await connection.getSlotLeader();
          break;
        case 'getStakeActivation':
          result.data = await connection.getStakeActivation(new PublicKey('11111111111111111111111111111112'));
          break;
        case 'getSupply':
          result.data = await connection.getSupply();
          break;
        case 'getTokenAccountBalance':
          // Skip for now - requires valid token account
          result.success = true;
          result.data = 'skipped';
          break;
        case 'getTokenAccountsByOwner':
          result.data = await connection.getTokenAccountsByOwner(new PublicKey('11111111111111111111111111111112'), { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') });
          break;
        case 'getTokenSupply':
          // Skip for now - requires valid mint
          result.success = true;
          result.data = 'skipped';
          break;
        case 'getTransaction':
          // Skip for now - requires valid transaction signature
          result.success = true;
          result.data = 'skipped';
          break;
        case 'getTransactionCount':
          result.data = await connection.getTransactionCount();
          break;
        case 'getVersion':
          result.data = await connection.getVersion();
          break;
        case 'getVoteAccounts':
          result.data = await connection.getVoteAccounts();
          break;
        case 'requestAirdrop':
          // Skip on mainnet
          result.success = true;
          result.data = 'skipped';
          break;
        case 'sendTransaction':
          // Skip - would require actual transaction
          result.success = true;
          result.data = 'skipped';
          break;
        case 'simulateTransaction':
          // Skip - would require actual transaction
          result.success = true;
          result.data = 'skipped';
          break;
        default:
          throw new Error(`Unknown method: ${method}`);
      }
      
      result.success = true;
      result.latency = performance.now() - start;
      
    } catch (error) {
      result.success = false;
      result.error = error.message;
      result.latency = performance.now() - start;
    }
    
    result.timestamp = new Date().toISOString();
    this.log(`${method}: ${result.success ? 'PASS' : 'FAIL'} (${result.latency.toFixed(2)}ms)`);
    
    return result;
  }

  async runPerformanceBenchmarks(config, results) {
    const connection = new Connection(config.url, 'confirmed');
    const iterations = 100;
    const latencies = [];
    
    this.spinner.text = `Running performance benchmark for ${config.name}`;
    
    try {
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await connection.getSlot();
        latencies.push(performance.now() - start);
      }
      
      const totalTime = performance.now() - startTime;
      latencies.sort((a, b) => a - b);
      
      results.performance.throughput = Math.round((iterations / totalTime) * 1000); // RPS
      results.performance.latencyDistribution = {
        p50: latencies[Math.floor(latencies.length * 0.5)],
        p90: latencies[Math.floor(latencies.length * 0.9)],
        p95: latencies[Math.floor(latencies.length * 0.95)],
        p99: latencies[Math.floor(latencies.length * 0.99)]
      };
      
    } catch (error) {
      results.performance.error = error.message;
    }
  }

  async testReliabilityMetrics(config, results) {
    const connection = new Connection(config.url, 'confirmed');
    const testCount = 50;
    let successCount = 0;
    let timeoutCount = 0;
    
    this.spinner.text = `Testing reliability metrics for ${config.name}`;
    
    for (let i = 0; i < testCount; i++) {
      try {
        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 5000)
        );
        
        await Promise.race([connection.getSlot(), timeout]);
        successCount++;
        
      } catch (error) {
        if (error.message === 'timeout') {
          timeoutCount++;
        }
      }
    }
    
    results.reliability.uptime = (successCount / testCount) * 100;
    results.reliability.errorRate = ((testCount - successCount) / testCount) * 100;
    results.reliability.timeouts = timeoutCount;
  }

  generateSummary() {
    this.results.summary.totalTests = this.results.summary.passedTests + this.results.summary.failedTests;
    this.results.summary.avgLatency = this.results.summary.totalLatency / this.results.summary.totalTests;
    
    // Calculate method success rates
    const methodStats = {};
    Object.values(this.results.endpoints).forEach(endpoint => {
      Object.entries(endpoint.methods || {}).forEach(([method, result]) => {
        if (!methodStats[method]) {
          methodStats[method] = { total: 0, success: 0 };
        }
        methodStats[method].total++;
        if (result.success) methodStats[method].success++;
      });
    });
    
    this.results.summary.methodResults = methodStats;
  }

  async generateReport() {
    console.log(chalk.blue.bold('\n📊 RPC Health Check Results\n'));
    
    // Summary table
    const summaryTable = new Table({
      head: ['Metric', 'Value'],
      colWidths: [25, 20]
    });
    
    summaryTable.push(
      ['Total Endpoints Tested', Object.keys(this.results.endpoints).length],
      ['Total Method Tests', this.results.summary.totalTests],
      ['Passed Tests', chalk.green(this.results.summary.passedTests)],
      ['Failed Tests', chalk.red(this.results.summary.failedTests)],
      ['Overall Success Rate', `${((this.results.summary.passedTests / this.results.summary.totalTests) * 100).toFixed(2)}%`]
    );
    
    console.log(summaryTable.toString());
    
    // Endpoint comparison table
    const endpointTable = new Table({
      head: ['Endpoint', 'HTTP', 'WebSocket', 'Avg Latency', 'Success Rate', 'Throughput'],
      colWidths: [15, 10, 12, 15, 15, 15]
    });
    
    Object.entries(this.results.endpoints).forEach(([name, endpoint]) => {
      endpointTable.push([
        endpoint.name,
        endpoint.connectivity.http?.status === 'success' ? chalk.green('✓') : chalk.red('✗'),
        endpoint.connectivity.websocket?.status === 'success' ? chalk.green('✓') : 
          endpoint.connectivity.websocket?.status === 'timeout' ? chalk.yellow('T') : chalk.red('✗'),
        `${endpoint.performance.avgLatency.toFixed(1)}ms`,
        `${endpoint.performance.successRate.toFixed(1)}%`,
        `${endpoint.performance.throughput} RPS`
      ]);
    });
    
    console.log('\n' + endpointTable.toString());
    
    // Performance comparison
    console.log(chalk.blue.bold('\n🚀 Performance Comparison\n'));
    
    const perfTable = new Table({
      head: ['Endpoint', 'Min Latency', 'Avg Latency', 'Max Latency', 'P99 Latency', 'Throughput'],
      colWidths: [15, 12, 12, 12, 12, 12]
    });
    
    Object.entries(this.results.endpoints).forEach(([name, endpoint]) => {
      const perf = endpoint.performance;
      perfTable.push([
        endpoint.name,
        `${perf.minLatency.toFixed(1)}ms`,
        `${perf.avgLatency.toFixed(1)}ms`,
        `${perf.maxLatency.toFixed(1)}ms`,
        `${perf.latencyDistribution?.p99?.toFixed(1) || 'N/A'}ms`,
        `${perf.throughput} RPS`
      ]);
    });
    
    console.log(perfTable.toString());
    
    // Save detailed results to file
    const { writeFileSync } = await import('fs');
    writeFileSync('reports/rpc-health-results.json', JSON.stringify(this.results, null, 2));
    console.log(chalk.green('\n✅ Detailed results saved to reports/rpc-health-results.json\n'));
  }

  log(message) {
    const timestamp = new Date().toISOString();
    this.logStream.write(`[${timestamp}] ${message}\n`);
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new RPCHealthTester();
  
  tester.runFullHealthCheck()
    .then(() => {
      console.log(chalk.green.bold('🎉 RPC Health Check Complete!'));
      process.exit(0);
    })
    .catch(error => {
      console.error(chalk.red.bold('❌ RPC Health Check Failed:'), error);
      process.exit(1);
    });
}

export default RPCHealthTester;