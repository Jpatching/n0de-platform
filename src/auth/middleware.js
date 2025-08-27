import express from 'express';
import DatabaseManager from './database-manager.js';

const app = express();
const db = new DatabaseManager();

// Initialize database
await db.init();

// Middleware to validate API keys and track usage
export async function validateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key || extractApiKeyFromPath(req.path);
  
  if (!apiKey) {
    return res.status(401).json({
      jsonrpc: '2.0',
      error: { code: -32401, message: 'API key required' },
      id: req.body?.id || null
    });
  }

  try {
    // Check rate limits
    const rateCheck = await db.checkRateLimit(apiKey);
    
    if (!rateCheck.allowed) {
      return res.status(429).json({
        jsonrpc: '2.0',
        error: { 
          code: -32429, 
          message: rateCheck.reason === 'Monthly quota exceeded' 
            ? 'Monthly request quota exceeded. Please upgrade your plan.'
            : 'Invalid API key'
        },
        id: req.body?.id || null
      });
    }

    // Track usage
    const method = req.body?.method || 'unknown';
    await db.updateUsage(apiKey, 1, req.ip, method);

    // Add user info to request
    req.user = rateCheck.user;
    req.rateLimit = rateCheck.rateLimit;
    
    next();
  } catch (error) {
    console.error('API validation error:', error);
    return res.status(500).json({
      jsonrpc: '2.0',
      error: { code: -32500, message: 'Internal server error' },
      id: req.body?.id || null
    });
  }
}

function extractApiKeyFromPath(path) {
  // Extract API key from paths like /rpc/n0de_abc123...
  const match = path.match(/\/rpc\/([^\/]+)/);
  return match ? match[1] : null;
}

// Express middleware for the auth service
app.use(express.json());

// API key validation endpoint for nginx
app.get('/auth', async (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  try {
    const rateCheck = await db.checkRateLimit(apiKey);
    
    if (!rateCheck.allowed) {
      return res.status(429).json({ 
        error: rateCheck.reason,
        retry_after: rateCheck.reason === 'Monthly quota exceeded' ? 2592000 : 3600 // 30 days or 1 hour
      });
    }

    // Return rate limiting info for nginx
    res.set({
      'X-Rate-Limit': rateCheck.rateLimit,
      'X-User-Plan': rateCheck.user.plan_type,
      'X-Requests-Remaining': Math.max(0, rateCheck.user.monthly_requests - rateCheck.user.requests_used)
    });
    
    res.status(200).json({ 
      status: 'authorized',
      user: rateCheck.user.name,
      plan: rateCheck.user.plan_type,
      rate_limit: rateCheck.rateLimit
    });

  } catch (error) {
    console.error('Auth check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Usage reporting endpoint
app.post('/usage', async (req, res) => {
  const { api_key, requests = 1, ip_address, method } = req.body;
  
  try {
    const success = await db.updateUsage(api_key, requests, ip_address, method);
    res.json({ success });
  } catch (error) {
    console.error('Usage tracking error:', error);
    res.status(500).json({ error: 'Failed to track usage' });
  }
});

// Start auth service
const PORT = process.env.AUTH_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
});

export { db };
export default app;