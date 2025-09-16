#!/bin/bash

# Setup Stripe Webhook Forwarding for Local Testing
echo "Setting up Stripe webhook forwarding..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Stripe webhook forwarding to localhost:4000${NC}"
echo -e "${GREEN}This will forward all Stripe events to your local backend${NC}"
echo ""
echo "Press Ctrl+C to stop forwarding"
echo ""

# Forward webhooks to local backend
stripe listen \
  --api-key sk_test_51S0uJaFjMnr2l5PiUCeEZ4Vw2FEGXNuZFC5MxVjFlN1k6YcVUUP2XETpwovNDnwLcRFiTBZ7HX8OEUTucvHmZ6Wy00zFExTtQk \
  --forward-to localhost:4000/api/v1/payments/webhooks/stripe \
  --print-json