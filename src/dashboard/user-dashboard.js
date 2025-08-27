import express from 'express';
import cors from 'cors';
import chalk from 'chalk';
import DatabaseManager from '../auth/database-manager.js';
import { validateApiKey } from '../auth/middleware.js';

const app = express();
const db = new DatabaseManager({ type: 'postgresql' });

await db.init();

// Enable CORS for the Vercel frontend
app.use(cors({
  origin: [
    'https://n0de-website-umber.vercel.app',
    'https://n0de-website.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// User authentication and profile endpoint
app.get('/api/user/profile', async (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  try {
    const user = await db.getUserByApiKey(apiKey);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return user profile without sensitive data
    const profile = {
      id: user.uuid,
      name: user.name,
      email: user.email,
      plan: {
        type: user.plan_type,
        rateLimit: user.rate_limit,
        monthlyRequests: user.monthly_requests === -1 ? 'unlimited' : user.monthly_requests,
        monthlyCost: user.monthly_cost,
        features: await getPlanFeatures(user.plan_type)
      },
      usage: {
        requestsUsed: user.requests_used,
        requestsRemaining: user.monthly_requests === -1 ? 'unlimited' : Math.max(0, user.monthly_requests - user.requests_used),
        usagePercentage: user.monthly_requests === -1 ? 0 : Math.round((user.requests_used / user.monthly_requests) * 100),
        resetDate: getNextResetDate()
      },
      account: {
        status: user.status,
        createdAt: user.created_at,
        lastUsed: user.last_used
      },
      apiKeys: [
        {
          id: 'primary',
          key: apiKey,
          name: 'Primary API Key',
          lastUsed: user.last_used,
          status: 'active'
        }
      ]
    };

    res.json(profile);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User usage analytics endpoint
app.get('/api/user/analytics', async (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  try {
    const user = await db.getUserByApiKey(apiKey);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get usage logs for the past 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let usageLogs;
    if (db.config.type === 'postgresql') {
      const client = await db.db.connect();
      try {
        const result = await client.query(`
          SELECT 
            DATE(timestamp) as date,
            method,
            COUNT(*) as requests,
            SUM(requests) as total_requests
          FROM usage_logs 
          WHERE user_uuid = $1 
            AND timestamp >= $2
          GROUP BY DATE(timestamp), method
          ORDER BY date DESC, total_requests DESC
        `, [user.uuid, thirtyDaysAgo]);
        usageLogs = result.rows;
      } finally {
        client.release();
      }
    } else {
      usageLogs = await db.db.all(`
        SELECT 
          DATE(timestamp) as date,
          method,
          COUNT(*) as requests,
          SUM(requests) as total_requests
        FROM usage_logs 
        WHERE user_uuid = ? 
          AND timestamp >= ?
        GROUP BY DATE(timestamp), method
        ORDER BY date DESC, total_requests DESC
      `, [user.uuid, thirtyDaysAgo.toISOString()]);
    }

    // Process analytics data
    const analytics = {
      overview: {
        totalRequests: user.requests_used,
        averageDaily: Math.round(user.requests_used / 30),
        topMethods: getTopMethods(usageLogs),
        usageTrend: calculateUsageTrend(usageLogs)
      },
      dailyUsage: getDailyUsageChart(usageLogs),
      methodBreakdown: getMethodBreakdown(usageLogs),
      performance: {
        averageResponseTime: '< 100ms',
        successRate: '99.9%',
        uptime: '99.99%'
      }
    };

    res.json(analytics);
  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Plan upgrade endpoint
app.post('/api/user/upgrade', async (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  const { newPlan } = req.body;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  try {
    const user = await db.getUserByApiKey(apiKey);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate new plan
    const validPlans = ['free', 'starter', 'pro', 'enterprise'];
    if (!validPlans.includes(newPlan)) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    // Get plan pricing
    const planPricing = {
      free: { cost: 0, requests: 100000, rate: 10 },
      starter: { cost: 29, requests: 1000000, rate: 50 },
      pro: { cost: 99, requests: 10000000, rate: 200 },
      enterprise: { cost: 299, requests: 100000000, rate: 1000 }
    };

    const newPlanDetails = planPricing[newPlan];

    // For now, just return payment information - actual payment processing would happen via webhooks
    const paymentInfo = {
      plan: newPlan,
      cost: newPlanDetails.cost,
      features: await getPlanFeatures(newPlan),
      paymentMethods: [
        {
          type: 'crypto',
          provider: 'coinbase_commerce',
          currencies: ['BTC', 'ETH', 'USDC', 'SOL']
        },
        {
          type: 'crypto',
          provider: 'nowpayments',
          currencies: ['BTC', 'ETH', 'USDC', 'SOL', 'USDT']
        }
      ]
    };

    res.json({
      message: 'Plan upgrade initiated',
      currentPlan: user.plan_type,
      newPlan: newPlan,
      payment: paymentInfo
    });

  } catch (error) {
    console.error('Plan upgrade error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API key management endpoints
app.post('/api/user/api-keys', async (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  const { name } = req.body;
  
  // For now, return existing key info - in production you'd generate new keys
  res.json({
    message: 'API key management not implemented yet',
    suggestion: 'Contact support for additional API keys'
  });
});

// Helper functions
async function getPlanFeatures(planType) {
  const features = {
    free: [
      'Basic RPC Access',
      'Community Support',
      '10 req/sec rate limit',
      'Standard reliability'
    ],
    starter: [
      'Priority RPC Access',
      'Email Support',
      '50 req/sec rate limit',
      'Enhanced reliability',
      'Basic analytics'
    ],
    pro: [
      'High Performance RPC',
      'Priority Support',
      '200 req/sec rate limit',
      'Advanced analytics',
      'Custom webhooks',
      '99.9% SLA'
    ],
    enterprise: [
      'Dedicated Resources',
      '24/7 Support',
      '1000 req/sec rate limit',
      'Full analytics suite',
      'Custom integrations',
      '99.99% SLA',
      'Dedicated account manager'
    ]
  };
  
  return features[planType] || [];
}

function getNextResetDate() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}

function getTopMethods(usageLogs) {
  const methodCounts = {};
  usageLogs.forEach(log => {
    methodCounts[log.method] = (methodCounts[log.method] || 0) + parseInt(log.total_requests);
  });
  
  return Object.entries(methodCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([method, count]) => ({ method, count }));
}

function calculateUsageTrend(usageLogs) {
  // Simple trend calculation - would be more sophisticated in production
  const dailyTotals = {};
  usageLogs.forEach(log => {
    dailyTotals[log.date] = (dailyTotals[log.date] || 0) + parseInt(log.total_requests);
  });
  
  const dates = Object.keys(dailyTotals).sort();
  if (dates.length < 2) return 'stable';
  
  const recent = dailyTotals[dates[dates.length - 1]] || 0;
  const previous = dailyTotals[dates[dates.length - 2]] || 0;
  
  if (recent > previous * 1.1) return 'increasing';
  if (recent < previous * 0.9) return 'decreasing';
  return 'stable';
}

function getDailyUsageChart(usageLogs) {
  const dailyTotals = {};
  usageLogs.forEach(log => {
    dailyTotals[log.date] = (dailyTotals[log.date] || 0) + parseInt(log.total_requests);
  });
  
  return Object.entries(dailyTotals)
    .sort(([a], [b]) => new Date(a) - new Date(b))
    .map(([date, requests]) => ({ date, requests }));
}

function getMethodBreakdown(usageLogs) {
  const methodTotals = {};
  usageLogs.forEach(log => {
    methodTotals[log.method] = (methodTotals[log.method] || 0) + parseInt(log.total_requests);
  });
  
  return Object.entries(methodTotals)
    .map(([method, count]) => ({ method, count, percentage: 0 }))
    .sort((a, b) => b.count - a.count);
}

// Start user dashboard API server
const PORT = process.env.USER_DASHBOARD_PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(chalk.green(`🔐 User Dashboard API available at: http://0.0.0.0:${PORT}`));
  console.log(chalk.yellow('CORS enabled for Vercel frontend integration'));
});

export default app;