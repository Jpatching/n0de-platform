#!/usr/bin/env node

/**
 * N0DE Payment Flow Test Script
 * Tests the complete payment flow from checkout to webhook processing
 */

const axios = require('axios');
const stripe = require('stripe')('sk_test_51S0uJaFjMnr2l5PiUCeEZ4Vw2FEGXNuZFC5MxVjFlN1k6YcVUUP2XETpwovNDnwLcRFiTBZ7HX8OEUTucvHmZ6Wy00zFExTtQk');
const colors = require('colors/safe');

const API_URL = process.env.API_URL || 'http://localhost:4000';

async function createTestPaymentLink() {
  console.log(colors.cyan('\n=== Creating Test Payment Link ===\n'));
  
  try {
    // Get the Starter plan price
    const prices = await stripe.prices.list({ limit: 100 });
    const starterPrice = prices.data.find(p => 
      p.metadata?.plan_type === 'starter_plan' && p.recurring
    );
    
    if (!starterPrice) {
      console.error(colors.red('❌ Could not find Starter plan price'));
      return null;
    }
    
    console.log(colors.green(`✅ Found Starter plan price: ${starterPrice.id} ($${starterPrice.unit_amount / 100})`));
    
    // Create a payment link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{
        price: starterPrice.id,
        quantity: 1,
      }],
      after_completion: {
        type: 'redirect',
        redirect: {
          url: 'https://www.n0de.pro/payment/success?session_id={CHECKOUT_SESSION_ID}',
        },
      },
      metadata: {
        plan_type: 'STARTER',
        test_payment: 'true',
      },
    });
    
    console.log(colors.green(`✅ Payment link created: ${paymentLink.url}`));
    return paymentLink;
    
  } catch (error) {
    console.error(colors.red(`❌ Failed to create payment link: ${error.message}`));
    return null;
  }
}

async function simulateWebhook(sessionId) {
  console.log(colors.cyan('\n=== Simulating Webhook Event ===\n'));
  
  try {
    // Create a test webhook event
    const event = {
      id: `evt_test_${Date.now()}`,
      object: 'event',
      api_version: '2025-08-27.basil',
      created: Math.floor(Date.now() / 1000),
      type: 'checkout.session.completed',
      data: {
        object: {
          id: sessionId,
          object: 'checkout.session',
          amount_total: 4900,
          currency: 'usd',
          customer_email: 'test@n0de.pro',
          metadata: {
            paymentId: 'test_payment_' + Date.now(),
            userId: 'test_user_123',
            planType: 'STARTER',
          },
          payment_status: 'paid',
          status: 'complete',
        },
      },
    };
    
    // Create webhook signature
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify(event);
    const secret = 'whsec_72f66a18ab0af43f3784effe43a08377d4d0f282a0e046a97f81c27840c9eb1e';
    
    // Stripe signature format: t=timestamp,v1=signature
    const crypto = require('crypto');
    const signedPayload = `${timestamp}.${payload}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');
    
    const stripeSignature = `t=${timestamp},v1=${signature}`;
    
    console.log(colors.blue(`📤 Sending webhook to ${API_URL}/api/v1/payments/webhooks/stripe`));
    
    const response = await axios.post(
      `${API_URL}/api/v1/payments/webhooks/stripe`,
      payload,
      {
        headers: {
          'stripe-signature': stripeSignature,
          'Content-Type': 'application/json',
        },
        validateStatus: () => true,
      }
    );
    
    if (response.status === 200) {
      console.log(colors.green(`✅ Webhook processed successfully`));
      console.log(colors.green(`   Response: ${JSON.stringify(response.data)}`));
    } else {
      console.log(colors.yellow(`⚠️  Webhook returned status ${response.status}`));
      console.log(colors.yellow(`   Response: ${JSON.stringify(response.data)}`));
    }
    
    return response;
    
  } catch (error) {
    console.error(colors.red(`❌ Webhook simulation failed: ${error.message}`));
    return null;
  }
}

async function testCheckoutSession() {
  console.log(colors.cyan('\n=== Testing Checkout Session Creation ===\n'));
  
  try {
    // Create a checkout session directly
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'N0DE Starter Plan',
            description: 'Test subscription for payment flow',
          },
          unit_amount: 4900,
          recurring: {
            interval: 'month',
          },
        },
        quantity: 1,
      }],
      success_url: 'https://www.n0de.pro/payment/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://www.n0de.pro/checkout?plan=STARTER',
      metadata: {
        paymentId: 'test_' + Date.now(),
        userId: 'test_user_123',
        planType: 'STARTER',
      },
    });
    
    console.log(colors.green(`✅ Checkout session created`));
    console.log(colors.green(`   Session ID: ${session.id}`));
    console.log(colors.green(`   Payment URL: ${session.url}`));
    
    return session;
    
  } catch (error) {
    console.error(colors.red(`❌ Failed to create checkout session: ${error.message}`));
    return null;
  }
}

async function testStripeProducts() {
  console.log(colors.cyan('\n=== Verifying Stripe Products ===\n'));
  
  try {
    const products = await stripe.products.list({ limit: 10 });
    const prices = await stripe.prices.list({ limit: 20 });
    
    console.log(colors.blue(`Found ${products.data.length} products:`));
    products.data.forEach(product => {
      const productPrices = prices.data.filter(p => p.product === product.id);
      console.log(colors.green(`  ✅ ${product.name} (${product.id})`));
      productPrices.forEach(price => {
        const amount = price.unit_amount ? `$${price.unit_amount / 100}` : 'Custom';
        const recurring = price.recurring ? `/${price.recurring.interval}` : ' one-time';
        console.log(colors.gray(`     - ${price.id}: ${amount}${recurring}`));
      });
    });
    
  } catch (error) {
    console.error(colors.red(`❌ Failed to list products: ${error.message}`));
  }
}

async function main() {
  console.log(colors.cyan('\n========================================'));
  console.log(colors.cyan('   N0DE Payment Flow Test'));
  console.log(colors.cyan('========================================'));
  
  // Test 1: Verify Stripe products
  await testStripeProducts();
  
  // Test 2: Create a payment link
  const paymentLink = await createTestPaymentLink();
  
  if (paymentLink) {
    console.log(colors.yellow('\n📋 Next Steps:'));
    console.log(colors.yellow('1. Click the payment link to test the checkout flow:'));
    console.log(colors.cyan(`   ${paymentLink.url}`));
    console.log(colors.yellow('2. Use test card: 4242 4242 4242 4242'));
    console.log(colors.yellow('3. Any future date for expiry, any CVC'));
  }
  
  // Test 3: Create checkout session
  const session = await testCheckoutSession();
  
  // Test 4: Simulate webhook (if session created)
  if (session) {
    console.log(colors.yellow('\n⏳ Waiting 2 seconds before simulating webhook...'));
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await simulateWebhook(session.id);
  }
  
  console.log(colors.cyan('\n========================================'));
  console.log(colors.cyan('   Test Complete'));
  console.log(colors.cyan('========================================\n'));
}

// Run tests
main().catch(error => {
  console.error(colors.red(`\n❌ Test failed: ${error.message}`));
  process.exit(1);
});