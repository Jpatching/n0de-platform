import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../common/redis.service';
import { PrismaService } from '../common/prisma.service';

interface LoadTestConfig {
  name: string;
  duration: number; // seconds
  rps: number; // requests per second
  concurrency: number;
  endpoints: TestEndpoint[];
  rampUp: number; // seconds
  assertions: PerformanceAssertion[];
}

interface TestEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  weight: number; // percentage of traffic
  headers?: Record<string, string>;
  payload?: any;
  auth?: boolean;
}

interface PerformanceAssertion {
  metric: 'response_time' | 'error_rate' | 'throughput';
  operator: 'lt' | 'gt' | 'eq';
  value: number;
  percentile?: number; // for response_time
}

interface TestResult {
  testId: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: number;
  endTime?: number;
  config: LoadTestConfig;
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    actualRPS: number;
    errorRate: number;
    throughputMB: number;
  };
  errors: Array<{
    type: string;
    message: string;
    count: number;
  }>;
  assertions: Array<{
    assertion: PerformanceAssertion;
    passed: boolean;
    actualValue: number;
  }>;
}

@Injectable()
export class PerformanceTestingService {
  private readonly logger = new Logger(PerformanceTestingService.name);
  private activeTests = new Map<string, TestResult>();
  
  // Pre-configured test scenarios for N0DE platform
  private readonly testScenarios: Record<string, LoadTestConfig> = {
    'baseline': {
      name: 'Baseline Performance Test',
      duration: 300, // 5 minutes
      rps: 100,
      concurrency: 10,
      rampUp: 30,
      endpoints: [
        { path: '/api/v1/health', method: 'GET', weight: 30 },
        { path: '/api/v1/auth/profile', method: 'GET', weight: 20, auth: true },
        { path: '/api/v1/usage/stats', method: 'GET', weight: 25, auth: true },
        { path: '/api/v1/metrics/live', method: 'GET', weight: 25 }
      ],
      assertions: [
        { metric: 'response_time', operator: 'lt', value: 100, percentile: 95 },
        { metric: 'error_rate', operator: 'lt', value: 1 },
        { metric: 'throughput', operator: 'gt', value: 90 }
      ]
    },
    'high_load': {
      name: 'High Load Test',
      duration: 600, // 10 minutes
      rps: 5000,
      concurrency: 100,
      rampUp: 60,
      endpoints: [
        { path: '/api/v1/health', method: 'GET', weight: 25 },
        { path: '/api/v1/auth/profile', method: 'GET', weight: 20, auth: true },
        { path: '/api/v1/usage/stats', method: 'GET', weight: 25, auth: true },
        { path: '/api/v1/metrics/live', method: 'GET', weight: 30 }
      ],
      assertions: [
        { metric: 'response_time', operator: 'lt', value: 50, percentile: 95 },
        { metric: 'error_rate', operator: 'lt', value: 2 },
        { metric: 'throughput', operator: 'gt', value: 4500 }
      ]
    },
    'enterprise_scale': {
      name: 'Enterprise Scale Test (50K+ RPS)',
      duration: 900, // 15 minutes
      rps: 50000,
      concurrency: 1000,
      rampUp: 120,
      endpoints: [
        { path: '/api/v1/health', method: 'GET', weight: 40 },
        { path: '/api/v1/metrics/live', method: 'GET', weight: 35 },
        { path: '/api/v1/usage/stats', method: 'GET', weight: 25, auth: true }
      ],
      assertions: [
        { metric: 'response_time', operator: 'lt', value: 9, percentile: 95 }, // 9ms target
        { metric: 'error_rate', operator: 'lt', value: 0.1 },
        { metric: 'throughput', operator: 'gt', value: 45000 }
      ]
    },
    'stress_test': {
      name: 'Stress Test - Find Breaking Point',
      duration: 300,
      rps: 75000,
      concurrency: 1500,
      rampUp: 60,
      endpoints: [
        { path: '/api/v1/health', method: 'GET', weight: 60 },
        { path: '/api/v1/metrics/live', method: 'GET', weight: 40 }
      ],
      assertions: [
        { metric: 'response_time', operator: 'lt', value: 100, percentile: 95 },
        { metric: 'error_rate', operator: 'lt', value: 5 }
      ]
    }
  };

  constructor(
    private configService: ConfigService,
    private redis: RedisService,
    private prisma: PrismaService
  ) {
    this.logger.log('Performance Testing Service initialized with enterprise-grade scenarios');
    
    // Cleanup old test results every hour
    setInterval(() => {
      this.cleanupOldTests();
    }, 3600000);
  }

