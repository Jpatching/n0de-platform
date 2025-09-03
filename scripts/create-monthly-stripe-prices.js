const stripe = require('stripe')('sk_test_51S0uJaFjMnr2l5PiVaagf6vrFY539gu81jkbXesonJG2ok7HLHdtLE7wnk55HxhOFRZXvtxOOYSTjOEMrN3UIZad002srY2l8B');

async function createMonthlyPrices() {
  console.log('🚀 Creating monthly recurring prices for N0DE subscriptions...\n');
  
  const plans = [
    {
      productId: 'prod_Sx6myMTfBlGO04', // Free Plan
      amount: 0,
      name: 'Free Plan'
    },
    {
      productId: 'prod_Sx6nK6Ib1gyygw', // Starter Plan  
      amount: 4900, // $49.00
      name: 'Starter Plan'
    },
    {
      productId: 'prod_Sx6nJ13gTvCyDA', // Professional Plan
      amount: 29900, // $299.00
      name: 'Professional Plan'
    },
    {
      productId: 'prod_Sx6ndYmbdxe11U', // Enterprise Plan
      amount: 99900, // $999.00
      name: 'Enterprise Plan'
    }
  ];

  const results = [];
  
  for (const plan of plans) {
    try {
      console.log(`Creating monthly price for ${plan.name} ($${plan.amount/100})...`);
      
      const price = await stripe.prices.create({
        product: plan.productId,
        unit_amount: plan.amount,
        currency: 'usd',
        recurring: {
          interval: 'month',
          usage_type: 'licensed'
        },
        billing_scheme: 'per_unit',
        metadata: {
          plan_type: plan.name.toLowerCase().replace(' ', '_'),
          created_by: 'n0de_migration_script'
        }
      });
      
      console.log(`✅ Created price: ${price.id} for ${plan.name}`);
      results.push({
        plan: plan.name,
        priceId: price.id,
        amount: plan.amount
      });
      
    } catch (error) {
      console.error(`❌ Failed to create price for ${plan.name}:`, error.message);
    }
  }
  
  console.log('\n📊 Summary of created prices:');
  results.forEach(result => {
    console.log(`  ${result.plan}: ${result.priceId} ($${result.amount/100}/month)`);
  });
  
  console.log('\n🎉 Monthly recurring prices created successfully!');
  console.log('These prices can now be used for subscription creation in your N0DE platform.');
}

createMonthlyPrices().catch(console.error);
