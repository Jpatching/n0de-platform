import express from 'express';
import cors from 'cors';
import chalk from 'chalk';
import crypto from 'crypto';
import axios from 'axios';
import DatabaseManager from '../auth/database-manager.js';

const app = express();
const db = new DatabaseManager({ type: 'postgresql' });

await db.init();

app.use(cors({
  origin: [
    'https://n0de-website-umber.vercel.app',
    'https://n0de-website.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.raw({ type: 'application/json' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Plan pricing configuration
const PLAN_PRICING = {
  starter: { cost: 99, requests: 5000000, rate: 50, name: 'Starter Plan' },
  pro: { cost: 299, requests: 25000000, rate: 200, name: 'Professional Plan' },  
  enterprise: { cost: 899, requests: 100000000, rate: 1000, name: 'Enterprise Plan' }
};

// Create payment request endpoint
app.post('/api/payments/create', async (req, res) => {
  const { userEmail, plan, paymentMethod } = req.body;
  
  if (!userEmail || !plan || !PLAN_PRICING[plan]) {
    return res.status(400).json({ error: 'Invalid payment request' });
  }

  const planDetails = PLAN_PRICING[plan];
  
  try {
    let paymentResult;
    
    if (paymentMethod === 'coinbase_commerce') {
      paymentResult = await createCoinbasePayment(userEmail, plan, planDetails);
    } else if (paymentMethod === 'nowpayments') {
      paymentResult = await createNOWPayment(userEmail, plan, planDetails);
    } else {
      return res.status(400).json({ error: 'Unsupported payment method' });
    }
    
    // Store payment record
    await storePendingPayment({
      userEmail,
      plan,
      amount: planDetails.cost,
      paymentId: paymentResult.id,
      provider: paymentMethod,
      status: 'pending'
    });
    
    res.json({
      success: true,
      payment: paymentResult,
      plan: planDetails
    });
    
  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// Coinbase Commerce webhook
app.post('/api/payments/coinbase/webhook', async (req, res) => {
  const signature = req.headers['x-cc-webhook-signature'];
  const payload = req.body;
  
  try {
    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.COINBASE_COMMERCE_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
    
    const event = JSON.parse(payload);
    
    if (event.type === 'charge:confirmed') {
      await handleSuccessfulPayment(event.data, 'coinbase_commerce');
    }
    
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('Coinbase webhook error:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

// NOWPayments webhook  
app.post('/api/payments/nowpayments/webhook', async (req, res) => {
  const signature = req.headers['x-nowpayments-sig'];
  const payload = req.body;
  
  try {
    // Verify NOWPayments signature
    const expectedSignature = crypto
      .createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    if (`sha512=${expectedSignature}` !== signature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
    
    if (payload.payment_status === 'finished') {
      await handleSuccessfulPayment(payload, 'nowpayments');
    }
    
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('NOWPayments webhook error:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

// Payment status check endpoint
app.get('/api/payments/status/:paymentId', async (req, res) => {
  const { paymentId } = req.params;
  
  try {
    const payment = await getPaymentStatus(paymentId);
    res.json(payment);
  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
});

// Helper functions
async function createCoinbasePayment(userEmail, plan, planDetails) {
  const response = await axios.post('https://api.commerce.coinbase.com/charges', {
    name: planDetails.name,
    description: `${planDetails.name} - ${planDetails.requests.toLocaleString()} requests/month`,
    pricing_type: 'fixed_price',
    local_price: {
      amount: planDetails.cost.toString(),
      currency: 'USD'
    },
    metadata: {
      user_email: userEmail,
      plan: plan
    }
  }, {
    headers: {
      'X-CC-Api-Key': process.env.COINBASE_COMMERCE_API_KEY,
      'Content-Type': 'application/json'
    }
  });
  
  return {
    id: response.data.data.id,
    checkout_url: response.data.data.hosted_url,
    addresses: response.data.data.addresses,
    amount: planDetails.cost,
    currency: 'USD'
  };
}

async function createNOWPayment(userEmail, plan, planDetails) {
  // First get available currencies
  const currenciesResponse = await axios.get('https://api.nowpayments.io/v1/currencies', {
    headers: {
      'x-api-key': process.env.NOWPAYMENTS_API_KEY
    }
  });
  
  // Create payment
  const response = await axios.post('https://api.nowpayments.io/v1/payment', {
    price_amount: planDetails.cost,
    price_currency: 'USD',
    pay_currency: 'SOL', // Default to Solana
    order_id: `${userEmail}-${plan}-${Date.now()}`,
    order_description: `${planDetails.name} subscription`,
    ipn_callback_url: `${process.env.FRONTEND_URL}/api/payments/nowpayments/webhook`
  }, {
    headers: {
      'x-api-key': process.env.NOWPAYMENTS_API_KEY,
      'Content-Type': 'application/json'
    }
  });
  
  return {
    id: response.data.payment_id,
    checkout_url: response.data.invoice_url,
    pay_address: response.data.pay_address,
    pay_amount: response.data.pay_amount,
    pay_currency: response.data.pay_currency,
    amount: planDetails.cost,
    currency: 'USD'
  };
}

async function storePendingPayment(paymentData) {
  if (db.config.type === 'postgresql') {
    const client = await db.db.connect();
    try {
      await client.query(`
        INSERT INTO payments (user_email, plan, amount, payment_id, provider, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        ON CONFLICT (payment_id) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP
      `, [
        paymentData.userEmail,
        paymentData.plan,
        paymentData.amount,
        paymentData.paymentId,
        paymentData.provider,
        paymentData.status
      ]);
    } finally {
      client.release();
    }
  } else {
    await db.db.run(`
      INSERT OR REPLACE INTO payments (user_email, plan, amount, payment_id, provider, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      paymentData.userEmail,
      paymentData.plan,
      paymentData.amount,
      paymentData.paymentId,
      paymentData.provider,
      paymentData.status
    ]);
  }
}

async function handleSuccessfulPayment(paymentData, provider) {
  try {
    // Get payment record
    let userEmail, plan;
    
    if (provider === 'coinbase_commerce') {
      userEmail = paymentData.metadata?.user_email;
      plan = paymentData.metadata?.plan;
    } else if (provider === 'nowpayments') {
      // Extract from order_id format: email-plan-timestamp
      const orderParts = paymentData.order_id.split('-');
      userEmail = orderParts[0];
      plan = orderParts[1];
    }
    
    if (!userEmail || !plan) {
      console.error('Invalid payment metadata:', { userEmail, plan });
      return;
    }
    
    // Find user and upgrade their plan
    const users = await db.listUsers();
    const user = users.find(u => u.email === userEmail);
    
    if (!user) {
      console.error('User not found for payment:', userEmail);
      return;
    }
    
    // Update user's plan
    await db.updateUserPlan(user.uuid, plan);
    
    // Mark payment as completed
    await storePendingPayment({
      userEmail,
      plan,
      amount: PLAN_PRICING[plan].cost,
      paymentId: paymentData.id || paymentData.payment_id,
      provider,
      status: 'completed'
    });
    
    console.log(chalk.green(`✅ Successfully upgraded ${userEmail} to ${plan} plan`));
    
    // TODO: Send confirmation email
    
  } catch (error) {
    console.error('Payment processing error:', error);
  }
}

async function getPaymentStatus(paymentId) {
  if (db.config.type === 'postgresql') {
    const client = await db.db.connect();
    try {
      const result = await client.query(
        'SELECT * FROM payments WHERE payment_id = $1',
        [paymentId]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  } else {
    return await db.db.get(
      'SELECT * FROM payments WHERE payment_id = ?',
      [paymentId]
    );
  }
}

// Create payments table if it doesn't exist
async function initPaymentsTable() {
  const paymentsTableSQL = db.config.type === 'postgresql' ? `
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      user_email VARCHAR(255) NOT NULL,
      plan VARCHAR(50) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      payment_id VARCHAR(255) UNIQUE NOT NULL,
      provider VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  ` : `
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL,
      plan TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_id TEXT UNIQUE NOT NULL,
      provider TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  if (db.config.type === 'postgresql') {
    const client = await db.db.connect();
    try {
      await client.query(paymentsTableSQL);
    } finally {
      client.release();
    }
  } else {
    await db.db.exec(paymentsTableSQL);
  }
}

// Initialize payments table
await initPaymentsTable();

// Start payment service
const PORT = process.env.PAYMENT_SERVICE_PORT || 3003;
app.listen(PORT, '0.0.0.0', () => {
  console.log(chalk.green(`💳 Payment Service available at: http://0.0.0.0:${PORT}`));
  console.log(chalk.yellow('Crypto payments enabled: Coinbase Commerce + NOWPayments'));
});

export default app;