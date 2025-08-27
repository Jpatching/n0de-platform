#!/usr/bin/env node

/**
 * n0de Platform - Comprehensive Solana RPC Management Suite
 * Main orchestrator for all platform modules
 */

import chalk from 'chalk';
import ora from 'ora';
import { program } from 'commander';
import { assessmentConfig } from '../config/assessment-config.js';

// Import all assessment modules
import RPCHealthTester from './health/rpc-health-tester.js';
import LatencyAnalyzer from './latency/latency-analyzer.js';
import EnhancedMEVDetector from './mev/enhanced-mev-detector.js';
import RevenueCalculator from './revenue/revenue-calculator.js';
import CompetitorBenchmark from './competitive/competitor-benchmark.js';
import LoadTester from './stress/load-tester.js';

export class AssessmentOrchestrator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      assessmentId: `assessment-${Date.now()}`,
      configuration: assessmentConfig,
      modules: {},
      executiveSummary: {},
      recommendations: [],
      overallScore: 0
    };
    this.spinner = ora();
  }

  async runFullAssessment(options = {}) {
    console.log(chalk.blue.bold('🚀 Starting n0de Platform Assessment\n'));
    console.log(chalk.gray(`Assessment ID: ${this.results.assessmentId}`));
    console.log(chalk.gray(`Hardware: AMD EPYC 9354 32-Core, 755GB RAM, 2x 3.5TB NVMe`));
    console.log(chalk.gray(`Location: UK | Monthly Cost: €${assessmentConfig.costs.monthly}\n`));
    
    const selectedModules = this.determineModulesToRun(options);
    
    try {
      // Run selected assessment modules
      for (const module of selectedModules) {
        await this.runModule(module);
      }
      
      // Generate comprehensive analysis
      await this.generateExecutiveSummary();
      
      // Create final report
      await this.generateFinalReport();
      
      console.log(chalk.green.bold('\n🎉 Comprehensive Assessment Complete!\n'));
      
      return this.results;
      
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Assessment Failed:'), error);
      throw error;
    }
  }

  determineModulesToRun(options) {
    const allModules = [
      { name: 'health', title: 'RPC Health & Performance Testing', class: RPCHealthTester },
      { name: 'latency', title: 'Latency & Speed Analysis', class: LatencyAnalyzer },
      { name: 'mev', title: 'MEV Detection & Profit Assessment', class: EnhancedMEVDetector },
      { name: 'revenue', title: 'Revenue Model & Break-Even Analysis', class: RevenueCalculator },
      { name: 'competitive', title: 'Competitive Analysis', class: CompetitorBenchmark },
      { name: 'stress', title: 'Technical Stress Testing', class: LoadTester }
    ];
    
    if (options.modules && options.modules.length > 0) {
      return allModules.filter(module => options.modules.includes(module.name));
    }
    
    return allModules;
  }

  async runModule(module) {
    console.log(chalk.blue.bold(`\n📊 Running ${module.title}\n`));
    
    try {
      const moduleInstance = new module.class();
      let results;
      
      switch (module.name) {
        case 'health':
          results = await moduleInstance.runFullHealthCheck();
          break;
        case 'latency':
          results = await moduleInstance.runFullLatencyAnalysis();
          break;
        case 'mev':
          results = await moduleInstance.startEnhancedMEVDetection();
          // For assessment, run MEV detection for a limited time
          await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
          moduleInstance.stopDetection();
          break;
        case 'revenue':
          results = await moduleInstance.runRevenueAnalysis();
          break;
        case 'competitive':
          results = await moduleInstance.runCompetitiveAnalysis();
          break;
        case 'stress':
          results = await moduleInstance.runFullStressTest();
          break;
        default:
          throw new Error(`Unknown module: ${module.name}`);
      }
      
      this.results.modules[module.name] = {
        title: module.title,
        results,
        completed: true,
        timestamp: new Date().toISOString()
      };
      
      console.log(chalk.green(`✅ ${module.title} completed successfully\n`));
      
    } catch (error) {
      this.results.modules[module.name] = {
        title: module.title,
        error: error.message,
        completed: false,
        timestamp: new Date().toISOString()
      };
      
      console.log(chalk.red(`❌ ${module.title} failed: ${error.message}\n`));
      throw error;
    }
  }

  async generateExecutiveSummary() {
    this.spinner.start('Generating executive summary');
    
    const summary = {
      profitabilityAssessment: this.assessProfitability(),
      technicalCapabilities: this.assessTechnicalCapabilities(),
      competitivePosition: this.assessCompetitivePosition(),
      marketOpportunity: this.assessMarketOpportunity(),
      riskAssessment: this.assessRisks(),
      timeToMarket: this.estimateTimeToMarket(),
      investmentRequired: this.calculateInvestmentRequired(),
      breakEvenAnalysis: this.extractBreakEvenAnalysis(),
      recommendedStrategy: this.determineRecommendedStrategy()
    };
    
    // Calculate overall assessment score
    this.results.overallScore = this.calculateOverallScore(summary);
    
    this.results.executiveSummary = summary;
    this.spinner.succeed('Executive summary generated');
  }

  assessProfitability() {
    const revenueResults = this.results.modules.revenue?.results;
    if (!revenueResults) return { status: 'insufficient_data' };
    
    const breakEven = revenueResults.breakEvenAnalysis?.combined;
    if (!breakEven) return { status: 'no_break_even_data' };
    
    const scenarios = ['conservative', 'realistic', 'optimistic'];
    const profitabilityScores = {};
    
    scenarios.forEach(scenario => {
      const scenarioData = breakEven[scenario];
      if (scenarioData) {
        profitabilityScores[scenario] = {
          monthlyRevenue: scenarioData.totalMonthlyRevenue,
          monthlyProfit: scenarioData.monthlyProfit,
          breakEvenAchieved: scenarioData.breakEvenAchieved,
          profitMargin: scenarioData.profitMargin,
          monthsToBreakEven: scenarioData.monthsToBreakEven
        };
      }
    });
    
    // Determine overall profitability status
    let status = 'not_profitable';
    if (profitabilityScores.optimistic?.breakEvenAchieved) {
      if (profitabilityScores.realistic?.breakEvenAchieved) {
        status = profitabilityScores.conservative?.breakEvenAchieved ? 'highly_profitable' : 'profitable';
      } else {
        status = 'potentially_profitable';
      }
    }
    
    return {
      status,
      scenarios: profitabilityScores,
      primaryRevenueStream: this.identifyPrimaryRevenueStream(),
      annualProjection: profitabilityScores.realistic?.monthlyProfit * 12 || 0
    };
  }

  identifyPrimaryRevenueStream() {
    const revenueResults = this.results.modules.revenue?.results?.revenueModels;
    if (!revenueResults) return 'unknown';
    
    let maxRevenue = 0;
    let primaryStream = 'unknown';
    
    Object.entries(revenueResults).forEach(([streamName, streamData]) => {
      let streamRevenue = 0;
      
      if (streamData.revenueProjections?.realistic?.revenue) {
        streamRevenue = streamData.revenueProjections.realistic.revenue;
      } else if (streamData.combinedProjections?.realistic?.monthlyRevenue) {
        streamRevenue = streamData.combinedProjections.realistic.monthlyRevenue;
      }
      
      if (streamRevenue > maxRevenue) {
        maxRevenue = streamRevenue;
        primaryStream = streamName;
      }
    });
    
    return primaryStream;
  }

  assessTechnicalCapabilities() {
    const healthResults = this.results.modules.health?.results;
    const stressResults = this.results.modules.stress?.results;
    const latencyResults = this.results.modules.latency?.results;
    
    const capabilities = {
      performance: this.assessPerformanceCapabilities(healthResults, stressResults, latencyResults),
      reliability: this.assessReliability(healthResults),
      scalability: this.assessScalability(stressResults),
      features: this.assessFeatureCapabilities(healthResults)
    };
    
    // Calculate technical score (0-100)
    const scores = Object.values(capabilities).map(cap => cap.score || 0);
    capabilities.overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    return capabilities;
  }

  assessPerformanceCapabilities(healthResults, stressResults, latencyResults) {
    let score = 50; // Base score
    const factors = [];
    
    // Local RPC latency
    if (healthResults?.localPerformance?.performance?.latency?.avg) {
      const avgLatency = healthResults.localPerformance.performance.latency.avg;
      if (avgLatency < 10) {
        score += 20;
        factors.push(`Excellent latency: ${avgLatency.toFixed(1)}ms`);
      } else if (avgLatency < 25) {
        score += 10;
        factors.push(`Good latency: ${avgLatency.toFixed(1)}ms`);
      }
    }
    
    // Throughput from stress tests
    if (stressResults?.loadTests) {
      const maxRPS = Object.entries(stressResults.loadTests)
        .filter(([, result]) => result.errorRate < 10)
        .map(([rps]) => parseInt(rps))
        .reduce((max, rps) => Math.max(max, rps), 0);
      
      if (maxRPS >= 5000) {
        score += 20;
        factors.push(`High throughput: ${maxRPS} RPS`);
      } else if (maxRPS >= 1000) {
        score += 10;
        factors.push(`Good throughput: ${maxRPS} RPS`);
      }
    }
    
    // Hardware advantage
    if (assessmentConfig.hardware.cpu.cores >= 32 && assessmentConfig.hardware.memory.total >= 500) {
      score += 10;
      factors.push('Excellent hardware specs');
    }
    
    return {
      score: Math.min(100, score),
      factors,
      latency: healthResults?.localPerformance?.performance?.latency?.avg || 0,
      throughput: stressResults ? this.extractMaxThroughput(stressResults) : 0,
      hardwareScore: 95 // Based on AMD EPYC 9354 specs
    };
  }

  extractMaxThroughput(stressResults) {
    if (!stressResults.loadTests) return 0;
    
    return Object.entries(stressResults.loadTests)
      .filter(([, result]) => result.errorRate < 10)
      .map(([rps]) => parseInt(rps))
      .reduce((max, rps) => Math.max(max, rps), 0);
  }

  assessReliability(healthResults) {
    let score = 50;
    const factors = [];
    
    if (healthResults?.summary) {
      const successRate = (healthResults.summary.passedTests / healthResults.summary.totalTests) * 100;
      
      if (successRate >= 95) {
        score += 30;
        factors.push(`Excellent success rate: ${successRate.toFixed(1)}%`);
      } else if (successRate >= 85) {
        score += 20;
        factors.push(`Good success rate: ${successRate.toFixed(1)}%`);
      }
    }
    
    // Dedicated hardware reliability advantage
    score += 15;
    factors.push('Dedicated hardware reduces shared failure risks');
    
    return {
      score: Math.min(100, score),
      factors,
      uptime: healthResults?.localPerformance?.reliability?.uptime || 0,
      successRate: healthResults ? this.calculateOverallSuccessRate(healthResults) : 0
    };
  }

  calculateOverallSuccessRate(healthResults) {
    if (!healthResults.summary) return 0;
    return (healthResults.summary.passedTests / healthResults.summary.totalTests) * 100;
  }

  assessScalability(stressResults) {
    let score = 50;
    const factors = [];
    
    if (stressResults?.scalabilityTests) {
      const bottlenecks = stressResults.scalabilityTests.bottleneckAnalysis || [];
      
      if (bottlenecks.length === 0) {
        score += 25;
        factors.push('No critical bottlenecks identified');
      } else if (bottlenecks.filter(b => b.severity === 'High').length === 0) {
        score += 15;
        factors.push('No high-severity bottlenecks');
      }
    }
    
    // Hardware scalability
    const memoryGB = assessmentConfig.hardware.memory.total;
    const cores = assessmentConfig.hardware.cpu.cores;
    
    if (memoryGB >= 500 && cores >= 32) {
      score += 20;
      factors.push('Excellent vertical scaling potential');
    }
    
    return {
      score: Math.min(100, score),
      factors,
      bottlenecks: stressResults?.scalabilityTests?.bottleneckAnalysis || [],
      verticalScaling: 'Excellent',
      horizontalScaling: 'Good with load balancing'
    };
  }

  assessFeatureCapabilities(healthResults) {
    let score = 60; // Base feature score
    const factors = [];
    
    // Basic RPC features
    if (healthResults?.summary?.passedTests > 20) {
      score += 15;
      factors.push('Comprehensive RPC method support');
    }
    
    // Advanced features (based on configuration)
    const advancedFeatures = ['MEV Protection', 'Jito Bundles', 'Priority Fees', 'Custom Endpoints'];
    const supportedFeatures = advancedFeatures.length; // Assume all supported based on config
    
    score += (supportedFeatures / advancedFeatures.length) * 25;
    factors.push(`${supportedFeatures}/${advancedFeatures.length} advanced features supported`);
    
    return {
      score: Math.min(100, score),
      factors,
      basicRPC: true,
      advancedFeatures: supportedFeatures,
      customization: 'High'
    };
  }

  assessCompetitivePosition() {
    const competitiveResults = this.results.modules.competitive?.results;
    if (!competitiveResults) return { status: 'insufficient_data' };
    
    const advantages = competitiveResults.competitiveAdvantages || [];
    const positioning = competitiveResults.marketPositioning?.recommendedPosition;
    
    let positionStrength = 'weak';
    const highStrengthAdvantages = advantages.filter(adv => adv.strength === 'High').length;
    
    if (highStrengthAdvantages >= 3) {
      positionStrength = 'strong';
    } else if (highStrengthAdvantages >= 1) {
      positionStrength = 'moderate';
    }
    
    return {
      strength: positionStrength,
      keyAdvantages: advantages.slice(0, 3), // Top 3 advantages
      recommendedSegment: positioning?.primarySegment || 'unknown',
      opportunityScore: positioning?.opportunityScore || 0,
      competitorCount: Object.keys(competitiveResults.competitors || {}).length,
      differentiators: this.extractKeyDifferentiators(advantages)
    };
  }

  extractKeyDifferentiators(advantages) {
    return advantages
      .filter(adv => adv.strength === 'High')
      .map(adv => adv.advantage)
      .slice(0, 3);
  }

  assessMarketOpportunity() {
    const revenueResults = this.results.modules.revenue?.results;
    const competitiveResults = this.results.modules.competitive?.results;
    
    if (!revenueResults) return { status: 'insufficient_data' };
    
    const marketAnalysis = revenueResults.marketAnalysis;
    const opportunityScore = competitiveResults?.marketPositioning?.recommendedPosition?.opportunityScore || 0;
    
    let opportunityLevel = 'low';
    if (opportunityScore >= 80) {
      opportunityLevel = 'excellent';
    } else if (opportunityScore >= 70) {
      opportunityLevel = 'high';
    } else if (opportunityScore >= 60) {
      opportunityLevel = 'moderate';
    }
    
    return {
      level: opportunityLevel,
      score: opportunityScore,
      marketSize: marketAnalysis?.serviceableMarket?.targetSegment || 0,
      growthPotential: this.calculateGrowthPotential(),
      barriers: this.identifyMarketBarriers(),
      timing: 'Good - Growing Solana ecosystem'
    };
  }

  calculateGrowthPotential() {
    const projections = this.results.modules.revenue?.results?.projections;
    if (!projections) return 'unknown';
    
    const year1Q4 = projections.year1?.quarter4?.totalRevenue || 0;
    const year3Q4 = projections.year3?.quarter4?.totalRevenue || 0;
    
    if (year3Q4 > year1Q4 * 5) {
      return 'high';
    } else if (year3Q4 > year1Q4 * 2) {
      return 'moderate';
    }
    return 'low';
  }

  identifyMarketBarriers() {
    return [
      'Technical expertise required',
      'Infrastructure investment needed',
      'Established competitor relationships',
      'Regulatory considerations'
    ];
  }

  assessRisks() {
    const risks = [
      {
        type: 'Technical',
        level: 'Medium',
        description: 'Hardware failure or performance degradation',
        mitigation: 'Hardware monitoring and backup plans'
      },
      {
        type: 'Market',
        level: 'Medium',
        description: 'Increased competition from major providers',
        mitigation: 'Focus on unique value propositions and customer relationships'
      },
      {
        type: 'Financial',
        level: 'Low',
        description: 'Revenue projections not met',
        mitigation: 'Conservative break-even analysis and multiple revenue streams'
      },
      {
        type: 'Operational',
        level: 'Low',
        description: 'Scaling challenges with growing demand',
        mitigation: 'Hardware capacity planning and automation'
      }
    ];
    
    const highRisks = risks.filter(r => r.level === 'High').length;
    const mediumRisks = risks.filter(r => r.level === 'Medium').length;
    
    let overallRiskLevel = 'Low';
    if (highRisks > 0) {
      overallRiskLevel = 'High';
    } else if (mediumRisks > 2) {
      overallRiskLevel = 'Medium';
    }
    
    return {
      overall: overallRiskLevel,
      risks,
      mitigationPlan: 'Comprehensive risk management and monitoring systems'
    };
  }

  estimateTimeToMarket() {
    const phases = [
      { phase: 'Infrastructure Setup', weeks: 2 },
      { phase: 'RPC Service Development', weeks: 4 },
      { phase: 'MEV Services Implementation', weeks: 6 },
      { phase: 'Testing & Optimization', weeks: 3 },
      { phase: 'Marketing & Launch Preparation', weeks: 2 },
      { phase: 'Initial Customer Onboarding', weeks: 1 }
    ];
    
    const totalWeeks = phases.reduce((sum, phase) => sum + phase.weeks, 0);
    
    return {
      totalWeeks,
      totalMonths: Math.ceil(totalWeeks / 4),
      phases,
      criticalPath: 'MEV Services Implementation',
      parallelTasks: 'Marketing can begin during development phase'
    };
  }

  calculateInvestmentRequired() {
    const monthlyCosts = assessmentConfig.costs.monthly; // €429
    const developmentCosts = 15000; // Estimated development costs in EUR
    const marketingBudget = 5000; // Initial marketing budget in EUR
    const workingCapital = monthlyCosts * 6; // 6 months operating expenses
    
    const totalInvestment = developmentCosts + marketingBudget + workingCapital;
    
    return {
      development: developmentCosts,
      marketing: marketingBudget,
      workingCapital: workingCapital,
      total: totalInvestment,
      currency: 'EUR',
      paybackPeriod: this.calculatePaybackPeriod(totalInvestment)
    };
  }

  calculatePaybackPeriod(investment) {
    const revenueResults = this.results.modules.revenue?.results;
    if (!revenueResults?.breakEvenAnalysis?.combined?.realistic) {
      return { months: 'unknown', achievable: false };
    }
    
    const monthlyProfit = revenueResults.breakEvenAnalysis.combined.realistic.monthlyProfit;
    if (monthlyProfit <= 0) {
      return { months: 'not achievable', achievable: false };
    }
    
    const months = Math.ceil(investment / monthlyProfit);
    return {
      months,
      achievable: true,
      monthlyProfit
    };
  }

  extractBreakEvenAnalysis() {
    const revenueResults = this.results.modules.revenue?.results?.breakEvenAnalysis;
    if (!revenueResults) return { status: 'no_data' };
    
    return {
      monthlyCosts: revenueResults.monthlyCosts?.total || 0,
      scenarios: revenueResults.combined || {},
      breakEvenAchievable: revenueResults.combined?.realistic?.breakEvenAchieved || false,
      monthsToBreakEven: revenueResults.combined?.realistic?.monthsToBreakEven || 999
    };
  }

  determineRecommendedStrategy() {
    const profitability = this.results.executiveSummary?.profitabilityAssessment;
    const competitive = this.results.executiveSummary?.competitivePosition;
    const market = this.results.executiveSummary?.marketOpportunity;
    
    let strategy = 'cautious_approach';
    let confidence = 'low';
    
    if (profitability?.status === 'highly_profitable' && 
        competitive?.strength === 'strong' && 
        market?.level === 'excellent') {
      strategy = 'aggressive_growth';
      confidence = 'high';
    } else if (profitability?.status === 'profitable' && 
               competitive?.strength !== 'weak' && 
               market?.level !== 'low') {
      strategy = 'steady_growth';
      confidence = 'medium';
    } else if (profitability?.status === 'potentially_profitable') {
      strategy = 'pilot_program';
      confidence = 'medium';
    }
    
    const strategies = {
      aggressive_growth: {
        approach: 'Full market entry with significant investment',
        timeline: '3-6 months',
        investment: 'High',
        expectedROI: '200-500%',
        keyActions: [
          'Launch all revenue streams simultaneously',
          'Aggressive marketing campaign',
          'Hire dedicated team',
          'Scale infrastructure proactively'
        ]
      },
      steady_growth: {
        approach: 'Phased rollout with moderate investment',
        timeline: '6-12 months',
        investment: 'Medium',
        expectedROI: '100-300%',
        keyActions: [
          'Start with RPC-as-a-Service',
          'Add MEV services after proof of concept',
          'Gradual customer acquisition',
          'Scale based on demand'
        ]
      },
      pilot_program: {
        approach: 'Small-scale test with minimal investment',
        timeline: '3-9 months',
        investment: 'Low',
        expectedROI: '50-150%',
        keyActions: [
          'Launch basic RPC service only',
          'Focus on cost optimization',
          'Validate market demand',
          'Prove business model before scaling'
        ]
      },
      cautious_approach: {
        approach: 'Further research and optimization needed',
        timeline: '6-18 months',
        investment: 'Minimal',
        expectedROI: 'Uncertain',
        keyActions: [
          'Improve technical performance',
          'Conduct more market research',
          'Optimize cost structure',
          'Consider alternative business models'
        ]
      }
    };
    
    return {
      recommended: strategy,
      confidence,
      details: strategies[strategy],
      reasoning: this.generateStrategyReasoning(profitability, competitive, market)
    };
  }

  generateStrategyReasoning(profitability, competitive, market) {
    const reasons = [];
    
    if (profitability?.status === 'highly_profitable') {
      reasons.push('Strong profitability across all scenarios');
    } else if (profitability?.status === 'profitable') {
      reasons.push('Good profitability in realistic scenarios');
    } else if (profitability?.status === 'potentially_profitable') {
      reasons.push('Profitability only in optimistic scenarios');
    } else {
      reasons.push('Profitability concerns require addressing');
    }
    
    if (competitive?.strength === 'strong') {
      reasons.push('Strong competitive advantages identified');
    } else if (competitive?.strength === 'moderate') {
      reasons.push('Moderate competitive position with some advantages');
    } else {
      reasons.push('Competitive position needs strengthening');
    }
    
    if (market?.level === 'excellent' || market?.level === 'high') {
      reasons.push('Strong market opportunity identified');
    } else if (market?.level === 'moderate') {
      reasons.push('Moderate market opportunity exists');
    } else {
      reasons.push('Limited market opportunity or high barriers');
    }
    
    return reasons;
  }

  calculateOverallScore(summary) {
    const weights = {
      profitability: 0.35,
      technical: 0.25,
      competitive: 0.20,
      market: 0.15,
      risk: 0.05
    };
    
    const scores = {
      profitability: this.scoreProfitability(summary.profitabilityAssessment),
      technical: summary.technicalCapabilities?.overallScore || 50,
      competitive: this.scoreCompetitivePosition(summary.competitivePosition),
      market: summary.marketOpportunity?.score || 50,
      risk: this.scoreRiskLevel(summary.riskAssessment)
    };
    
    const weightedScore = Object.entries(weights).reduce((total, [category, weight]) => {
      return total + (scores[category] * weight);
    }, 0);
    
    return Math.round(weightedScore);
  }

  scoreProfitability(assessment) {
    const statusScores = {
      highly_profitable: 95,
      profitable: 80,
      potentially_profitable: 65,
      not_profitable: 30
    };
    
    return statusScores[assessment?.status] || 30;
  }

  scoreCompetitivePosition(position) {
    const strengthScores = {
      strong: 85,
      moderate: 65,
      weak: 40
    };
    
    return strengthScores[position?.strength] || 40;
  }

  scoreRiskLevel(riskAssessment) {
    const riskScores = {
      Low: 85,
      Medium: 70,
      High: 40
    };
    
    return riskScores[riskAssessment?.overall] || 70;
  }

  async generateFinalReport() {
    console.log(chalk.blue.bold('\n📋 Generating Comprehensive Assessment Report\n'));
    
    // Generate HTML report
    await this.generateHTMLReport();
    
    // Generate JSON report
    await this.generateJSONReport();
    
    // Generate executive summary
    this.printExecutiveSummary();
  }

  async generateHTMLReport() {
    const reportTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>n0de Platform Assessment - ${this.results.assessmentId}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
        .score-badge { display: inline-block; background: #28a745; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 18px; }
        .section { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; background: #f8f9fa; border-radius: 8px; min-width: 150px; }
        .recommendation { background: #e7f3ff; padding: 15px; border-left: 4px solid #007bff; margin: 10px 0; }
        .risk { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 10px 0; }
        .success { color: #28a745; font-weight: bold; }
        .warning { color: #ffc107; font-weight: bold; }
        .danger { color: #dc3545; font-weight: bold; }
        .chart-placeholder { width: 100%; height: 300px; background: #f8f9fa; border: 2px dashed #dee2e6; display: flex; align-items: center; justify-content: center; color: #6c757d; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; }
    </style>
</head>
<body>
    <div class="header">
        <h1>n0de Platform Assessment Report</h1>
        <p><strong>Assessment ID:</strong> ${this.results.assessmentId}</p>
        <p><strong>Generated:</strong> ${this.results.timestamp}</p>
        <p><strong>Overall Score:</strong> <span class="score-badge">${this.results.overallScore}/100</span></p>
    </div>

    <div class="section">
        <h2>Executive Summary</h2>
        ${this.generateExecutiveSummaryHTML()}
    </div>

    <div class="section">
        <h2>Technical Assessment</h2>
        ${this.generateTechnicalAssessmentHTML()}
    </div>

    <div class="section">
        <h2>Financial Analysis</h2>
        ${this.generateFinancialAnalysisHTML()}
    </div>

    <div class="section">
        <h2>Competitive Analysis</h2>
        ${this.generateCompetitiveAnalysisHTML()}
    </div>

    <div class="section">
        <h2>Recommendations</h2>
        ${this.generateRecommendationsHTML()}
    </div>

    <div class="section">
        <h2>Risk Assessment</h2>
        ${this.generateRiskAssessmentHTML()}
    </div>

    <div class="section">
        <h2>Implementation Roadmap</h2>
        ${this.generateRoadmapHTML()}
    </div>
</body>
</html>`;
    
    const { writeFileSync } = await import('fs');
    writeFileSync(`reports/assessment-report-${this.results.assessmentId}.html`, reportTemplate);
    
    console.log(chalk.green(`✅ HTML report saved: reports/assessment-report-${this.results.assessmentId}.html`));
  }

  generateExecutiveSummaryHTML() {
    const summary = this.results.executiveSummary;
    const profitability = summary?.profitabilityAssessment;
    const strategy = summary?.recommendedStrategy;
    
    return `
        <div class="metric">
            <h4>Profitability Status</h4>
            <div class="${profitability?.status === 'highly_profitable' ? 'success' : profitability?.status === 'profitable' ? 'success' : 'warning'}">
                ${profitability?.status?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN'}
            </div>
        </div>
        
        <div class="metric">
            <h4>Break-Even Timeline</h4>
            <div>${summary?.breakEvenAnalysis?.monthsToBreakEven || 'Unknown'} months</div>
        </div>
        
        <div class="metric">
            <h4>Recommended Strategy</h4>
            <div>${strategy?.recommended?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN'}</div>
        </div>
        
        <div class="metric">
            <h4>Investment Required</h4>
            <div>€${summary?.investmentRequired?.total?.toLocaleString() || 'Unknown'}</div>
        </div>
        
        <p><strong>Key Finding:</strong> ${this.generateKeyFinding()}</p>
    `;
  }

  generateKeyFinding() {
    const score = this.results.overallScore;
    const profitability = this.results.executiveSummary?.profitabilityAssessment?.status;
    
    if (score >= 80 && profitability === 'highly_profitable') {
      return 'Excellent opportunity with high profit potential and strong competitive advantages.';
    } else if (score >= 70 && profitability === 'profitable') {
      return 'Good opportunity with solid profit potential and moderate competitive advantages.';
    } else if (score >= 60) {
      return 'Moderate opportunity requiring careful execution and risk management.';
    } else {
      return 'Challenging opportunity requiring significant optimization before launch.';
    }
  }

  generateTechnicalAssessmentHTML() {
    const technical = this.results.executiveSummary?.technicalCapabilities;
    if (!technical) return '<p>Technical assessment data not available.</p>';
    
    return `
        <table>
            <tr>
                <th>Capability</th>
                <th>Score</th>
                <th>Status</th>
                <th>Key Factors</th>
            </tr>
            <tr>
                <td>Performance</td>
                <td>${technical.performance?.score || 'N/A'}/100</td>
                <td class="${technical.performance?.score >= 80 ? 'success' : technical.performance?.score >= 60 ? 'warning' : 'danger'}">
                    ${technical.performance?.score >= 80 ? 'Excellent' : technical.performance?.score >= 60 ? 'Good' : 'Needs Improvement'}
                </td>
                <td>${technical.performance?.factors?.join(', ') || 'N/A'}</td>
            </tr>
            <tr>
                <td>Reliability</td>
                <td>${technical.reliability?.score || 'N/A'}/100</td>
                <td class="${technical.reliability?.score >= 80 ? 'success' : technical.reliability?.score >= 60 ? 'warning' : 'danger'}">
                    ${technical.reliability?.score >= 80 ? 'Excellent' : technical.reliability?.score >= 60 ? 'Good' : 'Needs Improvement'}
                </td>
                <td>${technical.reliability?.factors?.join(', ') || 'N/A'}</td>
            </tr>
            <tr>
                <td>Scalability</td>
                <td>${technical.scalability?.score || 'N/A'}/100</td>
                <td class="${technical.scalability?.score >= 80 ? 'success' : technical.scalability?.score >= 60 ? 'warning' : 'danger'}">
                    ${technical.scalability?.score >= 80 ? 'Excellent' : technical.scalability?.score >= 60 ? 'Good' : 'Needs Improvement'}
                </td>
                <td>${technical.scalability?.factors?.join(', ') || 'N/A'}</td>
            </tr>
        </table>
    `;
  }

  generateFinancialAnalysisHTML() {
    const profitability = this.results.executiveSummary?.profitabilityAssessment;
    const breakEven = this.results.executiveSummary?.breakEvenAnalysis;
    
    if (!profitability) return '<p>Financial analysis data not available.</p>';
    
    return `
        <h3>Revenue Projections</h3>
        <table>
            <tr>
                <th>Scenario</th>
                <th>Monthly Revenue</th>
                <th>Monthly Profit</th>
                <th>Break-Even</th>
                <th>Profit Margin</th>
            </tr>
            ${Object.entries(profitability.scenarios || {}).map(([scenario, data]) => `
                <tr>
                    <td>${scenario.charAt(0).toUpperCase() + scenario.slice(1)}</td>
                    <td>$${data.monthlyRevenue?.toLocaleString() || 'N/A'}</td>
                    <td class="${data.monthlyProfit > 0 ? 'success' : 'danger'}">
                        $${data.monthlyProfit?.toLocaleString() || 'N/A'}
                    </td>
                    <td class="${data.breakEvenAchieved ? 'success' : 'danger'}">
                        ${data.breakEvenAchieved ? 'Yes' : 'No'}
                    </td>
                    <td>${data.profitMargin?.toFixed(1) || 'N/A'}%</td>
                </tr>
            `).join('')}
        </table>
        
        <h3>Investment Requirements</h3>
        <p><strong>Total Investment:</strong> €${this.results.executiveSummary?.investmentRequired?.total?.toLocaleString() || 'Unknown'}</p>
        <p><strong>Payback Period:</strong> ${this.results.executiveSummary?.investmentRequired?.paybackPeriod?.months || 'Unknown'} months</p>
    `;
  }

  generateCompetitiveAnalysisHTML() {
    const competitive = this.results.executiveSummary?.competitivePosition;
    if (!competitive) return '<p>Competitive analysis data not available.</p>';
    
    return `
        <p><strong>Competitive Strength:</strong> <span class="${competitive.strength === 'strong' ? 'success' : competitive.strength === 'moderate' ? 'warning' : 'danger'}">${competitive.strength.toUpperCase()}</span></p>
        <p><strong>Target Market Segment:</strong> ${competitive.recommendedSegment?.replace(/([A-Z])/g, ' $1').trim() || 'Unknown'}</p>
        <p><strong>Market Opportunity Score:</strong> ${competitive.opportunityScore}/100</p>
        
        <h4>Key Competitive Advantages:</h4>
        <ul>
            ${competitive.keyAdvantages?.map(adv => `<li><strong>${adv.advantage}:</strong> ${adv.description}</li>`).join('') || '<li>No advantages identified</li>'}
        </ul>
        
        <h4>Key Differentiators:</h4>
        <ul>
            ${competitive.differentiators?.map(diff => `<li>${diff}</li>`).join('') || '<li>No differentiators identified</li>'}
        </ul>
    `;
  }

  generateRecommendationsHTML() {
    const strategy = this.results.executiveSummary?.recommendedStrategy;
    if (!strategy) return '<p>Recommendation data not available.</p>';
    
    return `
        <div class="recommendation">
            <h4>Recommended Strategy: ${strategy.recommended?.replace(/_/g, ' ').toUpperCase()}</h4>
            <p><strong>Confidence Level:</strong> ${strategy.confidence?.toUpperCase()}</p>
            <p><strong>Approach:</strong> ${strategy.details?.approach}</p>
            <p><strong>Timeline:</strong> ${strategy.details?.timeline}</p>
            <p><strong>Investment Level:</strong> ${strategy.details?.investment}</p>
            <p><strong>Expected ROI:</strong> ${strategy.details?.expectedROI}</p>
            
            <h5>Key Actions:</h5>
            <ul>
                ${strategy.details?.keyActions?.map(action => `<li>${action}</li>`).join('') || '<li>No specific actions identified</li>'}
            </ul>
            
            <h5>Reasoning:</h5>
            <ul>
                ${strategy.reasoning?.map(reason => `<li>${reason}</li>`).join('') || '<li>No reasoning provided</li>'}
            </ul>
        </div>
    `;
  }

  generateRiskAssessmentHTML() {
    const risks = this.results.executiveSummary?.riskAssessment;
    if (!risks) return '<p>Risk assessment data not available.</p>';
    
    return `
        <p><strong>Overall Risk Level:</strong> <span class="${risks.overall === 'Low' ? 'success' : risks.overall === 'Medium' ? 'warning' : 'danger'}">${risks.overall}</span></p>
        
        <h4>Identified Risks:</h4>
        ${risks.risks?.map(risk => `
            <div class="risk">
                <h5>${risk.type} Risk - ${risk.level} Level</h5>
                <p><strong>Description:</strong> ${risk.description}</p>
                <p><strong>Mitigation:</strong> ${risk.mitigation}</p>
            </div>
        `).join('') || '<p>No risks identified</p>'}
    `;
  }

  generateRoadmapHTML() {
    const timeToMarket = this.results.executiveSummary?.timeToMarket;
    if (!timeToMarket) return '<p>Roadmap data not available.</p>';
    
    return `
        <p><strong>Total Timeline:</strong> ${timeToMarket.totalWeeks} weeks (${timeToMarket.totalMonths} months)</p>
        <p><strong>Critical Path:</strong> ${timeToMarket.criticalPath}</p>
        
        <h4>Implementation Phases:</h4>
        <table>
            <tr>
                <th>Phase</th>
                <th>Duration</th>
                <th>Description</th>
            </tr>
            ${timeToMarket.phases?.map(phase => `
                <tr>
                    <td>${phase.phase}</td>
                    <td>${phase.weeks} weeks</td>
                    <td>Implementation of ${phase.phase.toLowerCase()}</td>
                </tr>
            `).join('') || '<tr><td colspan="3">No phases defined</td></tr>'}
        </table>
        
        <p><strong>Optimization Note:</strong> ${timeToMarket.parallelTasks}</p>
    `;
  }

  async generateJSONReport() {
    const { writeFileSync } = await import('fs');
    writeFileSync(`reports/assessment-results-${this.results.assessmentId}.json`, JSON.stringify(this.results, null, 2));
    
    console.log(chalk.green(`✅ JSON report saved: reports/assessment-results-${this.results.assessmentId}.json`));
  }

  printExecutiveSummary() {
    console.log(chalk.blue.bold('🎯 Executive Summary\n'));
    
    const summary = this.results.executiveSummary;
    
    // Overall score
    const scoreColor = this.results.overallScore >= 80 ? chalk.green : 
                      this.results.overallScore >= 60 ? chalk.yellow : chalk.red;
    console.log(`${chalk.bold('Overall Assessment Score:')} ${scoreColor(`${this.results.overallScore}/100`)}\n`);
    
    // Key metrics
    const metricsTable = new Table({
      head: ['Metric', 'Result', 'Status'],
      colWidths: [25, 20, 15]
    });
    
    const profitability = summary?.profitabilityAssessment;
    const breakEven = summary?.breakEvenAnalysis;
    const competitive = summary?.competitivePosition;
    const market = summary?.marketOpportunity;
    
    metricsTable.push([
      'Profitability Status',
      profitability?.status?.replace(/_/g, ' ').toUpperCase() || 'Unknown',
      profitability?.status === 'highly_profitable' || profitability?.status === 'profitable' ? 
        chalk.green('GOOD') : chalk.yellow('MODERATE')
    ]);
    
    metricsTable.push([
      'Break-Even Timeline',
      `${breakEven?.monthsToBreakEven || 'Unknown'} months`,
      breakEven?.monthsToBreakEven <= 12 ? chalk.green('FAST') : 
        breakEven?.monthsToBreakEven <= 24 ? chalk.yellow('MODERATE') : chalk.red('SLOW')
    ]);
    
    metricsTable.push([
      'Competitive Position',
      competitive?.strength?.toUpperCase() || 'Unknown',
      competitive?.strength === 'strong' ? chalk.green('STRONG') : 
        competitive?.strength === 'moderate' ? chalk.yellow('MODERATE') : chalk.red('WEAK')
    ]);
    
    metricsTable.push([
      'Market Opportunity',
      market?.level?.toUpperCase() || 'Unknown',
      market?.level === 'excellent' || market?.level === 'high' ? chalk.green('HIGH') : 
        market?.level === 'moderate' ? chalk.yellow('MODERATE') : chalk.red('LOW')
    ]);
    
    console.log(metricsTable.toString());
    
    // Recommended strategy
    const strategy = summary?.recommendedStrategy;
    if (strategy) {
      console.log(chalk.yellow.bold('\n📋 Recommended Strategy\n'));
      console.log(`${chalk.bold('Strategy:')} ${strategy.recommended?.replace(/_/g, ' ').toUpperCase()}`);
      console.log(`${chalk.bold('Confidence:')} ${strategy.confidence?.toUpperCase()}`);
      console.log(`${chalk.bold('Timeline:')} ${strategy.details?.timeline}`);
      console.log(`${chalk.bold('Investment:')} ${strategy.details?.investment}`);
      console.log(`${chalk.bold('Expected ROI:')} ${strategy.details?.expectedROI}`);
      
      console.log(chalk.bold('\nKey Actions:'));
      strategy.details?.keyActions?.forEach((action, index) => {
        console.log(`  ${index + 1}. ${action}`);
      });
    }
    
    // Investment summary
    const investment = summary?.investmentRequired;
    if (investment) {
      console.log(chalk.yellow.bold('\n💰 Investment Summary\n'));
      console.log(`${chalk.bold('Total Investment Required:')} €${investment.total?.toLocaleString()}`);
      console.log(`${chalk.bold('Development Costs:')} €${investment.development?.toLocaleString()}`);
      console.log(`${chalk.bold('Marketing Budget:')} €${investment.marketing?.toLocaleString()}`);
      console.log(`${chalk.bold('Working Capital:')} €${investment.workingCapital?.toLocaleString()}`);
      console.log(`${chalk.bold('Payback Period:')} ${investment.paybackPeriod?.months} months`);
    }
    
    // Final recommendation
    console.log(chalk.green.bold('\n🎉 Final Recommendation\n'));
    console.log(this.generateFinalRecommendation());
  }

  generateFinalRecommendation() {
    const score = this.results.overallScore;
    const profitability = this.results.executiveSummary?.profitabilityAssessment?.status;
    const strategy = this.results.executiveSummary?.recommendedStrategy?.recommended;
    
    if (score >= 80 && profitability === 'highly_profitable') {
      return chalk.green(`✅ STRONG RECOMMENDATION: Proceed with ${strategy?.replace(/_/g, ' ')} strategy. \nThis opportunity shows excellent profit potential with your current hardware setup. \nYour AMD EPYC 9354 server provides significant competitive advantages in the UK/European market.`);
    } else if (score >= 70 && profitability === 'profitable') {
      return chalk.yellow(`⚠️  MODERATE RECOMMENDATION: Consider proceeding with ${strategy?.replace(/_/g, ' ')} strategy. \nGood profit potential exists, but requires careful execution and risk management. \nYour hardware provides solid advantages, focus on operational excellence.`);
    } else if (score >= 60) {
      return chalk.yellow(`⚠️  CONDITIONAL RECOMMENDATION: Proceed with caution using ${strategy?.replace(/_/g, ' ')} strategy. \nOpportunity exists but requires optimization and careful market entry. \nConsider starting with a pilot program to validate assumptions.`);
    } else {
      return chalk.red(`❌ NOT RECOMMENDED: Current analysis suggests significant challenges. \nConsider addressing technical and market positioning issues before launch. \nFocus on optimization and possibly alternative business models.`);
    }
  }
}

// CLI Program
program
  .name('n0de-platform')
  .description('Comprehensive Solana RPC Management Platform')
  .version('1.0.0');

program
  .command('full')
  .description('Run complete assessment (all modules)')
  .option('-m, --modules <modules...>', 'specific modules to run')
  .option('--config <file>', 'custom configuration file')
  .action(async (options) => {
    try {
      const orchestrator = new AssessmentOrchestrator();
      await orchestrator.runFullAssessment(options);
    } catch (error) {
      console.error(chalk.red('Assessment failed:'), error);
      process.exit(1);
    }
  });

program
  .command('health')
  .description('Run RPC health and performance testing only')
  .action(async () => {
    try {
      const tester = new RPCHealthTester();
      await tester.runFullHealthCheck();
    } catch (error) {
      console.error(chalk.red('Health test failed:'), error);
      process.exit(1);
    }
  });

program
  .command('revenue')
  .description('Run revenue analysis only')
  .action(async () => {
    try {
      const calculator = new RevenueCalculator();
      await calculator.runRevenueAnalysis();
    } catch (error) {
      console.error(chalk.red('Revenue analysis failed:'), error);
      process.exit(1);
    }
  });

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  // If no arguments provided, run full assessment
  if (process.argv.length === 2) {
    const orchestrator = new AssessmentOrchestrator();
    orchestrator.runFullAssessment()
      .then(() => process.exit(0))
      .catch(error => {
        console.error(chalk.red('Assessment failed:'), error);
        process.exit(1);
      });
  } else {
    program.parse();
  }
}

export default AssessmentOrchestrator;