  async runTest(scenarioName: string, customConfig?: Partial<LoadTestConfig>): Promise<string> {
    const baseConfig = this.testScenarios[scenarioName];
    if (!baseConfig) {
      throw new Error(`Test scenario '${scenarioName}' not found`);
    }

    const config: LoadTestConfig = customConfig 
      ? { ...baseConfig, ...customConfig }
      : baseConfig;

    const testId = `test_${scenarioName}_${Date.now()}`;
    const baseUrl = this.configService.get('NODE_ENV') === 'production' 
      ? 'https://n0de-backend-production.up.railway.app'
      : 'http://localhost:3000';

    const testResult: TestResult = {
      testId,
      name: config.name,
      status: 'running',
      startTime: Date.now(),
      config,
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        actualRPS: 0,
        errorRate: 0,
        throughputMB: 0
      },
      errors: [],
      assertions: []
    };

    this.activeTests.set(testId, testResult);

    // Run the test asynchronously
    this.executeTest(testId, config, baseUrl).catch(error => {
      this.logger.error(`Test ${testId} failed:`, error);
      testResult.status = 'failed';
      testResult.endTime = Date.now();
    });

    this.logger.log(`Started performance test: ${config.name} (ID: ${testId})`);
    return testId;
  }

  private async executeTest(testId: string, config: LoadTestConfig, baseUrl: string): Promise<void> {
    const testResult = this.activeTests.get(testId)!;
    const responseTimes: number[] = [];
    const errors = new Map<string, number>();
    let totalBytes = 0;

    try {
      const startTime = Date.now();
      const requests = this.generateRequestSchedule(config);
      
      // Execute requests with concurrency control
      await this.executeConcurrentRequests(requests, config.concurrency, async (request) => {
        const reqStart = performance.now();
        
        try {
          const response = await this.makeRequest(baseUrl, request);
          const responseTime = performance.now() - reqStart;
          
          responseTimes.push(responseTime);
          testResult.metrics.successfulRequests++;
          
          if (response.ok) {
            const contentLength = response.headers.get('content-length');
            if (contentLength) {
              totalBytes += parseInt(contentLength);
            }
          }
          
          // Update min/max response times
          testResult.metrics.minResponseTime = Math.min(testResult.metrics.minResponseTime, responseTime);
          testResult.metrics.maxResponseTime = Math.max(testResult.metrics.maxResponseTime, responseTime);
          
        } catch (error) {
          testResult.metrics.failedRequests++;
          const errorType = error.name || 'UnknownError';
          errors.set(errorType, (errors.get(errorType) || 0) + 1);
        }
        
        testResult.metrics.totalRequests++;
        
        // Update real-time metrics every 1000 requests
        if (testResult.metrics.totalRequests % 1000 === 0) {
          await this.updateTestMetrics(testResult, responseTimes, errors, totalBytes, startTime);
        }
      });

      // Final metrics calculation
      await this.finalizeTestResults(testResult, responseTimes, errors, totalBytes, startTime);
      
    } catch (error) {
      testResult.status = 'failed';
      this.logger.error(`Test execution failed for ${testId}:`, error);
    }

    testResult.endTime = Date.now();
    
    // Store test results
    await this.storeTestResults(testResult);
  }

  private generateRequestSchedule(config: LoadTestConfig): TestEndpoint[] {
    const schedule: TestEndpoint[] = [];
    const totalRequests = config.rps * config.duration;
    
    // Distribute requests based on endpoint weights
    for (const endpoint of config.endpoints) {
      const requestCount = Math.floor((endpoint.weight / 100) * totalRequests);
      for (let i = 0; i < requestCount; i++) {
        schedule.push(endpoint);
      }
    }
    
    // Shuffle the schedule to randomize request order
    return this.shuffleArray(schedule);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private async executeConcurrentRequests<T>(
    items: T[], 
    concurrency: number, 
    processor: (item: T) => Promise<void>
  ): Promise<void> {
    const semaphore = new Array(concurrency).fill(0);
    let index = 0;

    const executeNext = async (): Promise<void> => {
      const currentIndex = index++;
      if (currentIndex >= items.length) return;

      await processor(items[currentIndex]);
      await executeNext();
    };

    await Promise.all(semaphore.map(() => executeNext()));
  }

  private async makeRequest(baseUrl: string, endpoint: TestEndpoint): Promise<Response> {
    const url = `${baseUrl}${endpoint.path}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'User-Agent': 'N0DE-Performance-Test/1.0',
      ...endpoint.headers
    };

    // Add auth header if required
    if (endpoint.auth) {
      const testToken = this.configService.get('TEST_JWT_TOKEN');
      if (testToken) {
        headers['Authorization'] = `Bearer ${testToken}`;
      }
    }

    const options: RequestInit = {
      method: endpoint.method,
      headers,
      signal: AbortSignal.timeout(30000) // 30 second timeout
    };

    if (endpoint.payload && ['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      options.body = JSON.stringify(endpoint.payload);
    }

    return fetch(url, options);
  }

  private async updateTestMetrics(
    testResult: TestResult,
    responseTimes: number[],
    errors: Map<string, number>,
    totalBytes: number,
    startTime: number
  ): Promise<void> {
    if (responseTimes.length === 0) return;

    const sortedTimes = [...responseTimes].sort((a, b) => a - b);
    const duration = (Date.now() - startTime) / 1000;

    testResult.metrics.avgResponseTime = responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length;
    testResult.metrics.p95ResponseTime = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    testResult.metrics.p99ResponseTime = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
    testResult.metrics.actualRPS = testResult.metrics.totalRequests / duration;
    testResult.metrics.errorRate = (testResult.metrics.failedRequests / testResult.metrics.totalRequests) * 100;
    testResult.metrics.throughputMB = (totalBytes / (1024 * 1024)) / duration;

    // Update errors array
    testResult.errors = Array.from(errors.entries()).map(([type, count]) => ({
      type,
      message: `${type} occurred ${count} times`,
      count
    }));

    // Store intermediate results in Redis
    await this.redis.set(`test_result:${testResult.testId}`, JSON.stringify(testResult), 7200);
  }

  private async finalizeTestResults(
    testResult: TestResult,
    responseTimes: number[],
    errors: Map<string, number>,
    totalBytes: number,
    startTime: number
  ): Promise<void> {
    await this.updateTestMetrics(testResult, responseTimes, errors, totalBytes, startTime);
    
    // Evaluate assertions
    for (const assertion of testResult.config.assertions) {
      const result = this.evaluateAssertion(assertion, testResult.metrics);
      testResult.assertions.push(result);
    }

    testResult.status = testResult.assertions.every(a => a.passed) ? 'completed' : 'failed';
    
    this.logger.log(`Test ${testResult.testId} completed:`, {
      status: testResult.status,
      totalRequests: testResult.metrics.totalRequests,
      avgResponseTime: testResult.metrics.avgResponseTime,
      p95ResponseTime: testResult.metrics.p95ResponseTime,
      actualRPS: testResult.metrics.actualRPS,
      errorRate: testResult.metrics.errorRate
    });
  }

  private evaluateAssertion(assertion: PerformanceAssertion, metrics: TestResult['metrics']): {
    assertion: PerformanceAssertion;
    passed: boolean;
    actualValue: number;
  } {
    let actualValue: number;

    switch (assertion.metric) {
      case 'response_time':
        actualValue = assertion.percentile === 95 ? metrics.p95ResponseTime :
                     assertion.percentile === 99 ? metrics.p99ResponseTime :
                     metrics.avgResponseTime;
        break;
      case 'error_rate':
        actualValue = metrics.errorRate;
        break;
      case 'throughput':
        actualValue = metrics.actualRPS;
        break;
      default:
        actualValue = 0;
    }

    let passed = false;
    switch (assertion.operator) {
      case 'lt':
        passed = actualValue < assertion.value;
        break;
      case 'gt':
        passed = actualValue > assertion.value;
        break;
      case 'eq':
        passed = Math.abs(actualValue - assertion.value) < 0.01;
        break;
    }

    return { assertion, passed, actualValue };
  }

  private async storeTestResults(testResult: TestResult): Promise<void> {
    try {
      // Store in Redis for quick access
      await this.redis.set(`test_result:${testResult.testId}`, JSON.stringify(testResult), 86400);
      
      // Store in database for historical analysis
      await this.prisma.systemMetrics.createMany({
        data: [
          {
            metricType: 'performance_test_rps',
            value: testResult.metrics.actualRPS,
            unit: 'rps',
            metadata: {
              testId: testResult.testId,
              scenario: testResult.name,
              status: testResult.status
            }
          },
          {
            metricType: 'performance_test_latency',
            value: testResult.metrics.p95ResponseTime,
            unit: 'ms',
            metadata: {
              testId: testResult.testId,
              scenario: testResult.name,
              percentile: 95
            }
          },
          {
            metricType: 'performance_test_error_rate',
            value: testResult.metrics.errorRate,
            unit: 'percent',
            metadata: {
              testId: testResult.testId,
              scenario: testResult.name
            }
          }
        ]
      });

      this.logger.log(`Test results stored for ${testResult.testId}`);
    } catch (error) {
      this.logger.error('Failed to store test results:', error);
    }
  }

  private async cleanupOldTests(): Promise<void> {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [testId, testResult] of this.activeTests.entries()) {
      if (testResult.startTime < cutoff) {
        this.activeTests.delete(testId);
        this.logger.debug(`Cleaned up old test: ${testId}`);
      }
    }
  }

  // Public API methods
  async getTestResult(testId: string): Promise<TestResult | null> {
    const activeTest = this.activeTests.get(testId);
    if (activeTest) {
      return activeTest;
    }

    try {
      const stored = await this.redis.get(`test_result:${testId}`);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      this.logger.error('Failed to get test result:', error);
      return null;
    }
  }

  async listActiveTests(): Promise<TestResult[]> {
    return Array.from(this.activeTests.values())
      .filter(test => test.status === 'running');
  }

  async getTestHistory(limit: number = 20): Promise<TestResult[]> {
    const testKeys = await this.redis.keys('test_result:*');
    const results: TestResult[] = [];

    for (const key of testKeys.slice(0, limit)) {
      const data = await this.redis.get(key);
      if (data) {
        results.push(JSON.parse(data));
      }
    }

    return results.sort((a, b) => b.startTime - a.startTime);
  }

  getAvailableScenarios(): Record<string, LoadTestConfig> {
    return { ...this.testScenarios };
  }

  async cancelTest(testId: string): Promise<boolean> {
    const testResult = this.activeTests.get(testId);
    if (testResult && testResult.status === 'running') {
      testResult.status = 'cancelled';
      testResult.endTime = Date.now();
      this.logger.log(`Test ${testId} cancelled`);
      return true;
    }
    return false;
  }

  async runContinuousTest(): Promise<string> {
    // Run baseline test every 30 minutes for continuous monitoring
    const testId = await this.runTest('baseline');
    
    // Schedule next test
    setTimeout(() => {
      this.runContinuousTest();
    }, 30 * 60 * 1000); // 30 minutes

    return testId;
  }

  async generatePerformanceReport(): Promise<any> {
    const recentTests = await this.getTestHistory(10);
    const baselineTests = recentTests.filter(t => t.config.name.includes('Baseline'));
    const highLoadTests = recentTests.filter(t => t.config.name.includes('High Load'));
    
    return {
      summary: {
        totalTests: recentTests.length,
        passedTests: recentTests.filter(t => t.status === 'completed').length,
        averageLatency: this.calculateAverageMetric(recentTests, 'avgResponseTime'),
        averageRPS: this.calculateAverageMetric(recentTests, 'actualRPS'),
        averageErrorRate: this.calculateAverageMetric(recentTests, 'errorRate')
      },
      trends: {
        latency: this.calculateTrend(recentTests, 'avgResponseTime'),
        rps: this.calculateTrend(recentTests, 'actualRPS'),
        errorRate: this.calculateTrend(recentTests, 'errorRate')
      },
      recommendations: this.generateRecommendations(recentTests),
      timestamp: Date.now()
    };
  }

  private calculateAverageMetric(tests: TestResult[], metric: keyof TestResult['metrics']): number {
    if (tests.length === 0) return 0;
    const sum = tests.reduce((acc, test) => acc + (test.metrics[metric] as number), 0);
    return sum / tests.length;
  }

  private calculateTrend(tests: TestResult[], metric: keyof TestResult['metrics']): string {
    if (tests.length < 2) return 'insufficient_data';
    
    const recent = tests.slice(0, Math.floor(tests.length / 2));
    const older = tests.slice(Math.floor(tests.length / 2));
    
    const recentAvg = this.calculateAverageMetric(recent, metric);
    const olderAvg = this.calculateAverageMetric(older, metric);
    
    const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (Math.abs(changePercent) < 5) return 'stable';
    
    // For latency and error rate, lower is better
    if (metric === 'avgResponseTime' || metric === 'errorRate') {
      return changePercent < 0 ? 'improving' : 'degrading';
    } else {
      // For RPS, higher is better
      return changePercent > 0 ? 'improving' : 'degrading';
    }
  }

  private generateRecommendations(tests: TestResult[]): string[] {
    const recommendations: string[] = [];
    const avgLatency = this.calculateAverageMetric(tests, 'avgResponseTime');
    const avgRPS = this.calculateAverageMetric(tests, 'actualRPS');
    const avgErrorRate = this.calculateAverageMetric(tests, 'errorRate');
    
    if (avgLatency > 9) {
      recommendations.push(`Current latency (${avgLatency.toFixed(1)}ms) exceeds 9ms target - consider database optimization`);
    }
    
    if (avgRPS < 50000) {
      recommendations.push(`Current RPS (${Math.floor(avgRPS)}) below 50K target - consider horizontal scaling`);
    }
    
    if (avgErrorRate > 1) {
      recommendations.push(`Error rate (${avgErrorRate.toFixed(2)}%) above acceptable threshold - investigate error patterns`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Performance meeting all targets - ready for enterprise scaling');
    }
    
    return recommendations;
  }
}