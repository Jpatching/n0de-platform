#!/bin/bash

echo "🔧 Fixing N0DE Local Development Issues"
echo "========================================"

# 1. Check if background image exists
echo "✓ Checking background image..."
if [ -f "frontend/public/chatgpt-background-main.png" ]; then
    echo "  Background image exists at: frontend/public/chatgpt-background-main.png"
    echo "  Size: $(du -h frontend/public/chatgpt-background-main.png | cut -f1)"
else
    echo "  ❌ Background image missing!"
fi

# 2. OAuth Configuration Info
echo -e "\n📋 OAuth Setup Instructions:"
echo "================================"
echo "For local OAuth to work, you need to:"
echo ""
echo "1. Google OAuth:"
echo "   - Go to: https://console.cloud.google.com/apis/credentials"
echo "   - Create OAuth 2.0 Client ID"
echo "   - Add authorized redirect URI: http://localhost:4000/api/v1/auth/google/callback"
echo "   - Add authorized JavaScript origin: http://localhost:3000"
echo ""
echo "2. GitHub OAuth:"
echo "   - Go to: https://github.com/settings/developers"
echo "   - Create new OAuth App"
echo "   - Homepage URL: http://localhost:3000"
echo "   - Authorization callback URL: http://localhost:4000/api/v1/auth/github/callback"
echo ""
echo "3. Update .env.local with your credentials:"
echo "   GOOGLE_CLIENT_ID=your-actual-id"
echo "   GOOGLE_CLIENT_SECRET=your-actual-secret"
echo "   GITHUB_CLIENT_ID=your-actual-id"
echo "   GITHUB_CLIENT_SECRET=your-actual-secret"

# 3. Background CSS Fix
echo -e "\n🎨 Applying background fix..."
cat > frontend/src/styles/background-fix.css << 'EOF'
/* Background image fix */
body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url('/chatgpt-background-main.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  z-index: -1;
}
EOF

echo "  Created background-fix.css"

# 4. Check if services are running
echo -e "\n🔍 Checking services..."
if lsof -i:3000 > /dev/null 2>&1; then
    echo "  ✓ Frontend is running on port 3000"
else
    echo "  ❌ Frontend is NOT running"
fi

if lsof -i:4000 > /dev/null 2>&1; then
    echo "  ✓ Backend is running on port 4000"
else
    echo "  ❌ Backend is NOT running"
fi

if lsof -i:5433 > /dev/null 2>&1; then
    echo "  ✓ PostgreSQL is running on port 5433"
else
    echo "  ❌ PostgreSQL is NOT running"
fi

if lsof -i:6379 > /dev/null 2>&1; then
    echo "  ✓ Redis is running on port 6379"
else
    echo "  ❌ Redis is NOT running"
fi

echo -e "\n✅ Fix script completed!"
echo "================================"
echo "Next steps:"
echo "1. Set up OAuth credentials as shown above"
echo "2. Make sure all services are running:"
echo "   - Frontend: cd frontend && npm run dev"
echo "   - Backend: cd backend && npm run start:dev"
echo "   - Database: docker-compose up -d"
echo "3. Check browser console for any errors"