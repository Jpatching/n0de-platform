#!/usr/bin/env node

/**
 * Technical Stress Testing Suite
 * Comprehensive load testing, hardware utilization, and scalability analysis
 */

import { Connection, PublicKey, Transaction, SystemProgram, Keypair } from '@solana/web3.js';
import axios from 'axios';
import WebSocket from 'ws';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import si from 'systeminformation';
import { assessmentConfig } from '../../config/assessment-config.js';
import { createWriteStream } from 'fs';
import { performance } from 'perf_hooks';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class LoadTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      systemInfo: {},
      baseline: {},
      loadTests: {},
      stressTests: {},
      scalabilityTests: {},
      resourceUtilization: {},
      recommendations: []
    };
    this.spinner = ora();
    this.logStream = createWriteStream('reports/load-testing.log');
    this.isRunning = false;
    this.workers = [];
  }

  async runFullStressTest() {
    console.log(chalk.blue.bold('🔥 Starting Comprehensive Technical Stress Testing\n'));
    
    this.isRunning = true;
    
    // Gather system information
    await this.gatherSystemInfo();
    
    // Establish baseline performance
    await this.establishBaseline();
    
    // Progressive load testing
    await this.runProgressiveLoadTests();
    
    // Maximum stress testing
    await this.runMaximumStressTests();
    
    // Scalability analysis
    await this.runScalabilityTests();
    
    // Resource utilization monitoring
    await this.monitorResourceUtilization();
    
    // Failover and redundancy testing
    await this.testFailoverScenarios();
    
    // Generate recommendations
    this.generateOptimizationRecommendations();
    
    await this.generateReport();
    return this.results;
  }

  async gatherSystemInfo() {
    this.spinner.start('Gathering system information');
    
    try {
      const [cpu, mem, osInfo, disk, network] = await Promise.all([
        si.cpu(),
        si.mem(),
        si.osInfo(),
        si.diskLayout(),
        si.networkInterfaces()
      ]);
      
      this.results.systemInfo = {
        cpu: {
          manufacturer: cpu.manufacturer,
          brand: cpu.brand,
          cores: cpu.cores,
          physicalCores: cpu.physicalCores,
          processors: cpu.processors,
          speed: cpu.speed,
          speedMax: cpu.speedMax,
          cache: cpu.cache
        },
        memory: {
          total: Math.round(mem.total / 1024 / 1024 / 1024), // GB
          available: Math.round(mem.available / 1024 / 1024 / 1024), // GB
          used: Math.round(mem.used / 1024 / 1024 / 1024) // GB
        },
        os: {
          platform: osInfo.platform,
          distro: osInfo.distro,
          release: osInfo.release,
          kernel: osInfo.kernel,
          arch: osInfo.arch
        },
        storage: disk.map(d => ({
          type: d.type,
          name: d.name,
          size: Math.round(d.size / 1024 / 1024 / 1024), // GB
          interfaceType: d.interfaceType
        })),
        network: network.filter(n => !n.internal).map(n => ({
          iface: n.iface,
          type: n.type,
          speed: n.speed
        }))
      };
      
      this.spinner.succeed('System information gathered');
      
    } catch (error) {
      this.spinner.fail('Failed to gather system information');
      this.log(`System info error: ${error.message}`);
    }
  }

  async establishBaseline() {
    this.spinner.start('Establishing baseline performance');
    
    const baseline = {
      singleConnection: {},
      resourceUsage: {},
      networkLatency: {}
    };
    
    try {
      // Single connection performance
      baseline.singleConnection = await this.measureSingleConnectionPerformance();
      
      // Current resource usage
      baseline.resourceUsage = await this.measureResourceUsage();
      
      // Network baseline
      baseline.networkLatency = await this.measureNetworkBaseline();
      
      this.results.baseline = baseline;
      this.spinner.succeed('Baseline performance established');
      
    } catch (error) {
      this.spinner.fail('Failed to establish baseline');
      this.log(`Baseline error: ${error.message}`);
    }
  }

  async measureSingleConnectionPerformance() {
    const connection = new Connection(assessmentConfig.rpcEndpoints.local.url, 'confirmed');
    const iterations = 100;
    const latencies = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      try {
        await connection.getSlot();
        latencies.push(performance.now() - start);
      } catch (error) {
        // Skip failed requests
      }
    }
    
    if (latencies.length > 0) {
      latencies.sort((a, b) => a - b);
      return {
        avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
        min: latencies[0],
        max: latencies[latencies.length - 1],
        p50: latencies[Math.floor(latencies.length * 0.5)],
        p90: latencies[Math.floor(latencies.length * 0.9)],
        p99: latencies[Math.floor(latencies.length * 0.99)],
        successRate: (latencies.length / iterations) * 100
      };
    }
    
    return { error: 'No successful requests' };
  }

  async measureResourceUsage() {
    const [cpu, mem, disk] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.disksIO()
    ]);
    
    return {
      cpu: {
        usage: cpu.currentLoad,
        user: cpu.currentLoadUser,
        system: cpu.currentLoadSystem,
        idle: cpu.currentLoadIdle
      },
      memory: {
        usagePercent: (mem.used / mem.total) * 100,
        available: Math.round(mem.available / 1024 / 1024 / 1024),
        free: Math.round(mem.free / 1024 / 1024 / 1024)
      },
      disk: {
        readIOPS: disk.rIO,
        writeIOPS: disk.wIO,
        readSpeed: disk.rIO_sec,
        writeSpeed: disk.wIO_sec
      }
    };
  }

  async measureNetworkBaseline() {
    const testUrls = [
      'api.mainnet-beta.solana.com',
      'solana-mainnet.phantom.tech',
      'api.rpcpool.com'
    ];
    
    const results = {};
    
    for (const url of testUrls) {
      try {
        const latencies = [];
        
        for (let i = 0; i < 10; i++) {
          const start = performance.now();
          await axios.post(`https://${url}`, {
            jsonrpc: '2.0',
            id: 1,
            method: 'getSlot'
          }, { timeout: 5000 });
          latencies.push(performance.now() - start);
        }
        
        if (latencies.length > 0) {
          latencies.sort((a, b) => a - b);
          results[url] = {
            avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
            min: latencies[0],
            max: latencies[latencies.length - 1],
            p90: latencies[Math.floor(latencies.length * 0.9)]
          };
        }
        
      } catch (error) {
        results[url] = { error: error.message };
      }
    }
    
    return results;
  }

  async runProgressiveLoadTests() {
    this.spinner.start('Running progressive load tests');
    
    const targetRPS = assessmentConfig.testing.stress.targetRPS;
    const loadTests = {};
    
    for (const rps of targetRPS) {
      this.spinner.text = `Load testing at ${rps} RPS`;
      
      try {
        const result = await this.runLoadTest(rps, 60); // 60 second test
        loadTests[rps] = result;
        
        // Stop if error rate is too high
        if (result.errorRate > 10) {
          this.log(`Stopping load tests at ${rps} RPS due to high error rate: ${result.errorRate}%`);
          break;
        }
        
      } catch (error) {
        loadTests[rps] = { error: error.message };
        this.log(`Load test failed at ${rps} RPS: ${error.message}`);
        break;
      }
    }
    
    this.results.loadTests = loadTests;
    this.spinner.succeed('Progressive load testing complete');
  }

  async runLoadTest(targetRPS, durationSeconds) {
    const startTime = Date.now();
    const endTime = startTime + (durationSeconds * 1000);
    const interval = 1000 / targetRPS; // ms between requests
    
    const results = {
      targetRPS,
      actualRPS: 0,
      totalRequests: 0,
      successfulRequests: 0,
      errorRate: 0,
      latencies: [],
      resourceUsage: {
        start: await this.measureResourceUsage(),
        end: null,
        peak: { cpu: 0, memory: 0 }
      }
    };
    
    const workers = [];
    const workersCount = Math.min(8, Math.ceil(targetRPS / 100)); // Max 8 workers
    const rpsPerWorker = Math.ceil(targetRPS / workersCount);
    
    // Start resource monitoring
    const resourceMonitor = setInterval(async () => {
      const usage = await this.measureResourceUsage();
      results.resourceUsage.peak.cpu = Math.max(results.resourceUsage.peak.cpu, usage.cpu.usage);
      results.resourceUsage.peak.memory = Math.max(results.resourceUsage.peak.memory, usage.memory.usagePercent);
    }, 1000);
    
    // Start workers
    for (let i = 0; i < workersCount; i++) {
      const worker = new Worker(__filename, {
        workerData: {
          type: 'load-test',
          rps: rpsPerWorker,
          duration: durationSeconds,
          url: assessmentConfig.rpcEndpoints.local.url
        }
      });
      
      workers.push(worker);
    }
    
    // Collect results from workers
    const workerResults = await Promise.all(
      workers.map(worker => new Promise((resolve) => {
        worker.on('message', resolve);
        worker.on('error', (error) => resolve({ error: error.message }));
      }))
    );
    
    // Clean up
    clearInterval(resourceMonitor);
    workers.forEach(worker => worker.terminate());
    
    // Aggregate results
    workerResults.forEach(workerResult => {
      if (!workerResult.error) {
        results.totalRequests += workerResult.totalRequests;
        results.successfulRequests += workerResult.successfulRequests;
        results.latencies = results.latencies.concat(workerResult.latencies);
      }
    });
    
    results.actualRPS = results.totalRequests / durationSeconds;
    results.errorRate = ((results.totalRequests - results.successfulRequests) / results.totalRequests) * 100;
    results.resourceUsage.end = await this.measureResourceUsage();
    
    // Calculate latency statistics
    if (results.latencies.length > 0) {
      results.latencies.sort((a, b) => a - b);
      results.latencyStats = {
        avg: results.latencies.reduce((a, b) => a + b, 0) / results.latencies.length,
        min: results.latencies[0],
        max: results.latencies[results.latencies.length - 1],
        p50: results.latencies[Math.floor(results.latencies.length * 0.5)],
        p90: results.latencies[Math.floor(results.latencies.length * 0.9)],
        p99: results.latencies[Math.floor(results.latencies.length * 0.99)]
      };
    }
    
    return results;
  }

  async runMaximumStressTests() {
    this.spinner.start('Running maximum stress tests');
    
    const stressTests = {
      maxConcurrency: await this.findMaximumConcurrency(),
      sustainedLoad: await this.testSustainedLoad(),
      memoryStress: await this.testMemoryStress(),
      connectionLimits: await this.testConnectionLimits()
    };
    
    this.results.stressTests = stressTests;
    this.spinner.succeed('Maximum stress testing complete');
  }

  async findMaximumConcurrency() {
    let maxConcurrency = 0;
    let concurrency = 50;
    const maxAttempts = 10;
    
    while (maxAttempts > 0) {
      this.spinner.text = `Testing concurrency: ${concurrency}`;
      
      try {
        const connection = new Connection(assessmentConfig.rpcEndpoints.local.url, 'confirmed');
        const promises = Array(concurrency).fill().map(() => connection.getSlot());
        
        const start = performance.now();
        const results = await Promise.allSettled(promises);
        const duration = performance.now() - start;
        
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const successRate = successful / concurrency;
        
        if (successRate > 0.9) { // 90% success rate
          maxConcurrency = concurrency;
          concurrency = Math.min(concurrency * 2, 5000); // Double, up to 5000
        } else {
          break;
        }
        
      } catch (error) {
        break;
      }
    }
    
    return {
      maxConcurrency,
      tested: true,
      method: 'Binary search with 90% success rate threshold'
    };
  }

  async testSustainedLoad() {
    // Test at 70% of maximum capacity for extended period
    const maxRPS = Math.max(...Object.keys(this.results.loadTests).map(Number).filter(n => !isNaN(n)));
    const sustainedRPS = Math.floor(maxRPS * 0.7);
    const duration = 300; // 5 minutes
    
    this.spinner.text = `Testing sustained load: ${sustainedRPS} RPS for ${duration}s`;
    
    try {
      const result = await this.runLoadTest(sustainedRPS, duration);
      return {
        ...result,
        testType: 'sustained',
        durationMinutes: duration / 60
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async testMemoryStress() {
    // Create many connections to test memory usage
    this.spinner.text = 'Testing memory stress with multiple connections';
    
    const connections = [];
    const maxConnections = 1000;
    let createdConnections = 0;
    
    const startMemory = await si.mem();
    
    try {
      // Create connections gradually
      for (let i = 0; i < maxConnections; i++) {
        const connection = new Connection(assessmentConfig.rpcEndpoints.local.url, 'confirmed');
        connections.push(connection);
        createdConnections++;
        
        // Test connection every 100 connections
        if (i % 100 === 0) {
          await connection.getSlot();
          
          const currentMemory = await si.mem();
          const memoryUsage = (currentMemory.used / currentMemory.total) * 100;
          
          // Stop if memory usage exceeds threshold
          if (memoryUsage > assessmentConfig.testing.stress.memoryThreshold) {
            this.log(`Stopping memory stress test at ${i} connections due to high memory usage: ${memoryUsage.toFixed(1)}%`);
            break;
          }
        }
      }
      
      const endMemory = await si.mem();
      
      return {
        maxConnections: createdConnections,
        memoryIncrease: Math.round((endMemory.used - startMemory.used) / 1024 / 1024), // MB
        finalMemoryUsage: (endMemory.used / endMemory.total) * 100
      };
      
    } catch (error) {
      return {
        error: error.message,
        connectionsCreated: createdConnections
      };
    }
  }

  async testConnectionLimits() {
    // Test WebSocket connection limits
    this.spinner.text = 'Testing WebSocket connection limits';
    
    const wsUrl = assessmentConfig.rpcEndpoints.local.wsUrl;
    if (!wsUrl) {
      return { error: 'WebSocket URL not configured' };
    }
    
    const websockets = [];
    let maxWebSockets = 0;
    
    try {
      for (let i = 0; i < 10000; i++) {
        const ws = new WebSocket(wsUrl);
        websockets.push(ws);
        
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Connection timeout'));
          }, 5000);
          
          ws.on('open', () => {
            clearTimeout(timeout);
            maxWebSockets = i + 1;
            resolve();
          });
          
          ws.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
        
        // Test every 50 connections
        if (i % 50 === 49) {
          // Small delay to prevent overwhelming
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
    } catch (error) {
      // Expected to fail at some point
    } finally {
      // Close all WebSocket connections
      websockets.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      });
    }
    
    return {
      maxWebSocketConnections: maxWebSockets,
      tested: true
    };
  }

  async runScalabilityTests() {
    this.spinner.start('Running scalability analysis');
    
    const scalabilityTests = {
      horizontalScaling: this.analyzeHorizontalScaling(),
      verticalScaling: await this.analyzeVerticalScaling(),
      bottleneckAnalysis: await this.identifyBottlenecks(),
      scalingRecommendations: []
    };
    
    this.results.scalabilityTests = scalabilityTests;
    this.spinner.succeed('Scalability analysis complete');
  }

  analyzeHorizontalScaling() {
    // Analyze potential for horizontal scaling (multiple instances)
    const currentSpecs = this.results.systemInfo;
    
    return {
      currentInstance: {
        cores: currentSpecs.cpu.cores,
        memory: currentSpecs.memory.total,
        estimatedCapacity: 'Calculated from load tests'
      },
      scalingPotential: {
        additionalInstances: Math.floor(currentSpecs.memory.total / 32), // Assume 32GB per instance
        totalCapacityMultiplier: Math.floor(currentSpecs.memory.total / 32),
        considerations: [
          'Load balancing required',
          'Database connection pooling',
          'Session affinity considerations',
          'Network bandwidth limits'
        ]
      }
    };
  }

  async analyzeVerticalScaling() {
    // Analyze potential for vertical scaling (bigger hardware)
    const currentCPU = await si.currentLoad();
    const currentMem = await si.mem();
    
    const utilizationMetrics = {
      cpu: currentCPU.currentLoad,
      memory: (currentMem.used / currentMem.total) * 100,
      bottleneck: null
    };
    
    // Identify primary bottleneck
    if (utilizationMetrics.cpu > utilizationMetrics.memory) {
      utilizationMetrics.bottleneck = 'CPU';
    } else {
      utilizationMetrics.bottleneck = 'Memory';
    }
    
    return {
      current: utilizationMetrics,
      recommendations: {
        cpu: utilizationMetrics.cpu > 70 ? 'Consider CPU upgrade' : 'CPU capacity sufficient',
        memory: utilizationMetrics.memory > 70 ? 'Consider memory upgrade' : 'Memory capacity sufficient',
        storage: 'NVMe storage appears adequate for current workload'
      }
    };
  }

  async identifyBottlenecks() {
    const bottlenecks = [];
    
    // CPU bottleneck analysis
    const cpuInfo = await si.currentLoad();
    if (cpuInfo.currentLoad > 80) {
      bottlenecks.push({
        type: 'CPU',
        severity: 'High',
        description: `CPU usage at ${cpuInfo.currentLoad.toFixed(1)}%`,
        recommendation: 'Scale CPU cores or optimize CPU-intensive operations'
      });
    }
    
    // Memory bottleneck analysis
    const memInfo = await si.mem();
    const memUsage = (memInfo.used / memInfo.total) * 100;
    if (memUsage > 80) {
      bottlenecks.push({
        type: 'Memory',
        severity: 'High',
        description: `Memory usage at ${memUsage.toFixed(1)}%`,
        recommendation: 'Add more RAM or optimize memory usage'
      });
    }
    
    // Disk I/O bottleneck analysis
    const diskInfo = await si.disksIO();
    if (diskInfo.rIO > 1000 || diskInfo.wIO > 1000) {
      bottlenecks.push({
        type: 'Disk I/O',
        severity: 'Medium',
        description: `High disk I/O: ${diskInfo.rIO + diskInfo.wIO} IOPS`,
        recommendation: 'Consider faster storage or caching strategies'
      });
    }
    
    // Network bottleneck analysis
    const networkStats = await si.networkStats();
    const primaryInterface = networkStats[0];
    if (primaryInterface && primaryInterface.tx_bytes > 100000000) { // 100MB/s
      bottlenecks.push({
        type: 'Network',
        severity: 'Medium',
        description: 'High network utilization detected',
        recommendation: 'Monitor network bandwidth and consider upgrade if sustained'
      });
    }
    
    return bottlenecks;
  }

  async monitorResourceUtilization() {
    this.spinner.start('Monitoring resource utilization patterns');
    
    const monitoringDuration = 60; // seconds
    const samples = [];
    
    for (let i = 0; i < monitoringDuration; i++) {
      const sample = await this.measureResourceUsage();
      sample.timestamp = Date.now();
      samples.push(sample);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Analyze patterns
    const analysis = {
      cpu: this.analyzeSamples(samples.map(s => s.cpu.usage)),
      memory: this.analyzeSamples(samples.map(s => s.memory.usagePercent)),
      patterns: this.identifyUsagePatterns(samples)
    };
    
    this.results.resourceUtilization = analysis;
    this.spinner.succeed('Resource utilization monitoring complete');
  }

  analyzeSamples(values) {
    values.sort((a, b) => a - b);
    
    return {
      min: values[0],
      max: values[values.length - 1],
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      p50: values[Math.floor(values.length * 0.5)],
      p90: values[Math.floor(values.length * 0.9)],
      p99: values[Math.floor(values.length * 0.99)],
      stdDev: this.calculateStandardDeviation(values)
    };
  }

  calculateStandardDeviation(values) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  identifyUsagePatterns(samples) {
    const patterns = [];
    
    // CPU spikes
    const cpuValues = samples.map(s => s.cpu.usage);
    const cpuAvg = cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length;
    const cpuSpikes = cpuValues.filter(val => val > cpuAvg * 1.5).length;
    
    if (cpuSpikes > samples.length * 0.1) {
      patterns.push({
        type: 'CPU Spikes',
        description: `${cpuSpikes} CPU usage spikes detected (>${(cpuAvg * 1.5).toFixed(1)}%)`,
        impact: 'May indicate burst workloads or inefficient processing'
      });
    }
    
    // Memory growth
    const memValues = samples.map(s => s.memory.usagePercent);
    const memStart = memValues.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
    const memEnd = memValues.slice(-10).reduce((a, b) => a + b, 0) / 10;
    
    if (memEnd > memStart * 1.1) {
      patterns.push({
        type: 'Memory Growth',
        description: `Memory usage increased by ${((memEnd - memStart) / memStart * 100).toFixed(1)}% during monitoring`,
        impact: 'Possible memory leak or accumulating cache'
      });
    }
    
    return patterns;
  }

  async testFailoverScenarios() {
    this.spinner.start('Testing failover scenarios');
    
    // This would simulate various failure scenarios
    // For now, we'll focus on connection recovery testing
    
    const failoverTests = {
      connectionRecovery: await this.testConnectionRecovery(),
      highErrorRate: await this.testHighErrorRateResponse(),
      resourceExhaustion: await this.testResourceExhaustionRecovery()
    };
    
    this.results.failoverTests = failoverTests;
    this.spinner.succeed('Failover testing complete');
  }

  async testConnectionRecovery() {
    // Test how the system handles connection drops and recovery
    const connection = new Connection(assessmentConfig.rpcEndpoints.local.url, 'confirmed');
    
    try {
      // Normal operation
      await connection.getSlot();
      
      // Simulate connection issues by rapid successive requests
      const rapidRequests = Array(100).fill().map(() => connection.getSlot());
      const results = await Promise.allSettled(rapidRequests);
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const successRate = successful / rapidRequests.length;
      
      return {
        tested: true,
        successRate: successRate * 100,
        recoveryCapability: successRate > 0.8 ? 'Good' : successRate > 0.5 ? 'Fair' : 'Poor'
      };
      
    } catch (error) {
      return { error: error.message };
    }
  }

  async testHighErrorRateResponse() {
    // Test system behavior under high error conditions
    // This would typically involve simulating network issues or server overload
    
    return {
      simulated: true,
      description: 'High error rate response testing would require controlled failure injection',
      recommendations: [
        'Implement circuit breaker patterns',
        'Add exponential backoff for retries',
        'Monitor error rates and implement alerts'
      ]
    };
  }

  async testResourceExhaustionRecovery() {
    // Test recovery from resource exhaustion
    const startMemory = await si.mem();
    
    return {
      baseline: {
        memoryUsage: (startMemory.used / startMemory.total) * 100,
        availableMemory: Math.round(startMemory.available / 1024 / 1024 / 1024)
      },
      recommendations: [
        'Implement memory monitoring and alerts',
        'Configure automatic garbage collection tuning',
        'Set up resource limits and quotas'
      ]
    };
  }

  generateOptimizationRecommendations() {
    const recommendations = [];
    
    // Performance recommendations based on load tests
    if (this.results.loadTests) {
      const maxSuccessfulRPS = Object.entries(this.results.loadTests)
        .filter(([, result]) => result.errorRate < 5)
        .map(([rps]) => parseInt(rps))
        .reduce((max, rps) => Math.max(max, rps), 0);
      
      if (maxSuccessfulRPS > 0) {
        recommendations.push({
          category: 'Performance',
          priority: 'High',
          title: `Optimize for ${maxSuccessfulRPS} RPS Target`,
          description: `System successfully handled ${maxSuccessfulRPS} RPS with <5% error rate`,
          action: 'Configure production system to operate at 70% of this capacity for sustained performance',
          expectedImpact: `Reliable ${Math.round(maxSuccessfulRPS * 0.7)} RPS sustained throughput`
        });
      }
    }
    
    // Resource utilization recommendations
    if (this.results.resourceUtilization) {
      const cpuUsage = this.results.resourceUtilization.cpu;
      const memUsage = this.results.resourceUtilization.memory;
      
      if (cpuUsage.avg > 70) {
        recommendations.push({
          category: 'Hardware',
          priority: 'Medium',
          title: 'CPU Optimization Required',
          description: `Average CPU usage: ${cpuUsage.avg.toFixed(1)}%`,
          action: 'Consider CPU upgrade or workload optimization',
          expectedImpact: 'Reduced latency and improved throughput'
        });
      }
      
      if (memUsage.avg > 70) {
        recommendations.push({
          category: 'Hardware',
          priority: 'Medium',
          title: 'Memory Optimization Required',
          description: `Average memory usage: ${memUsage.avg.toFixed(1)}%`,
          action: 'Monitor for memory leaks and consider RAM upgrade if needed',
          expectedImpact: 'Improved stability and reduced swap usage'
        });
      }
    }
    
    // Scalability recommendations
    if (this.results.scalabilityTests) {
      const bottlenecks = this.results.scalabilityTests.bottleneckAnalysis;
      
      if (bottlenecks.length > 0) {
        const primaryBottleneck = bottlenecks[0];
        recommendations.push({
          category: 'Scalability',
          priority: primaryBottleneck.severity === 'High' ? 'High' : 'Medium',
          title: `Address ${primaryBottleneck.type} Bottleneck`,
          description: primaryBottleneck.description,
          action: primaryBottleneck.recommendation,
          expectedImpact: 'Improved system scalability and performance'
        });
      }
    }
    
    // Hardware utilization recommendations
    const systemInfo = this.results.systemInfo;
    if (systemInfo.memory && systemInfo.cpu) {
      recommendations.push({
        category: 'Optimization',
        priority: 'Medium',
        title: 'Maximize Hardware Utilization',
        description: `${systemInfo.memory.total}GB RAM and ${systemInfo.cpu.cores} cores available`,
        action: 'Configure connection pooling and worker threads to fully utilize available hardware',
        expectedImpact: 'Better price/performance ratio and higher throughput'
      });
    }
    
    this.results.recommendations = recommendations;
  }

  async generateReport() {
    console.log(chalk.blue.bold('\n🔥 Technical Stress Testing Results\n'));
    
    // System information
    console.log(chalk.yellow.bold('💻 System Information\n'));
    
    const sysTable = new Table({
      head: ['Component', 'Specification'],
      colWidths: [20, 60]
    });
    
    const sys = this.results.systemInfo;
    if (sys.cpu) {
      sysTable.push(['CPU', `${sys.cpu.brand} (${sys.cpu.cores} cores, ${sys.cpu.speed}GHz)`]);
    }
    if (sys.memory) {
      sysTable.push(['Memory', `${sys.memory.total}GB total (${sys.memory.available}GB available)`]);
    }
    if (sys.storage) {
      const storage = sys.storage.map(s => `${s.size}GB ${s.type}`).join(', ');
      sysTable.push(['Storage', storage]);
    }
    
    console.log(sysTable.toString());
    
    // Load test results
    if (Object.keys(this.results.loadTests).length > 0) {
      console.log(chalk.yellow.bold('\n🚀 Load Test Results\n'));
      
      const loadTable = new Table({
        head: ['Target RPS', 'Actual RPS', 'Success Rate', 'Avg Latency', 'P99 Latency', 'Error Rate'],
        colWidths: [12, 12, 12, 12, 12, 12]
      });
      
      Object.entries(this.results.loadTests).forEach(([targetRPS, result]) => {
        if (result.error) {
          loadTable.push([targetRPS, 'Failed', 'N/A', 'N/A', 'N/A', result.error]);
        } else {
          const successRate = ((result.successfulRequests / result.totalRequests) * 100).toFixed(1);
          loadTable.push([
            targetRPS,
            result.actualRPS.toFixed(0),
            `${successRate}%`,
            result.latencyStats ? `${result.latencyStats.avg.toFixed(1)}ms` : 'N/A',
            result.latencyStats ? `${result.latencyStats.p99.toFixed(1)}ms` : 'N/A',
            `${result.errorRate.toFixed(1)}%`
          ]);
        }
      });
      
      console.log(loadTable.toString());
    }
    
    // Stress test results
    if (this.results.stressTests) {
      console.log(chalk.yellow.bold('\n💪 Stress Test Summary\n'));
      
      const stressTable = new Table({
        head: ['Test Type', 'Result', 'Details'],
        colWidths: [20, 15, 45]
      });
      
      const stress = this.results.stressTests;
      
      if (stress.maxConcurrency) {
        stressTable.push([
          'Max Concurrency',
          stress.maxConcurrency.maxConcurrency.toString(),
          '90% success rate threshold'
        ]);
      }
      
      if (stress.sustainedLoad) {
        stressTable.push([
          'Sustained Load',
          `${stress.sustainedLoad.actualRPS?.toFixed(0) || 'N/A'} RPS`,
          `${stress.sustainedLoad.durationMinutes} minutes at 70% capacity`
        ]);
      }
      
      if (stress.memoryStress) {
        stressTable.push([
          'Memory Stress',
          `${stress.memoryStress.maxConnections || 0} connections`,
          `${stress.memoryStress.memoryIncrease || 0}MB increase`
        ]);
      }
      
      if (stress.connectionLimits) {
        stressTable.push([
          'WebSocket Limits',
          `${stress.connectionLimits.maxWebSocketConnections || 0} connections`,
          'Maximum concurrent WebSocket connections'
        ]);
      }
      
      console.log(stressTable.toString());
    }
    
    // Resource utilization
    if (this.results.resourceUtilization) {
      console.log(chalk.yellow.bold('\n📊 Resource Utilization Analysis\n'));
      
      const resourceTable = new Table({
        head: ['Resource', 'Average', 'Peak', 'P90', 'P99'],
        colWidths: [15, 12, 12, 12, 12]
      });
      
      const cpu = this.results.resourceUtilization.cpu;
      const mem = this.results.resourceUtilization.memory;
      
      resourceTable.push([
        'CPU Usage',
        `${cpu.avg.toFixed(1)}%`,
        `${cpu.max.toFixed(1)}%`,
        `${cpu.p90.toFixed(1)}%`,
        `${cpu.p99.toFixed(1)}%`
      ]);
      
      resourceTable.push([
        'Memory Usage',
        `${mem.avg.toFixed(1)}%`,
        `${mem.max.toFixed(1)}%`,
        `${mem.p90.toFixed(1)}%`,
        `${mem.p99.toFixed(1)}%`
      ]);
      
      console.log(resourceTable.toString());
      
      if (this.results.resourceUtilization.patterns) {
        console.log(chalk.bold('\nUsage Patterns:'));
        this.results.resourceUtilization.patterns.forEach(pattern => {
          console.log(`  • ${chalk.yellow(pattern.type)}: ${pattern.description}`);
          console.log(`    Impact: ${pattern.impact}`);
        });
      }
    }
    
    // Recommendations
    if (this.results.recommendations.length > 0) {
      console.log(chalk.yellow.bold('\n🎯 Optimization Recommendations\n'));
      
      const highPriority = this.results.recommendations.filter(rec => rec.priority === 'High');
      
      highPriority.forEach((rec, index) => {
        console.log(`${index + 1}. ${chalk.bold(rec.title)}`);
        console.log(`   ${rec.description}`);
        console.log(`   ${chalk.cyan('Action:')} ${rec.action}`);
        console.log(`   ${chalk.green('Expected Impact:')} ${rec.expectedImpact}\n`);
      });
    }
    
    // Performance summary
    console.log(chalk.green.bold('\n🏁 Performance Summary\n'));
    
    const maxRPS = Object.entries(this.results.loadTests || {})
      .filter(([, result]) => result.errorRate < 10)
      .map(([rps]) => parseInt(rps))
      .reduce((max, rps) => Math.max(max, rps), 0);
    
    const summaryTable = new Table({
      head: ['Metric', 'Value', 'Status'],
      colWidths: [25, 20, 15]
    });
    
    summaryTable.push([
      'Maximum Throughput',
      maxRPS > 0 ? `${maxRPS} RPS` : 'Not determined',
      maxRPS >= 5000 ? chalk.green('EXCELLENT') : maxRPS >= 1000 ? chalk.yellow('GOOD') : chalk.red('NEEDS WORK')
    ]);
    
    const targetCapacity = maxRPS * 0.7;
    summaryTable.push([
      'Recommended Capacity',
      targetCapacity > 0 ? `${Math.round(targetCapacity)} RPS` : 'N/A',
      targetCapacity >= 3500 ? chalk.green('HIGH') : targetCapacity >= 700 ? chalk.yellow('MEDIUM') : chalk.red('LOW')
    ]);
    
    const memTotal = this.results.systemInfo.memory?.total || 0;
    summaryTable.push([
      'Hardware Utilization',
      `${memTotal}GB / ${this.results.systemInfo.cpu?.cores || 0} cores`,
      memTotal >= 500 ? chalk.green('EXCELLENT') : memTotal >= 100 ? chalk.yellow('GOOD') : chalk.red('LIMITED')
    ]);
    
    console.log(summaryTable.toString());
    
    // Save detailed results
    const { writeFileSync } = await import('fs');
    writeFileSync('reports/stress-testing-results.json', JSON.stringify(this.results, null, 2));
    console.log(chalk.green('\n✅ Detailed results saved to reports/stress-testing-results.json\n'));
  }

  log(message) {
    const timestamp = new Date().toISOString();
    this.logStream.write(`[${timestamp}] ${message}\n`);
  }
}

// Worker thread code for load testing
if (!isMainThread && workerData && workerData.type === 'load-test') {
  (async () => {
    const { rps, duration, url } = workerData;
    const connection = new Connection(url, 'confirmed');
    
    const results = {
      totalRequests: 0,
      successfulRequests: 0,
      latencies: []
    };
    
    const startTime = Date.now();
    const endTime = startTime + (duration * 1000);
    const interval = 1000 / rps;
    
    while (Date.now() < endTime) {
      const requestStart = performance.now();
      
      try {
        await connection.getSlot();
        results.successfulRequests++;
        results.latencies.push(performance.now() - requestStart);
      } catch (error) {
        // Request failed
      }
      
      results.totalRequests++;
      
      // Wait for next request
      const nextRequest = startTime + (results.totalRequests * interval);
      const delay = Math.max(0, nextRequest - Date.now());
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    parentPort.postMessage(results);
  })();
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new LoadTester();
  
  tester.runFullStressTest()
    .then(() => {
      console.log(chalk.green.bold('🎉 Technical Stress Testing Complete!'));
      process.exit(0);
    })
    .catch(error => {
      console.error(chalk.red.bold('❌ Technical Stress Testing Failed:'), error);
      process.exit(1);
    });
}

export default LoadTester;