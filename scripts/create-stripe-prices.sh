#!/bin/bash
# Create recurring subscription prices for N0DE products

# Export Stripe API key
export STRIPE_SECRET_KEY="sk_test_51S0uJaFjMnr2l5PiVaagf6vrFY539gu84KHLQiuCrPF3v1LRrNEj3TT0CgJ4G5gQz9VfQSy7VCLItQOCzYLEJzY9003JQnSLRE"

echo "Creating recurring prices for N0DE subscription plans..."

# Free Plan - $0/month
echo "Creating Free Plan price..."
curl -X POST https://api.stripe.com/v1/prices \
  -u "$STRIPE_SECRET_KEY:" \
  -d "product=prod_Sx6myMTfBlGO04" \
  -d "unit_amount=0" \
  -d "currency=usd" \
  -d "recurring[interval]=month" \
  -d "nickname=N0DE Free Monthly" \
  -d "metadata[planType]=FREE"

# Starter Plan - $49/month  
echo "Creating Starter Plan price..."
curl -X POST https://api.stripe.com/v1/prices \
  -u "$STRIPE_SECRET_KEY:" \
  -d "product=prod_Sx6nK6Ib1gyygw" \
  -d "unit_amount=4900" \
  -d "currency=usd" \
  -d "recurring[interval]=month" \
  -d "nickname=N0DE Starter Monthly" \
  -d "metadata[planType]=STARTER"

# Professional Plan - $299/month
echo "Creating Professional Plan price..."
curl -X POST https://api.stripe.com/v1/prices \
  -u "$STRIPE_SECRET_KEY:" \
  -d "product=prod_Sx6nJ13gTvCyDA" \
  -d "unit_amount=29900" \
  -d "currency=usd" \
  -d "recurring[interval]=month" \
  -d "nickname=N0DE Professional Monthly" \
  -d "metadata[planType]=PROFESSIONAL"

# Enterprise Plan - $999/month
echo "Creating Enterprise Plan price..."
curl -X POST https://api.stripe.com/v1/prices \
  -u "$STRIPE_SECRET_KEY:" \
  -d "product=prod_Sx6ndYmbdxe11U" \
  -d "unit_amount=99900" \
  -d "currency=usd" \
  -d "recurring[interval]=month" \
  -d "nickname=N0DE Enterprise Monthly" \
  -d "metadata[planType]=ENTERPRISE"

echo "Done creating recurring prices!"