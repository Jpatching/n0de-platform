#!/bin/bash

# N0DE Stripe Products Setup Script
# Run this after setting your STRIPE_SECRET_KEY environment variable

set -e

echo "🚀 Setting up N0DE subscription products in Stripe..."

# Check if Stripe CLI is available
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI not found. Please install it first."
    exit 1
fi

# Check if API key is set
if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo "❌ STRIPE_SECRET_KEY environment variable not set"
    echo "Please set it with: export STRIPE_SECRET_KEY=sk_test_your_key_here"
    exit 1
fi

echo "✅ Using Stripe API key: ${STRIPE_SECRET_KEY:0:12}..."

# Create STARTER product
echo "📦 Creating STARTER subscription product..."
STARTER_PRODUCT=$(stripe products create \
  --name="N0DE Starter Plan" \
  --description="1M requests/month • 3 API keys • Standard support • All networks" \
  --metadata[planType]="STARTER" \
  --metadata[requests]="1000000" \
  --metadata[apiKeys]="3" \
  --metadata[rateLimit]="1000")

STARTER_PRODUCT_ID=$(echo "$STARTER_PRODUCT" | grep '"id"' | head -1 | sed 's/.*"id": "\([^"]*\)".*/\1/')
echo "✅ Created Starter product: $STARTER_PRODUCT_ID"

# Create STARTER price
echo "💰 Creating STARTER price..."
STARTER_PRICE=$(stripe prices create \
  --unit-amount=4900 \
  --currency=usd \
  --product="$STARTER_PRODUCT_ID" \
  --recurring[interval]=month \
  --nickname="starter-monthly")

STARTER_PRICE_ID=$(echo "$STARTER_PRICE" | grep '"id"' | head -1 | sed 's/.*"id": "\([^"]*\)".*/\1/')
echo "✅ Created Starter price: $STARTER_PRICE_ID"

# Create PROFESSIONAL product
echo "📦 Creating PROFESSIONAL subscription product..."
PROFESSIONAL_PRODUCT=$(stripe products create \
  --name="N0DE Professional Plan" \
  --description="10M requests/month • 10 API keys • Priority support • Advanced analytics • Custom domains" \
  --metadata[planType]="PROFESSIONAL" \
  --metadata[requests]="10000000" \
  --metadata[apiKeys]="10" \
  --metadata[rateLimit]="5000")

PROFESSIONAL_PRODUCT_ID=$(echo "$PROFESSIONAL_PRODUCT" | grep '"id"' | head -1 | sed 's/.*"id": "\([^"]*\)".*/\1/')
echo "✅ Created Professional product: $PROFESSIONAL_PRODUCT_ID"

# Create PROFESSIONAL price
echo "💰 Creating PROFESSIONAL price..."
PROFESSIONAL_PRICE=$(stripe prices create \
  --unit-amount=29900 \
  --currency=usd \
  --product="$PROFESSIONAL_PRODUCT_ID" \
  --recurring[interval]=month \
  --nickname="professional-monthly")

PROFESSIONAL_PRICE_ID=$(echo "$PROFESSIONAL_PRICE" | grep '"id"' | head -1 | sed 's/.*"id": "\([^"]*\)".*/\1/')
echo "✅ Created Professional price: $PROFESSIONAL_PRICE_ID"

# Create ENTERPRISE product
echo "📦 Creating ENTERPRISE subscription product..."
ENTERPRISE_PRODUCT=$(stripe products create \
  --name="N0DE Enterprise Plan" \
  --description="Unlimited requests • Unlimited API keys • 24/7 support • SLA guarantee • Custom integration • White-label options" \
  --metadata[planType]="ENTERPRISE" \
  --metadata[requests]="-1" \
  --metadata[apiKeys]="-1" \
  --metadata[rateLimit]="25000")

ENTERPRISE_PRODUCT_ID=$(echo "$ENTERPRISE_PRODUCT" | grep '"id"' | head -1 | sed 's/.*"id": "\([^"]*\)".*/\1/')
echo "✅ Created Enterprise product: $ENTERPRISE_PRODUCT_ID"

# Create ENTERPRISE price
echo "💰 Creating ENTERPRISE price..."
ENTERPRISE_PRICE=$(stripe prices create \
  --unit-amount=99900 \
  --currency=usd \
  --product="$ENTERPRISE_PRODUCT_ID" \
  --recurring[interval]=month \
  --nickname="enterprise-monthly")

ENTERPRISE_PRICE_ID=$(echo "$ENTERPRISE_PRICE" | grep '"id"' | head -1 | sed 's/.*"id": "\([^"]*\)".*/\1/')
echo "✅ Created Enterprise price: $ENTERPRISE_PRICE_ID"

# Output environment variables
echo ""
echo "🎉 All products created successfully!"
echo ""
echo "Add these to your .env file:"
echo "STRIPE_STARTER_PRICE_ID=$STARTER_PRICE_ID"
echo "STRIPE_PROFESSIONAL_PRICE_ID=$PROFESSIONAL_PRICE_ID"
echo "STRIPE_ENTERPRISE_PRICE_ID=$ENTERPRISE_PRICE_ID"
echo ""
echo "Product IDs:"
echo "STARTER_PRODUCT_ID=$STARTER_PRODUCT_ID"
echo "PROFESSIONAL_PRODUCT_ID=$PROFESSIONAL_PRODUCT_ID"
echo "ENTERPRISE_PRODUCT_ID=$ENTERPRISE_PRODUCT_ID"

# Create environment variables file
cat > .env.stripe-products << EOF
# Stripe Product and Price IDs - Generated $(date)
STRIPE_STARTER_PRICE_ID=$STARTER_PRICE_ID
STRIPE_PROFESSIONAL_PRICE_ID=$PROFESSIONAL_PRICE_ID
STRIPE_ENTERPRISE_PRICE_ID=$ENTERPRISE_PRICE_ID

STRIPE_STARTER_PRODUCT_ID=$STARTER_PRODUCT_ID
STRIPE_PROFESSIONAL_PRODUCT_ID=$PROFESSIONAL_PRODUCT_ID
STRIPE_ENTERPRISE_PRODUCT_ID=$ENTERPRISE_PRODUCT_ID
EOF

echo "✅ Saved environment variables to .env.stripe-products"
echo ""
echo "🔗 Next steps:"
echo "1. Add the price IDs to your .env file"
echo "2. Update your backend to use these price IDs"
echo "3. Test the payment flow"
echo "4. Set up webhooks in Stripe Dashboard"
echo ""
echo "🎯 Your checkout URL will be: https://n0de.pro/checkout"