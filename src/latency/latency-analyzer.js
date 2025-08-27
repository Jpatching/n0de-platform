#!/usr/bin/env node

/**
 * Advanced Latency & Speed Analysis Suite
 * Comprehensive latency testing, network optimization, and geographic analysis
 */

import { Connection, PublicKey } from '@solana/web3.js';
import axios from 'axios';
import WebSocket from 'ws';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import ping from 'ping';
import { assessmentConfig } from '../../config/assessment-config.js';
import { performance } from 'perf_hooks';
import { createWriteStream } from 'fs';
import dns from 'dns';
import { promisify } from 'util';

const resolveDns = promisify(dns.resolve4);

export class LatencyAnalyzer {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      geographic: {},
      endpoints: {},
      network: {},
      optimization: {},
      recommendations: []
    };
    this.spinner = ora();
    this.logStream = createWriteStream('reports/latency-analysis.log');
  }

  async runFullLatencyAnalysis() {
    console.log(chalk.blue.bold('🌐 Starting Comprehensive Latency Analysis\n'));
    
    // Geographic latency analysis
    await this.analyzeGeographicLatency();
    
    // RPC endpoint latency testing
    await this.testRPCEndpointLatencies();
    
    // Network path analysis
    await this.analyzeNetworkPaths();
    
    // Connection optimization testing
    await this.testConnectionOptimizations();
    
    // Real-time monitoring simulation
    await this.simulateRealTimeMonitoring();
    
    // Generate optimization recommendations
    this.generateOptimizationRecommendations();
    
    await this.generateReport();
    return this.results;
  }

  async analyzeGeographicLatency() {
    this.spinner.start('Analyzing geographic latency to Solana validators');
    
    // Known Solana validator endpoints by region
    const validatorEndpoints = {
      'US-East': [
        'api.mainnet-beta.solana.com',
        'solana-api.projectserum.com',
        'api.rpcpool.com'
      ],
      'US-West': [
        'api.mainnet-beta.solana.com',
        'solana--mainnet.infura.io'
      ],
      'Europe': [
        'api.mainnet-beta.solana.com',
        'solana-mainnet.phantom.tech'
      ],
      'Asia': [
        'api.mainnet-beta.solana.com',
        'mainnet.rpcpool.com'
      ]
    };
    
    const geoResults = {};
    
    for (const [region, endpoints] of Object.entries(validatorEndpoints)) {
      geoResults[region] = {
        endpoints: [],
        avgLatency: 0,
        minLatency: Infinity,
        maxLatency: 0,
        packetLoss: 0
      };
      
      for (const endpoint of endpoints) {
        try {
          const latencyResult = await this.measureEndpointLatency(endpoint);
          geoResults[region].endpoints.push({
            endpoint,
            ...latencyResult
          });
          
          geoResults[region].avgLatency += latencyResult.avgLatency;
          geoResults[region].minLatency = Math.min(geoResults[region].minLatency, latencyResult.minLatency);
          geoResults[region].maxLatency = Math.max(geoResults[region].maxLatency, latencyResult.maxLatency);
          
        } catch (error) {
          this.log(`Failed to measure latency to ${endpoint}: ${error.message}`);
        }
      }
      
      if (geoResults[region].endpoints.length > 0) {
        geoResults[region].avgLatency /= geoResults[region].endpoints.length;
      }
    }
    
    this.results.geographic = geoResults;
    this.spinner.succeed('Geographic latency analysis complete');
  }

  async measureEndpointLatency(endpoint) {
    const results = {
      endpoint,
      avgLatency: 0,
      minLatency: Infinity,
      maxLatency: 0,
      p50: 0,
      p90: 0,
      p99: 0,
      samples: [],
      packetLoss: 0,
      jitter: 0
    };
    
    try {
      // DNS resolution time
      const dnsStart = performance.now();
      await resolveDns(endpoint);
      const dnsTime = performance.now() - dnsStart;
      
      // ICMP ping tests
      const pingPromises = [];
      for (let i = 0; i < 10; i++) {
        pingPromises.push(
          ping.promise.probe(endpoint, { timeout: 10 })
        );
      }
      
      const pingResults = await Promise.allSettled(pingPromises);
      const successfulPings = pingResults.filter(result => 
        result.status === 'fulfilled' && result.value.alive
      ).map(result => parseFloat(result.value.time));
      
      if (successfulPings.length > 0) {
        successfulPings.sort((a, b) => a - b);
        
        results.avgLatency = successfulPings.reduce((a, b) => a + b, 0) / successfulPings.length;
        results.minLatency = successfulPings[0];
        results.maxLatency = successfulPings[successfulPings.length - 1];
        results.p50 = successfulPings[Math.floor(successfulPings.length * 0.5)];
        results.p90 = successfulPings[Math.floor(successfulPings.length * 0.9)];
        results.p99 = successfulPings[Math.floor(successfulPings.length * 0.99)];
        results.packetLoss = ((10 - successfulPings.length) / 10) * 100;
        
        // Calculate jitter (variance in latency)
        const variance = successfulPings.reduce((sum, ping) => 
          sum + Math.pow(ping - results.avgLatency, 2), 0) / successfulPings.length;
        results.jitter = Math.sqrt(variance);
      }
      
      results.dnsResolutionTime = dnsTime;
      
    } catch (error) {
      throw new Error(`Latency measurement failed: ${error.message}`);
    }
    
    return results;
  }

  async testRPCEndpointLatencies() {
    this.spinner.start('Testing RPC endpoint latencies');
    
    const endpoints = {
      ...assessmentConfig.rpcEndpoints.competitors,
      local: assessmentConfig.rpcEndpoints.local
    };
    
    const rpcResults = {};
    
    for (const [name, config] of Object.entries(endpoints)) {
      if (config.url) {
        try {
          const result = await this.measureRPCLatency(name, config);
          rpcResults[name] = result;
          
        } catch (error) {
          rpcResults[name] = {
            name: config.name,
            error: error.message,
            status: 'failed'
          };
          this.log(`RPC latency test failed for ${config.name}: ${error.message}`);
        }
      }
    }
    
    this.results.endpoints = rpcResults;
    this.spinner.succeed('RPC endpoint latency testing complete');
  }

  async measureRPCLatency(name, config) {
    const connection = new Connection(config.url, 'confirmed');
    const latencies = {
      getSlot: [],
      getVersion: [],
      getHealth: [],
      getBlockHeight: [],
      getLatestBlockhash: []
    };
    
    const methods = Object.keys(latencies);
    const iterations = 20;
    
    for (let i = 0; i < iterations; i++) {
      for (const method of methods) {
        try {
          const start = performance.now();
          
          switch (method) {
            case 'getSlot':
              await connection.getSlot();
              break;
            case 'getVersion':
              await connection.getVersion();
              break;
            case 'getHealth':
              await connection.getHealth();
              break;
            case 'getBlockHeight':
              await connection.getBlockHeight();
              break;
            case 'getLatestBlockhash':
              await connection.getLatestBlockhash();
              break;
          }
          
          const latency = performance.now() - start;
          latencies[method].push(latency);
          
        } catch (error) {
          // Skip failed calls
        }
      }
    }
    
    // Calculate statistics for each method
    const methodStats = {};
    let overallLatencies = [];
    
    for (const [method, times] of Object.entries(latencies)) {
      if (times.length > 0) {
        times.sort((a, b) => a - b);
        methodStats[method] = {
          avg: times.reduce((a, b) => a + b, 0) / times.length,
          min: times[0],
          max: times[times.length - 1],
          p50: times[Math.floor(times.length * 0.5)],
          p90: times[Math.floor(times.length * 0.9)],
          p99: times[Math.floor(times.length * 0.99)],
          count: times.length
        };
        overallLatencies = overallLatencies.concat(times);
      }
    }
    
    overallLatencies.sort((a, b) => a - b);
    
    // Test WebSocket latency if available
    let websocketLatency = null;
    if (config.wsUrl) {
      websocketLatency = await this.measureWebSocketLatency(config.wsUrl);
    }
    
    return {
      name: config.name,
      url: config.url,
      type: config.type || 'remote',
      methods: methodStats,
      overall: {
        avg: overallLatencies.reduce((a, b) => a + b, 0) / overallLatencies.length,
        min: overallLatencies[0],
        max: overallLatencies[overallLatencies.length - 1],
        p50: overallLatencies[Math.floor(overallLatencies.length * 0.5)],
        p90: overallLatencies[Math.floor(overallLatencies.length * 0.9)],
        p99: overallLatencies[Math.floor(overallLatencies.length * 0.99)]
      },
      websocket: websocketLatency,
      timestamp: new Date().toISOString()
    };
  }

  async measureWebSocketLatency(wsUrl) {
    return new Promise((resolve) => {
      const start = performance.now();
      const latencies = [];
      let messageCount = 0;
      const targetMessages = 10;
      
      const ws = new WebSocket(wsUrl);
      
      const timeout = setTimeout(() => {
        ws.close();
        resolve({
          status: 'timeout',
          error: 'WebSocket connection timeout'
        });
      }, 10000);
      
      ws.on('open', () => {
        const connectionTime = performance.now() - start;
        
        // Send ping messages to measure round-trip time
        const sendPing = () => {
          const pingStart = performance.now();
          const pingId = Math.random().toString(36).substr(2, 9);
          
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            id: pingId,
            method: 'ping'
          }));
          
          const handlePong = (data) => {
            try {
              const response = JSON.parse(data.toString());
              if (response.id === pingId) {
                const roundTripTime = performance.now() - pingStart;
                latencies.push(roundTripTime);
                messageCount++;
                
                if (messageCount < targetMessages) {
                  setTimeout(sendPing, 100);
                } else {
                  clearTimeout(timeout);
                  ws.close();
                  
                  latencies.sort((a, b) => a - b);
                  resolve({
                    status: 'success',
                    connectionTime,
                    roundTripTime: {
                      avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
                      min: latencies[0],
                      max: latencies[latencies.length - 1],
                      p50: latencies[Math.floor(latencies.length * 0.5)],
                      p90: latencies[Math.floor(latencies.length * 0.9)]
                    }
                  });
                }
              }
            } catch (error) {
              // Skip invalid responses
            }
          };
          
          ws.once('message', handlePong);
        };
        
        sendPing();
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        resolve({
          status: 'error',
          error: error.message
        });
      });
    });
  }

  async analyzeNetworkPaths() {
    this.spinner.start('Analyzing network paths and routing');
    
    const networkResults = {
      routes: [],
      optimizations: [],
      bottlenecks: []
    };
    
    // Test different connection methods
    const connectionMethods = [
      { name: 'HTTP/1.1', agent: null },
      { name: 'HTTP/2', agent: 'http2' },
      { name: 'Keep-Alive', agent: 'keep-alive' }
    ];
    
    for (const method of connectionMethods) {
      try {
        const result = await this.testConnectionMethod(method);
        networkResults.routes.push(result);
      } catch (error) {
        this.log(`Connection method test failed for ${method.name}: ${error.message}`);
      }
    }
    
    this.results.network = networkResults;
    this.spinner.succeed('Network path analysis complete');
  }

  async testConnectionMethod(method) {
    const testUrl = assessmentConfig.rpcEndpoints.local.url;
    const iterations = 20;
    const latencies = [];
    
    const axiosConfig = {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    // Configure connection method
    if (method.agent === 'keep-alive') {
      axiosConfig.headers.Connection = 'keep-alive';
    }
    
    for (let i = 0; i < iterations; i++) {
      try {
        const start = performance.now();
        
        await axios.post(testUrl, {
          jsonrpc: '2.0',
          id: 1,
          method: 'getSlot'
        }, axiosConfig);
        
        latencies.push(performance.now() - start);
      } catch (error) {
        // Skip failed requests
      }
    }
    
    if (latencies.length > 0) {
      latencies.sort((a, b) => a - b);
      return {
        method: method.name,
        avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
        min: latencies[0],
        max: latencies[latencies.length - 1],
        p50: latencies[Math.floor(latencies.length * 0.5)],
        p90: latencies[Math.floor(latencies.length * 0.9)],
        successRate: (latencies.length / iterations) * 100
      };
    } else {
      throw new Error('All requests failed');
    }
  }

  async testConnectionOptimizations() {
    this.spinner.start('Testing connection optimizations');
    
    const optimizations = {
      connectionPooling: await this.testConnectionPooling(),
      pipelining: await this.testRequestPipelining(),
      compression: await this.testResponseCompression(),
      batching: await this.testRequestBatching()
    };
    
    this.results.optimization = optimizations;
    this.spinner.succeed('Connection optimization testing complete');
  }

  async testConnectionPooling() {
    const agent = new (await import('http')).default.Agent({
      keepAlive: true,
      maxSockets: 10,
      maxFreeSockets: 5
    });
    
    const axiosInstance = axios.create({
      httpAgent: agent,
      timeout: 10000
    });
    
    const testUrl = assessmentConfig.rpcEndpoints.local.url;
    const iterations = 50;
    const latencies = [];
    
    for (let i = 0; i < iterations; i++) {
      try {
        const start = performance.now();
        
        await axiosInstance.post(testUrl, {
          jsonrpc: '2.0',
          id: i,
          method: 'getSlot'
        });
        
        latencies.push(performance.now() - start);
      } catch (error) {
        // Skip failed requests
      }
    }
    
    if (latencies.length > 0) {
      latencies.sort((a, b) => a - b);
      return {
        enabled: true,
        avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
        min: latencies[0],
        max: latencies[latencies.length - 1],
        successRate: (latencies.length / iterations) * 100
      };
    } else {
      return { enabled: false, error: 'All requests failed' };
    }
  }

  async testRequestPipelining() {
    const testUrl = assessmentConfig.rpcEndpoints.local.url;
    const concurrentRequests = 10;
    const batches = 10;
    
    const batchLatencies = [];
    
    for (let batch = 0; batch < batches; batch++) {
      const promises = [];
      const start = performance.now();
      
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          axios.post(testUrl, {
            jsonrpc: '2.0',
            id: `${batch}-${i}`,
            method: 'getSlot'
          }, { timeout: 10000 })
        );
      }
      
      try {
        await Promise.all(promises);
        batchLatencies.push(performance.now() - start);
      } catch (error) {
        // Skip failed batches
      }
    }
    
    if (batchLatencies.length > 0) {
      batchLatencies.sort((a, b) => a - b);
      return {
        enabled: true,
        concurrentRequests,
        avg: batchLatencies.reduce((a, b) => a + b, 0) / batchLatencies.length,
        min: batchLatencies[0],
        max: batchLatencies[batchLatencies.length - 1],
        throughput: (concurrentRequests / (batchLatencies.reduce((a, b) => a + b, 0) / batchLatencies.length)) * 1000
      };
    } else {
      return { enabled: false, error: 'All batches failed' };
    }
  }

  async testResponseCompression() {
    const testUrl = assessmentConfig.rpcEndpoints.local.url;
    const iterations = 20;
    
    const results = {
      gzip: await this.testCompressionMethod('gzip'),
      deflate: await this.testCompressionMethod('deflate'),
      none: await this.testCompressionMethod('none')
    };
    
    return results;
  }

  async testCompressionMethod(encoding) {
    const testUrl = assessmentConfig.rpcEndpoints.local.url;
    const iterations = 20;
    const latencies = [];
    
    const headers = { 'Content-Type': 'application/json' };
    if (encoding !== 'none') {
      headers['Accept-Encoding'] = encoding;
    }
    
    for (let i = 0; i < iterations; i++) {
      try {
        const start = performance.now();
        
        await axios.post(testUrl, {
          jsonrpc: '2.0',
          id: i,
          method: 'getBlockHeight'
        }, {
          headers,
          timeout: 10000
        });
        
        latencies.push(performance.now() - start);
      } catch (error) {
        // Skip failed requests
      }
    }
    
    if (latencies.length > 0) {
      latencies.sort((a, b) => a - b);
      return {
        encoding,
        avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
        min: latencies[0],
        max: latencies[latencies.length - 1],
        successRate: (latencies.length / iterations) * 100
      };
    } else {
      return { encoding, error: 'All requests failed' };
    }
  }

  async testRequestBatching() {
    const testUrl = assessmentConfig.rpcEndpoints.local.url;
    const batchSizes = [1, 5, 10, 20];
    const results = {};
    
    for (const batchSize of batchSizes) {
      const iterations = 20;
      const latencies = [];
      
      for (let i = 0; i < iterations; i++) {
        try {
          const batch = [];
          for (let j = 0; j < batchSize; j++) {
            batch.push({
              jsonrpc: '2.0',
              id: `${i}-${j}`,
              method: 'getSlot'
            });
          }
          
          const start = performance.now();
          await axios.post(testUrl, batch, { timeout: 10000 });
          latencies.push(performance.now() - start);
          
        } catch (error) {
          // Skip failed requests
        }
      }
      
      if (latencies.length > 0) {
        latencies.sort((a, b) => a - b);
        results[batchSize] = {
          batchSize,
          avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
          avgPerRequest: (latencies.reduce((a, b) => a + b, 0) / latencies.length) / batchSize,
          throughput: (batchSize / (latencies.reduce((a, b) => a + b, 0) / latencies.length)) * 1000,
          successRate: (latencies.length / iterations) * 100
        };
      }
    }
    
    return results;
  }

  async simulateRealTimeMonitoring() {
    this.spinner.start('Simulating real-time latency monitoring');
    
    const monitoringResults = {
      duration: 60, // seconds
      interval: 1000, // ms
      samples: [],
      alerts: []
    };
    
    const startTime = Date.now();
    const endTime = startTime + (monitoringResults.duration * 1000);
    
    const testConnection = new Connection(assessmentConfig.rpcEndpoints.local.url, 'confirmed');
    
    while (Date.now() < endTime) {
      const start = performance.now();
      
      try {
        await testConnection.getSlot();
        const latency = performance.now() - start;
        
        monitoringResults.samples.push({
          timestamp: Date.now(),
          latency: latency,
          status: 'success'
        });
        
        // Check for latency spikes
        if (latency > assessmentConfig.targets.latency.local.p99) {
          monitoringResults.alerts.push({
            type: 'high_latency',
            value: latency,
            threshold: assessmentConfig.targets.latency.local.p99,
            timestamp: Date.now()
          });
        }
        
      } catch (error) {
        monitoringResults.samples.push({
          timestamp: Date.now(),
          error: error.message,
          status: 'failed'
        });
        
        monitoringResults.alerts.push({
          type: 'connection_error',
          error: error.message,
          timestamp: Date.now()
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, monitoringResults.interval));
    }
    
    // Calculate monitoring statistics
    const successfulSamples = monitoringResults.samples.filter(s => s.status === 'success');
    if (successfulSamples.length > 0) {
      const latencies = successfulSamples.map(s => s.latency).sort((a, b) => a - b);
      monitoringResults.statistics = {
        totalSamples: monitoringResults.samples.length,
        successfulSamples: successfulSamples.length,
        successRate: (successfulSamples.length / monitoringResults.samples.length) * 100,
        avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
        minLatency: latencies[0],
        maxLatency: latencies[latencies.length - 1],
        p50: latencies[Math.floor(latencies.length * 0.5)],
        p90: latencies[Math.floor(latencies.length * 0.9)],
        p99: latencies[Math.floor(latencies.length * 0.99)]
      };
    }
    
    this.results.monitoring = monitoringResults;
    this.spinner.succeed('Real-time monitoring simulation complete');
  }

  generateOptimizationRecommendations() {
    const recommendations = [];
    
    // Analyze local vs remote performance
    if (this.results.endpoints.local && this.results.endpoints.local.overall) {
      const localLatency = this.results.endpoints.local.overall.avg;
      
      if (localLatency < assessmentConfig.targets.latency.local.p50) {
        recommendations.push({
          type: 'performance',
          priority: 'high',
          title: 'Excellent Local Performance',
          description: `Your local RPC latency (${localLatency.toFixed(1)}ms) is excellent and beats target of ${assessmentConfig.targets.latency.local.p50}ms`,
          action: 'Leverage this advantage in marketing materials'
        });
      }
    }
    
    // Analyze connection pooling benefits
    if (this.results.optimization.connectionPooling && this.results.optimization.connectionPooling.enabled) {
      recommendations.push({
        type: 'optimization',
        priority: 'medium',
        title: 'Enable Connection Pooling',
        description: 'Connection pooling can reduce latency by reusing connections',
        action: 'Implement HTTP keep-alive and connection pooling for client libraries'
      });
    }
    
    // Analyze request batching benefits
    if (this.results.optimization.batching) {
      const bestBatchSize = Object.entries(this.results.optimization.batching)
        .sort((a, b) => a[1].avgPerRequest - b[1].avgPerRequest)[0];
      
      if (bestBatchSize && bestBatchSize[0] > 1) {
        recommendations.push({
          type: 'optimization',
          priority: 'high',
          title: 'Implement Request Batching',
          description: `Optimal batch size of ${bestBatchSize[0]} requests reduces per-request latency`,
          action: `Implement batch request support with recommended size of ${bestBatchSize[0]}`
        });
      }
    }
    
    // Geographic recommendations
    if (this.results.geographic) {
      const ukLatency = this.results.geographic.Europe?.avgLatency;
      if (ukLatency && ukLatency < 50) {
        recommendations.push({
          type: 'geographic',
          priority: 'high',
          title: 'UK Location Advantage',
          description: `Your UK location provides ${ukLatency.toFixed(1)}ms average latency to European validators`,
          action: 'Market this as a competitive advantage for European users'
        });
      }
    }
    
    this.results.recommendations = recommendations;
  }

  async generateReport() {
    console.log(chalk.blue.bold('\n🌐 Latency Analysis Results\n'));
    
    // Geographic latency summary
    if (Object.keys(this.results.geographic).length > 0) {
      console.log(chalk.yellow.bold('📍 Geographic Latency Analysis\n'));
      
      const geoTable = new Table({
        head: ['Region', 'Avg Latency', 'Min Latency', 'Max Latency', 'Packet Loss'],
        colWidths: [15, 15, 15, 15, 15]
      });
      
      Object.entries(this.results.geographic).forEach(([region, data]) => {
        geoTable.push([
          region,
          `${data.avgLatency.toFixed(1)}ms`,
          `${data.minLatency.toFixed(1)}ms`,
          `${data.maxLatency.toFixed(1)}ms`,
          `${data.packetLoss.toFixed(1)}%`
        ]);
      });
      
      console.log(geoTable.toString());
    }
    
    // RPC endpoint comparison
    if (Object.keys(this.results.endpoints).length > 0) {
      console.log(chalk.yellow.bold('\n🚀 RPC Endpoint Latency Comparison\n'));
      
      const endpointTable = new Table({
        head: ['Endpoint', 'Avg Latency', 'P50', 'P90', 'P99', 'WebSocket'],
        colWidths: [15, 12, 10, 10, 10, 12]
      });
      
      Object.entries(this.results.endpoints).forEach(([name, data]) => {
        if (data.overall) {
          endpointTable.push([
            data.name,
            `${data.overall.avg.toFixed(1)}ms`,
            `${data.overall.p50.toFixed(1)}ms`,
            `${data.overall.p90.toFixed(1)}ms`,
            `${data.overall.p99.toFixed(1)}ms`,
            data.websocket?.status === 'success' ? 
              `${data.websocket.roundTripTime?.avg.toFixed(1)}ms` : 'N/A'
          ]);
        }
      });
      
      console.log(endpointTable.toString());
    }
    
    // Optimization results
    if (this.results.optimization) {
      console.log(chalk.yellow.bold('\n⚡ Connection Optimization Results\n'));
      
      if (this.results.optimization.batching) {
        const batchTable = new Table({
          head: ['Batch Size', 'Avg Total', 'Avg Per Request', 'Throughput'],
          colWidths: [12, 12, 15, 12]
        });
        
        Object.entries(this.results.optimization.batching).forEach(([size, data]) => {
          batchTable.push([
            size,
            `${data.avg.toFixed(1)}ms`,
            `${data.avgPerRequest.toFixed(1)}ms`,
            `${data.throughput.toFixed(0)} RPS`
          ]);
        });
        
        console.log('Request Batching Performance:');
        console.log(batchTable.toString());
      }
    }
    
    // Recommendations
    if (this.results.recommendations.length > 0) {
      console.log(chalk.yellow.bold('\n💡 Optimization Recommendations\n'));
      
      this.results.recommendations.forEach((rec, index) => {
        const priority = rec.priority === 'high' ? chalk.red('HIGH') : 
                        rec.priority === 'medium' ? chalk.yellow('MEDIUM') : chalk.green('LOW');
        
        console.log(`${index + 1}. [${priority}] ${chalk.bold(rec.title)}`);
        console.log(`   ${rec.description}`);
        console.log(`   ${chalk.cyan('Action:')} ${rec.action}\n`);
      });
    }
    
    // Save detailed results to file
    const { writeFileSync } = await import('fs');
    writeFileSync('reports/latency-analysis-results.json', JSON.stringify(this.results, null, 2));
    console.log(chalk.green('\n✅ Detailed results saved to reports/latency-analysis-results.json\n'));
  }

  log(message) {
    const timestamp = new Date().toISOString();
    this.logStream.write(`[${timestamp}] ${message}\n`);
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new LatencyAnalyzer();
  
  analyzer.runFullLatencyAnalysis()
    .then(() => {
      console.log(chalk.green.bold('🎉 Latency Analysis Complete!'));
      process.exit(0);
    })
    .catch(error => {
      console.error(chalk.red.bold('❌ Latency Analysis Failed:'), error);
      process.exit(1);
    });
}

export default LatencyAnalyzer;