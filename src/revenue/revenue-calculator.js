#!/usr/bin/env node

/**
 * Revenue Model Calculator & Break-Even Analysis
 * Comprehensive analysis of RPC profitability and business models
 */

import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { assessmentConfig } from '../../config/assessment-config.js';
import { createWriteStream } from 'fs';

export class RevenueCalculator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      costs: assessmentConfig.costs,
      revenueModels: {},
      breakEvenAnalysis: {},
      projections: {},
      recommendations: []
    };
    this.spinner = ora();
    this.logStream = createWriteStream('reports/revenue-analysis.log');
  }

  async runRevenueAnalysis() {
    console.log(chalk.blue.bold('💰 Starting Revenue Model Analysis & Break-Even Calculation\n'));
    
    // Analyze different revenue models
    await this.analyzeRPCAsServiceModel();
    await this.analyzeMEVServicesModel();
    await this.analyzeDataServicesModel();
    await this.analyzePremiumFeaturesModel();
    await this.analyzePartnershipModel();
    
    // Calculate break-even scenarios
    this.calculateBreakEvenScenarios();
    
    // Generate growth projections
    this.generateGrowthProjections();
    
    // Market opportunity analysis
    this.analyzeMarketOpportunity();
    
    // Generate recommendations
    this.generateRecommendations();
    
    await this.generateReport();
    return this.results;
  }

  async analyzeRPCAsServiceModel() {
    this.spinner.start('Analyzing RPC-as-a-Service revenue model');
    
    const rpcModel = {
      name: 'RPC-as-a-Service',
      description: 'Direct RPC access with tiered pricing',
      tiers: [],
      monthlyCapacity: this.calculateMonthlyCapacity(),
      competitorAnalysis: this.analyzeCompetitorPricing(),
      revenueProjections: {}
    };

    // Define pricing tiers based on competitive analysis
    const tiers = [
      {
        name: 'Starter',
        monthlyPrice: 29,
        requestsIncluded: 100000,
        features: ['Basic RPC', 'Standard Support', '99.9% SLA'],
        targetMarket: 'Individual developers, small projects',
        marginPercent: 75
      },
      {
        name: 'Pro',
        monthlyPrice: 149,
        requestsIncluded: 1000000,
        features: ['Priority RPC', 'MEV Protection', 'Analytics Dashboard', '99.95% SLA'],
        targetMarket: 'Growing dApps, trading bots',
        marginPercent: 80
      },
      {
        name: 'Business',
        monthlyPrice: 499,
        requestsIncluded: 5000000,
        features: ['Dedicated Resources', 'Custom Endpoints', 'Advanced Analytics', '24/7 Support'],
        targetMarket: 'Established protocols, exchanges',
        marginPercent: 82
      },
      {
        name: 'Enterprise',
        monthlyPrice: 1499,
        requestsIncluded: 20000000,
        features: ['Dedicated Nodes', 'White-label Option', 'SLA Guarantee', 'Custom Integration'],
        targetMarket: 'Major protocols, institutional clients',
        marginPercent: 85
      }
    ];

    // Calculate revenue projections for each tier
    tiers.forEach(tier => {
      const scenarios = this.calculateTierScenarios(tier, rpcModel.monthlyCapacity);
      tier.scenarios = scenarios;
      rpcModel.tiers.push(tier);
    });

    // Calculate blended revenue scenarios
    rpcModel.revenueProjections = this.calculateBlendedRevenueProjections(tiers);
    
    this.results.revenueModels.rpcAsService = rpcModel;
    this.spinner.succeed('RPC-as-a-Service model analysis complete');
  }

  calculateMonthlyCapacity() {
    // Based on hardware specs: AMD EPYC 9354, 755GB RAM
    const maxRPS = 15000; // Conservative estimate based on hardware
    const secondsPerMonth = 30 * 24 * 60 * 60;
    const theoreticalMax = maxRPS * secondsPerMonth;
    const practicalCapacity = theoreticalMax * 0.7; // 70% utilization target
    
    return {
      maxRPS,
      theoreticalMax,
      practicalCapacity,
      utilizationTarget: 0.7,
      redundancyReserve: 0.3
    };
  }

  analyzeCompetitorPricing() {
    const competitors = assessmentConfig.rpcEndpoints.competitors;
    const analysis = {};
    
    Object.entries(competitors).forEach(([name, config]) => {
      if (config.pricing) {
        analysis[name] = {
          pricing: config.pricing,
          positionVsUs: this.calculateCompetitivePosition(config.pricing)
        };
      }
    });
    
    return analysis;
  }

  calculateCompetitivePosition(competitorPricing) {
    // Compare against our proposed pricing
    const ourTiers = [29, 149, 499, 1499];
    const theirTiers = Object.values(competitorPricing);
    
    return {
      averageDiscount: this.calculateAverageDiscount(ourTiers, theirTiers),
      competitiveAdvantage: ourTiers.length > theirTiers.length ? 'More options' : 'Simpler pricing',
      pricePosition: 'competitive' // Would be calculated based on actual comparison
    };
  }

  calculateAverageDiscount(ourPrices, theirPrices) {
    const comparisons = [];
    ourPrices.forEach(ourPrice => {
      const closestCompetitor = theirPrices.reduce((closest, price) => 
        Math.abs(price - ourPrice) < Math.abs(closest - ourPrice) ? price : closest
      );
      if (closestCompetitor > 0) {
        comparisons.push((closestCompetitor - ourPrice) / closestCompetitor);
      }
    });
    
    return comparisons.length > 0 ? 
      comparisons.reduce((sum, discount) => sum + discount, 0) / comparisons.length : 0;
  }

  calculateTierScenarios(tier, capacity) {
    const scenarios = {
      conservative: { adoptionRate: 0.01, customersNeeded: 0, revenue: 0, capacityUsed: 0 },
      realistic: { adoptionRate: 0.05, customersNeeded: 0, revenue: 0, capacityUsed: 0 },
      optimistic: { adoptionRate: 0.15, customersNeeded: 0, revenue: 0, capacityUsed: 0 }
    };
    
    Object.keys(scenarios).forEach(scenario => {
      const adoptionRate = scenarios[scenario].adoptionRate;
      const requestsPerMonth = tier.requestsIncluded;
      const maxCustomers = Math.floor(capacity.practicalCapacity / requestsPerMonth);
      const targetCustomers = Math.floor(maxCustomers * adoptionRate);
      
      scenarios[scenario].customersNeeded = targetCustomers;
      scenarios[scenario].revenue = targetCustomers * tier.monthlyPrice;
      scenarios[scenario].capacityUsed = (targetCustomers * requestsPerMonth) / capacity.practicalCapacity;
      scenarios[scenario].netProfit = scenarios[scenario].revenue * (tier.marginPercent / 100);
    });
    
    return scenarios;
  }

  calculateBlendedRevenueProjections(tiers) {
    const projections = {
      month1: { revenue: 0, customers: 0, profit: 0 },
      month6: { revenue: 0, customers: 0, profit: 0 },
      month12: { revenue: 0, customers: 0, profit: 0 },
      month24: { revenue: 0, customers: 0, profit: 0 }
    };
    
    // Realistic distribution across tiers (based on typical SaaS patterns)
    const tierDistribution = [0.6, 0.25, 0.12, 0.03]; // Starter, Pro, Business, Enterprise
    
    Object.keys(projections).forEach(period => {
      const monthMultiplier = {
        month1: 0.1,
        month6: 0.4,
        month12: 0.7,
        month24: 1.0
      }[period];
      
      tiers.forEach((tier, index) => {
        const tierWeight = tierDistribution[index];
        const customers = Math.floor(tier.scenarios.realistic.customersNeeded * monthMultiplier * tierWeight);
        const revenue = customers * tier.monthlyPrice;
        const profit = revenue * (tier.marginPercent / 100);
        
        projections[period].customers += customers;
        projections[period].revenue += revenue;
        projections[period].profit += profit;
      });
    });
    
    return projections;
  }

  async analyzeMEVServicesModel() {
    this.spinner.start('Analyzing MEV services revenue model');
    
    const mevModel = {
      name: 'MEV Services',
      description: 'MEV detection, protection, and profit-sharing services',
      services: [
        {
          name: 'Arbitrage Bot API',
          monthlyFee: 199,
          revenueShare: 0.1, // 10% of profits
          targetMarket: 'Arbitrage traders',
          estimatedUsers: { conservative: 10, realistic: 25, optimistic: 60 },
          avgMonthlyVolume: 100000, // USD per user
          estimatedProfitMargin: 0.005 // 0.5% of volume
        },
        {
          name: 'Sandwich Protection',
          monthlyFee: 99,
          perTransactionFee: 0.001, // SOL
          targetMarket: 'DeFi users, protocols',
          estimatedUsers: { conservative: 50, realistic: 150, optimistic: 400 },
          avgMonthlyTransactions: 1000 // per user
        },
        {
          name: 'Liquidation Alerts',
          monthlyFee: 49,
          alertFee: 0.5, // USD per alert
          targetMarket: 'Liquidators, risk managers',
          estimatedUsers: { conservative: 30, realistic: 80, optimistic: 200 },
          avgMonthlyAlerts: 50 // per user
        },
        {
          name: 'Copy Trading Signals',
          monthlyFee: 299,
          successFee: 0.15, // 15% of profits
          targetMarket: 'Retail traders',
          estimatedUsers: { conservative: 20, realistic: 60, optimistic: 150 },
          avgMonthlyProfit: 2000 // USD per user
        }
      ]
    };
    
    // Calculate revenue projections for each service
    mevModel.services.forEach(service => {
      service.revenueProjections = this.calculateMEVServiceProjections(service);
    });
    
    // Calculate combined MEV revenue
    mevModel.combinedProjections = this.calculateCombinedMEVProjections(mevModel.services);
    
    this.results.revenueModels.mevServices = mevModel;
    this.spinner.succeed('MEV services model analysis complete');
  }

  calculateMEVServiceProjections(service) {
    const scenarios = ['conservative', 'realistic', 'optimistic'];
    const projections = {};
    
    scenarios.forEach(scenario => {
      const users = service.estimatedUsers[scenario];
      let monthlyRevenue = users * service.monthlyFee;
      
      // Add variable revenue components
      if (service.revenueShare && service.avgMonthlyVolume) {
        const volumeRevenue = users * service.avgMonthlyVolume * service.estimatedProfitMargin * service.revenueShare;
        monthlyRevenue += volumeRevenue;
      }
      
      if (service.perTransactionFee && service.avgMonthlyTransactions) {
        const solPrice = 100; // Assume $100 SOL
        const transactionRevenue = users * service.avgMonthlyTransactions * service.perTransactionFee * solPrice;
        monthlyRevenue += transactionRevenue;
      }
      
      if (service.alertFee && service.avgMonthlyAlerts) {
        const alertRevenue = users * service.avgMonthlyAlerts * service.alertFee;
        monthlyRevenue += alertRevenue;
      }
      
      if (service.successFee && service.avgMonthlyProfit) {
        const successRevenue = users * service.avgMonthlyProfit * service.successFee;
        monthlyRevenue += successRevenue;
      }
      
      projections[scenario] = {
        users,
        monthlyRevenue,
        annualRevenue: monthlyRevenue * 12,
        profitMargin: 0.85 // High margin for software services
      };
    });
    
    return projections;
  }

  calculateCombinedMEVProjections(services) {
    const scenarios = ['conservative', 'realistic', 'optimistic'];
    const projections = {};
    
    scenarios.forEach(scenario => {
      projections[scenario] = {
        totalUsers: 0,
        monthlyRevenue: 0,
        annualRevenue: 0
      };
      
      services.forEach(service => {
        const serviceProjection = service.revenueProjections[scenario];
        projections[scenario].totalUsers += serviceProjection.users;
        projections[scenario].monthlyRevenue += serviceProjection.monthlyRevenue;
        projections[scenario].annualRevenue += serviceProjection.annualRevenue;
      });
    });
    
    return projections;
  }

  async analyzeDataServicesModel() {
    this.spinner.start('Analyzing data services revenue model');
    
    const dataModel = {
      name: 'Data & Analytics Services',
      description: 'Blockchain data, analytics, and insights services',
      services: [
        {
          name: 'Market Data API',
          monthlyFee: 299,
          apiCallsIncluded: 1000000,
          overageFee: 0.0005, // USD per API call
          targetMarket: 'Trading firms, analytics platforms',
          estimatedUsers: { conservative: 15, realistic: 40, optimistic: 100 }
        },
        {
          name: 'Custom Analytics',
          monthlyFee: 499,
          customReports: true,
          targetMarket: 'Protocols, institutional investors',
          estimatedUsers: { conservative: 8, realistic: 20, optimistic: 50 }
        },
        {
          name: 'Risk Metrics API',
          monthlyFee: 199,
          realTimeAlerts: true,
          targetMarket: 'Risk managers, DeFi protocols',
          estimatedUsers: { conservative: 12, realistic: 30, optimistic: 75 }
        },
        {
          name: 'Historical Data Archive',
          monthlyFee: 99,
          storageLimit: '1TB',
          targetMarket: 'Researchers, compliance teams',
          estimatedUsers: { conservative: 25, realistic: 60, optimistic: 150 }
        }
      ]
    };
    
    // Calculate revenue projections
    dataModel.services.forEach(service => {
      service.revenueProjections = this.calculateDataServiceProjections(service);
    });
    
    dataModel.combinedProjections = this.calculateCombinedDataProjections(dataModel.services);
    
    this.results.revenueModels.dataServices = dataModel;
    this.spinner.succeed('Data services model analysis complete');
  }

  calculateDataServiceProjections(service) {
    const scenarios = ['conservative', 'realistic', 'optimistic'];
    const projections = {};
    
    scenarios.forEach(scenario => {
      const users = service.estimatedUsers[scenario];
      let monthlyRevenue = users * service.monthlyFee;
      
      // Add overage fees for API services
      if (service.overageFee && service.apiCallsIncluded) {
        const avgOverage = service.apiCallsIncluded * 0.2; // Assume 20% overage
        const overageRevenue = users * avgOverage * service.overageFee;
        monthlyRevenue += overageRevenue;
      }
      
      projections[scenario] = {
        users,
        monthlyRevenue,
        annualRevenue: monthlyRevenue * 12,
        profitMargin: 0.80
      };
    });
    
    return projections;
  }

  calculateCombinedDataProjections(services) {
    const scenarios = ['conservative', 'realistic', 'optimistic'];
    const projections = {};
    
    scenarios.forEach(scenario => {
      projections[scenario] = {
        totalUsers: 0,
        monthlyRevenue: 0,
        annualRevenue: 0
      };
      
      services.forEach(service => {
        const serviceProjection = service.revenueProjections[scenario];
        projections[scenario].totalUsers += serviceProjection.users;
        projections[scenario].monthlyRevenue += serviceProjection.monthlyRevenue;
        projections[scenario].annualRevenue += serviceProjection.annualRevenue;
      });
    });
    
    return projections;
  }

  async analyzePremiumFeaturesModel() {
    this.spinner.start('Analyzing premium features revenue model');
    
    const premiumModel = {
      name: 'Premium Features & Add-ons',
      description: 'Advanced features and premium services',
      features: [
        {
          name: 'Dedicated Node Access',
          monthlyFee: 199,
          description: 'Exclusive access to dedicated validator nodes',
          targetCustomers: 'High-frequency traders, large protocols'
        },
        {
          name: 'Geographic Routing',
          monthlyFee: 99,
          description: 'Optimized routing based on geographic location',
          targetCustomers: 'Global applications, latency-sensitive users'
        },
        {
          name: 'Priority Support',
          monthlyFee: 149,
          description: '24/7 premium support with guaranteed response times',
          targetCustomers: 'Enterprise clients, mission-critical applications'
        },
        {
          name: 'Custom Endpoints',
          setupFee: 999,
          monthlyFee: 299,
          description: 'Custom RPC endpoints with specialized configurations',
          targetCustomers: 'Protocols with specific requirements'
        },
        {
          name: 'White-label Solution',
          setupFee: 4999,
          monthlyFee: 999,
          description: 'Complete white-label RPC solution',
          targetCustomers: 'Infrastructure providers, exchanges'
        }
      ]
    };
    
    // Estimate adoption rates and revenue
    premiumModel.features.forEach(feature => {
      feature.projections = this.calculatePremiumFeatureProjections(feature);
    });
    
    premiumModel.combinedProjections = this.calculateCombinedPremiumProjections(premiumModel.features);
    
    this.results.revenueModels.premiumFeatures = premiumModel;
    this.spinner.succeed('Premium features model analysis complete');
  }

  calculatePremiumFeatureProjections(feature) {
    // Estimate adoption based on feature type and pricing
    const baseAdoption = {
      conservative: 0.05, // 5% of customer base
      realistic: 0.12,    // 12% of customer base  
      optimistic: 0.25    // 25% of customer base
    };
    
    // Adjust for price sensitivity
    const priceAdjustment = feature.monthlyFee > 200 ? 0.5 : 1.0;
    
    const scenarios = ['conservative', 'realistic', 'optimistic'];
    const projections = {};
    
    scenarios.forEach(scenario => {
      const adoptionRate = baseAdoption[scenario] * priceAdjustment;
      const estimatedCustomerBase = { conservative: 100, realistic: 300, optimistic: 800 }[scenario];
      const users = Math.floor(estimatedCustomerBase * adoptionRate);
      
      let monthlyRevenue = users * feature.monthlyFee;
      let setupRevenue = 0;
      
      if (feature.setupFee) {
        // Assume setup fees are collected quarterly
        setupRevenue = (users * feature.setupFee) / 12; // Annualized
      }
      
      projections[scenario] = {
        users,
        monthlyRecurring: monthlyRevenue,
        setupRevenue,
        totalMonthlyRevenue: monthlyRevenue + setupRevenue,
        annualRevenue: (monthlyRevenue * 12) + (users * (feature.setupFee || 0))
      };
    });
    
    return projections;
  }

  calculateCombinedPremiumProjections(features) {
    const scenarios = ['conservative', 'realistic', 'optimistic'];
    const projections = {};
    
    scenarios.forEach(scenario => {
      projections[scenario] = {
        totalUsers: 0,
        monthlyRevenue: 0,
        annualRevenue: 0,
        setupRevenue: 0
      };
      
      features.forEach(feature => {
        const featureProjection = feature.projections[scenario];
        projections[scenario].totalUsers += featureProjection.users;
        projections[scenario].monthlyRevenue += featureProjection.totalMonthlyRevenue;
        projections[scenario].annualRevenue += featureProjection.annualRevenue;
        projections[scenario].setupRevenue += featureProjection.setupRevenue;
      });
    });
    
    return projections;
  }

  async analyzePartnershipModel() {
    this.spinner.start('Analyzing partnership revenue opportunities');
    
    const partnershipModel = {
      name: 'Strategic Partnerships',
      description: 'Revenue sharing and partnership opportunities',
      partnerships: [
        {
          name: 'DeFi Protocol Integration',
          type: 'Revenue Share',
          revenueShare: 0.15, // 15% of protocol fees
          estimatedProtocols: { conservative: 2, realistic: 5, optimistic: 12 },
          avgMonthlyFees: 50000 // USD per protocol
        },
        {
          name: 'Trading Bot Partnerships',
          type: 'Subscription + Revenue Share',
          monthlyFee: 499,
          revenueShare: 0.05, // 5% of trading profits
          estimatedBots: { conservative: 10, realistic: 25, optimistic: 60 },
          avgMonthlyProfit: 25000 // USD per bot
        },
        {
          name: 'Infrastructure Reseller',
          type: 'Margin Sharing',
          marginShare: 0.30, // 30% margin share
          estimatedResellers: { conservative: 3, realistic: 8, optimistic: 20 },
          avgMonthlyRevenue: 10000 // USD per reseller
        },
        {
          name: 'Enterprise Consulting',
          type: 'Fixed Fee + Ongoing',
          projectFee: 25000,
          monthlyRetainer: 5000,
          estimatedProjects: { conservative: 1, realistic: 3, optimistic: 8 },
          avgProjectDuration: 6 // months
        }
      ]
    };
    
    // Calculate partnership revenue projections
    partnershipModel.partnerships.forEach(partnership => {
      partnership.projections = this.calculatePartnershipProjections(partnership);
    });
    
    partnershipModel.combinedProjections = this.calculateCombinedPartnershipProjections(partnershipModel.partnerships);
    
    this.results.revenueModels.partnerships = partnershipModel;
    this.spinner.succeed('Partnership model analysis complete');
  }

  calculatePartnershipProjections(partnership) {
    const scenarios = ['conservative', 'realistic', 'optimistic'];
    const projections = {};
    
    scenarios.forEach(scenario => {
      let monthlyRevenue = 0;
      let partners = 0;
      
      switch (partnership.type) {
        case 'Revenue Share':
          partners = partnership.estimatedProtocols[scenario];
          monthlyRevenue = partners * partnership.avgMonthlyFees * partnership.revenueShare;
          break;
          
        case 'Subscription + Revenue Share':
          partners = partnership.estimatedBots[scenario];
          const subscriptionRevenue = partners * partnership.monthlyFee;
          const shareRevenue = partners * partnership.avgMonthlyProfit * partnership.revenueShare;
          monthlyRevenue = subscriptionRevenue + shareRevenue;
          break;
          
        case 'Margin Sharing':
          partners = partnership.estimatedResellers[scenario];
          monthlyRevenue = partners * partnership.avgMonthlyRevenue * partnership.marginShare;
          break;
          
        case 'Fixed Fee + Ongoing':
          partners = partnership.estimatedProjects[scenario];
          const projectRevenue = (partners * partnership.projectFee) / 12; // Annualized
          const retainerRevenue = partners * partnership.monthlyRetainer;
          monthlyRevenue = projectRevenue + retainerRevenue;
          break;
      }
      
      projections[scenario] = {
        partners,
        monthlyRevenue,
        annualRevenue: monthlyRevenue * 12,
        profitMargin: 0.70 // Partnership margins typically lower due to sharing
      };
    });
    
    return projections;
  }

  calculateCombinedPartnershipProjections(partnerships) {
    const scenarios = ['conservative', 'realistic', 'optimistic'];
    const projections = {};
    
    scenarios.forEach(scenario => {
      projections[scenario] = {
        totalPartners: 0,
        monthlyRevenue: 0,
        annualRevenue: 0
      };
      
      partnerships.forEach(partnership => {
        const partnershipProjection = partnership.projections[scenario];
        projections[scenario].totalPartners += partnershipProjection.partners;
        projections[scenario].monthlyRevenue += partnershipProjection.monthlyRevenue;
        projections[scenario].annualRevenue += partnershipProjection.annualRevenue;
      });
    });
    
    return projections;
  }

  calculateBreakEvenScenarios() {
    this.spinner.start('Calculating break-even scenarios');
    
    const monthlyCosts = assessmentConfig.costs.monthly; // €429
    const exchangeRate = 1.1; // EUR to USD approximation
    const monthlyCSostsUSD = monthlyCosts * exchangeRate;
    
    const breakEvenAnalysis = {
      monthlyCosts: {
        hosting: monthlyCSostsUSD,
        support: 2000, // Estimated support costs
        marketing: 1500, // Marketing budget
        development: 3000, // Development costs
        total: monthlyCSostsUSD + 2000 + 1500 + 3000
      },
      scenarios: {}
    };
    
    // Calculate break-even for each revenue model
    Object.entries(this.results.revenueModels).forEach(([modelName, model]) => {
      const scenarios = ['conservative', 'realistic', 'optimistic'];
      breakEvenAnalysis.scenarios[modelName] = {};
      
      scenarios.forEach(scenario => {
        let monthlyRevenue = 0;
        
        if (model.revenueProjections && model.revenueProjections[scenario]) {
          monthlyRevenue = model.revenueProjections[scenario].revenue || model.revenueProjections[scenario].monthlyRevenue;
        } else if (model.combinedProjections && model.combinedProjections[scenario]) {
          monthlyRevenue = model.combinedProjections[scenario].monthlyRevenue;
        }
        
        const monthsToBreakEven = monthlyRevenue > 0 ? 
          Math.ceil(breakEvenAnalysis.monthlyCosts.total / monthlyRevenue) : 999;
        
        breakEvenAnalysis.scenarios[modelName][scenario] = {
          monthlyRevenue,
          monthsToBreakEven,
          breakEvenAchieved: monthlyRevenue >= breakEvenAnalysis.monthlyCosts.total,
          profitMargin: monthlyRevenue > 0 ? 
            ((monthlyRevenue - breakEvenAnalysis.monthlyCosts.total) / monthlyRevenue) * 100 : 0
        };
      });
    });
    
    // Calculate combined break-even scenario
    const scenarios = ['conservative', 'realistic', 'optimistic'];
    breakEvenAnalysis.combined = {};
    
    scenarios.forEach(scenario => {
      let totalMonthlyRevenue = 0;
      
      Object.values(this.results.revenueModels).forEach(model => {
        if (model.revenueProjections && model.revenueProjections[scenario]) {
          totalMonthlyRevenue += model.revenueProjections[scenario].revenue || model.revenueProjections[scenario].monthlyRevenue || 0;
        } else if (model.combinedProjections && model.combinedProjections[scenario]) {
          totalMonthlyRevenue += model.combinedProjections[scenario].monthlyRevenue || 0;
        }
      });
      
      breakEvenAnalysis.combined[scenario] = {
        totalMonthlyRevenue,
        monthsToBreakEven: totalMonthlyRevenue > 0 ? 
          Math.ceil(breakEvenAnalysis.monthlyCosts.total / totalMonthlyRevenue) : 999,
        breakEvenAchieved: totalMonthlyRevenue >= breakEvenAnalysis.monthlyCosts.total,
        profitMargin: totalMonthlyRevenue > 0 ? 
          ((totalMonthlyRevenue - breakEvenAnalysis.monthlyCosts.total) / totalMonthlyRevenue) * 100 : 0,
        monthlyProfit: totalMonthlyRevenue - breakEvenAnalysis.monthlyCosts.total
      };
    });
    
    this.results.breakEvenAnalysis = breakEvenAnalysis;
    this.spinner.succeed('Break-even analysis complete');
  }

  generateGrowthProjections() {
    this.spinner.start('Generating growth projections');
    
    const projections = {
      year1: { quarter1: {}, quarter2: {}, quarter3: {}, quarter4: {} },
      year2: { quarter1: {}, quarter2: {}, quarter3: {}, quarter4: {} },
      year3: { quarter1: {}, quarter2: {}, quarter3: {}, quarter4: {} }
    };
    
    // Growth assumptions
    const growthRates = {
      rpcAsService: { q1: 0.2, q2: 0.35, q3: 0.5, q4: 0.65 },
      mevServices: { q1: 0.1, q2: 0.25, q3: 0.45, q4: 0.7 },
      dataServices: { q1: 0.15, q2: 0.3, q3: 0.5, q4: 0.75 },
      premiumFeatures: { q1: 0.05, q2: 0.15, q3: 0.3, q4: 0.5 },
      partnerships: { q1: 0.1, q2: 0.2, q3: 0.4, q4: 0.6 }
    };
    
    Object.keys(projections).forEach(year => {
      const yearMultiplier = { year1: 1, year2: 1.8, year3: 3.2 }[year];
      
      Object.keys(projections[year]).forEach(quarter => {
        let totalRevenue = 0;
        let totalCustomers = 0;
        
        Object.entries(this.results.revenueModels).forEach(([modelName, model]) => {
          const growthRate = growthRates[modelName] ? growthRates[modelName][quarter.slice(-2)] : 0.3;
          let baseRevenue = 0;
          let baseCustomers = 0;
          
          if (model.revenueProjections && model.revenueProjections.realistic) {
            baseRevenue = model.revenueProjections.realistic.revenue || model.revenueProjections.realistic.monthlyRevenue || 0;
            baseCustomers = model.revenueProjections.realistic.customers || 0;
          } else if (model.combinedProjections && model.combinedProjections.realistic) {
            baseRevenue = model.combinedProjections.realistic.monthlyRevenue || 0;
            baseCustomers = model.combinedProjections.realistic.totalUsers || 0;
          }
          
          const projectedRevenue = baseRevenue * growthRate * yearMultiplier;
          const projectedCustomers = baseCustomers * growthRate * yearMultiplier;
          
          totalRevenue += projectedRevenue;
          totalCustomers += projectedCustomers;
        });
        
        projections[year][quarter] = {
          totalRevenue: Math.round(totalRevenue),
          totalCustomers: Math.round(totalCustomers),
          cumulativeRevenue: Math.round(totalRevenue * 3), // Quarterly to estimate cumulative
          marketShare: Math.min(0.15, (totalCustomers / 10000)) // Estimate market share
        };
      });
    });
    
    this.results.projections = projections;
    this.spinner.succeed('Growth projections complete');
  }

  analyzeMarketOpportunity() {
    this.spinner.start('Analyzing market opportunity');
    
    const marketAnalysis = {
      totalAddressableMarket: {
        rpcServices: 2.5e9, // $2.5B global RPC services market
        mevServices: 500e6, // $500M MEV services market
        blockchainData: 1.2e9, // $1.2B blockchain data market
        defiInfrastructure: 800e6 // $800M DeFi infrastructure market
      },
      serviceableMarket: {
        solanaEcosystem: 180e6, // $180M Solana-specific market
        ukEuropeRegion: 45e6, // $45M UK/Europe region
        targetSegment: 12e6 // $12M our target segment
      },
      competitiveLandscape: {
        majorPlayers: ['Alchemy', 'QuickNode', 'Infura', 'Moralis'],
        marketConcentration: 'Moderate', // Top 4 players have ~60% market share
        differentiationOpportunity: 'High', // Technical advantage with hardware specs
        barrierToEntry: 'Medium' // Requires technical expertise and infrastructure
      },
      opportunityScore: this.calculateOpportunityScore()
    };
    
    this.results.marketAnalysis = marketAnalysis;
    this.spinner.succeed('Market opportunity analysis complete');
  }

  calculateOpportunityScore() {
    // Score based on multiple factors (0-100)
    const factors = {
      marketSize: 85, // Large and growing market
      competition: 70, // Moderate competition with differentiation opportunities
      technicalAdvantage: 90, // Strong hardware advantage
      location: 75, // UK location provides regional advantage
      teamExperience: 80, // Assume good technical team
      funding: 60 // Bootstrap-friendly with current hosting costs
    };
    
    const weights = {
      marketSize: 0.2,
      competition: 0.15,
      technicalAdvantage: 0.25,
      location: 0.1,
      teamExperience: 0.2,
      funding: 0.1
    };
    
    let weightedScore = 0;
    Object.entries(factors).forEach(([factor, score]) => {
      weightedScore += score * weights[factor];
    });
    
    return Math.round(weightedScore);
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Analyze break-even scenarios for recommendations
    const breakEven = this.results.breakEvenAnalysis.combined;
    
    if (breakEven.realistic.breakEvenAchieved) {
      recommendations.push({
        priority: 'high',
        category: 'Business Model',
        title: 'Multi-Revenue Stream Approach',
        description: 'Realistic scenario shows break-even is achievable with combined revenue streams',
        action: 'Focus on RPC-as-a-Service as primary revenue driver, with MEV services as secondary',
        expectedImpact: `$${breakEven.realistic.monthlyProfit.toFixed(0)} monthly profit`
      });
    }
    
    // RPC service recommendations
    const rpcProjections = this.results.revenueModels.rpcAsService.revenueProjections;
    if (rpcProjections.realistic.revenue > assessmentConfig.costs.breakEvenTarget) {
      recommendations.push({
        priority: 'high',
        category: 'RPC Services',
        title: 'Launch RPC-as-a-Service',
        description: 'RPC services alone can exceed break-even target',
        action: 'Start with Starter and Pro tiers, add Enterprise tier after proving market fit',
        expectedImpact: `$${rpcProjections.realistic.revenue} monthly revenue`
      });
    }
    
    // MEV services recommendations
    const mevProjections = this.results.revenueModels.mevServices.combinedProjections;
    if (mevProjections.realistic.monthlyRevenue > 5000) {
      recommendations.push({
        priority: 'medium',
        category: 'MEV Services',
        title: 'Develop MEV Services Suite',
        description: 'MEV services show strong profit potential',
        action: 'Start with arbitrage bot API and sandwich protection, expand based on demand',
        expectedImpact: `$${mevProjections.realistic.monthlyRevenue.toFixed(0)} monthly revenue`
      });
    }
    
    // Technical recommendations
    const capacity = this.results.revenueModels.rpcAsService.monthlyCapacity;
    recommendations.push({
      priority: 'high',
      category: 'Technical',
      title: 'Optimize for High Throughput',
      description: `Your hardware can handle ${capacity.maxRPS.toLocaleString()} RPS`,
      action: 'Implement connection pooling, caching, and load balancing to maximize capacity utilization',
      expectedImpact: '70% capacity utilization target achievable'
    });
    
    // Market positioning recommendations
    if (this.results.marketAnalysis.opportunityScore > 75) {
      recommendations.push({
        priority: 'high',
        category: 'Market Position',
        title: 'Leverage Geographic Advantage',
        description: 'UK location provides latency advantage for European market',
        action: 'Market sub-10ms latency to European users as key differentiator',
        expectedImpact: 'Potential to capture 15-20% of European Solana RPC market'
      });
    }
    
    // Pricing recommendations
    recommendations.push({
      priority: 'medium',
      category: 'Pricing',
      title: 'Implement Value-Based Pricing',
      description: 'Your cost structure allows for competitive pricing with healthy margins',
      action: 'Price 10-15% below major competitors while maintaining 75%+ margins',
      expectedImpact: 'Attractive to price-sensitive customers while ensuring profitability'
    });
    
    this.results.recommendations = recommendations;
  }

  async generateReport() {
    console.log(chalk.blue.bold('\n💰 Revenue Model Analysis & Break-Even Report\n'));
    
    // Cost structure
    console.log(chalk.yellow.bold('💸 Cost Structure\n'));
    const costTable = new Table({
      head: ['Cost Category', 'Monthly Amount (USD)'],
      colWidths: [25, 20]
    });
    
    Object.entries(this.results.breakEvenAnalysis.monthlyCosts).forEach(([category, amount]) => {
      costTable.push([
        category.charAt(0).toUpperCase() + category.slice(1),
        `$${amount.toLocaleString()}`
      ]);
    });
    
    console.log(costTable.toString());
    
    // Revenue model comparison
    console.log(chalk.yellow.bold('\n📊 Revenue Model Comparison (Realistic Scenario)\n'));
    
    const revenueTable = new Table({
      head: ['Revenue Model', 'Monthly Revenue', 'Break-Even', 'Time to Profit'],
      colWidths: [20, 18, 12, 15]
    });
    
    Object.entries(this.results.breakEvenAnalysis.scenarios).forEach(([model, scenarios]) => {
      const realistic = scenarios.realistic;
      revenueTable.push([
        model.replace(/([A-Z])/g, ' $1').trim(),
        `$${realistic.monthlyRevenue.toLocaleString()}`,
        realistic.breakEvenAchieved ? chalk.green('✓') : chalk.red('✗'),
        realistic.monthsToBreakEven < 12 ? 
          `${realistic.monthsToBreakEven} months` : '12+ months'
      ]);
    });
    
    console.log(revenueTable.toString());
    
    // Combined scenario analysis
    console.log(chalk.yellow.bold('\n🎯 Combined Revenue Scenarios\n'));
    
    const scenarioTable = new Table({
      head: ['Scenario', 'Monthly Revenue', 'Monthly Profit', 'Break-Even', 'Profit Margin'],
      colWidths: [15, 16, 16, 12, 14]
    });
    
    Object.entries(this.results.breakEvenAnalysis.combined).forEach(([scenario, data]) => {
      const profitColor = data.monthlyProfit > 0 ? chalk.green : chalk.red;
      scenarioTable.push([
        scenario.charAt(0).toUpperCase() + scenario.slice(1),
        `$${data.totalMonthlyRevenue.toLocaleString()}`,
        profitColor(`$${data.monthlyProfit.toLocaleString()}`),
        data.breakEvenAchieved ? chalk.green('✓') : chalk.red('✗'),
        `${data.profitMargin.toFixed(1)}%`
      ]);
    });
    
    console.log(scenarioTable.toString());
    
    // Growth projections
    console.log(chalk.yellow.bold('\n📈 Growth Projections (3-Year Outlook)\n'));
    
    const growthTable = new Table({
      head: ['Period', 'Revenue', 'Customers', 'Market Share'],
      colWidths: [15, 15, 12, 15]
    });
    
    Object.entries(this.results.projections).forEach(([year, quarters]) => {
      Object.entries(quarters).forEach(([quarter, data]) => {
        growthTable.push([
          `${year.toUpperCase()} ${quarter.toUpperCase()}`,
          `$${data.totalRevenue.toLocaleString()}`,
          data.totalCustomers.toLocaleString(),
          `${(data.marketShare * 100).toFixed(2)}%`
        ]);
      });
    });
    
    console.log(growthTable.toString());
    
    // Top recommendations
    if (this.results.recommendations.length > 0) {
      console.log(chalk.yellow.bold('\n💡 Key Recommendations\n'));
      
      this.results.recommendations.forEach((rec, index) => {
        const priority = rec.priority === 'high' ? chalk.red('HIGH') : 
                        rec.priority === 'medium' ? chalk.yellow('MEDIUM') : chalk.green('LOW');
        
        console.log(`${index + 1}. [${priority}] ${chalk.bold(rec.title)}`);
        console.log(`   ${rec.description}`);
        console.log(`   ${chalk.cyan('Action:')} ${rec.action}`);
        console.log(`   ${chalk.green('Impact:')} ${rec.expectedImpact}\n`);
      });
    }
    
    // Key metrics summary
    console.log(chalk.green.bold('\n🎉 Key Takeaways\n'));
    
    const combined = this.results.breakEvenAnalysis.combined;
    const breakEvenMonths = combined.realistic.monthsToBreakEven;
    const monthlyProfit = combined.realistic.monthlyProfit;
    
    if (combined.realistic.breakEvenAchieved) {
      console.log(chalk.green(`✅ Break-even achievable in realistic scenario`));
      console.log(chalk.green(`✅ Projected monthly profit: $${monthlyProfit.toLocaleString()}`));
      console.log(chalk.green(`✅ ROI: ${((monthlyProfit * 12) / (this.results.breakEvenAnalysis.monthlyCosts.total * 12) * 100).toFixed(1)}% annually`));
    } else {
      console.log(chalk.yellow(`⚠️  Break-even requires ${breakEvenMonths} months in realistic scenario`));
    }
    
    const opportunityScore = this.results.marketAnalysis.opportunityScore;
    console.log(chalk.blue(`📊 Market Opportunity Score: ${opportunityScore}/100 ${opportunityScore > 75 ? '(Excellent)' : opportunityScore > 60 ? '(Good)' : '(Fair)'}`));
    
    // Save detailed results
    const { writeFileSync } = await import('fs');
    writeFileSync('reports/revenue-analysis-results.json', JSON.stringify(this.results, null, 2));
    console.log(chalk.green('\n✅ Detailed results saved to reports/revenue-analysis-results.json\n'));
  }

  log(message) {
    const timestamp = new Date().toISOString();
    this.logStream.write(`[${timestamp}] ${message}\n`);
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const calculator = new RevenueCalculator();
  
  calculator.runRevenueAnalysis()
    .then(() => {
      console.log(chalk.green.bold('🎉 Revenue Analysis Complete!'));
      process.exit(0);
    })
    .catch(error => {
      console.error(chalk.red.bold('❌ Revenue Analysis Failed:'), error);
      process.exit(1);
    });
}

export default RevenueCalculator;