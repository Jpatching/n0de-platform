#!/usr/bin/env node

/**
 * Environment Setup Script for PV3 Frontend
 * This script helps set up the correct environment variables for development
 * 
 * IMPORTANT: Frontend should NOT connect directly to database!
 * Frontend → Backend API → Database (proper architecture)
 */

const fs = require('fs');
const path = require('path');

const ENV_FILE = path.join(__dirname, '.env.local');

const DEFAULT_ENV_CONTENT = `# Backend API Configuration
NEXT_PUBLIC_API_URL="https://pv3-backend-api-production.up.railway.app"

# Solana Configuration (MAINNET)
NEXT_PUBLIC_SOLANA_NETWORK="mainnet-beta"
NEXT_PUBLIC_SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"

# Site Configuration
NEXT_PUBLIC_SITE_URL="https://pv3-gaming.vercel.app"
NEXT_PUBLIC_SITE_NAME="PV3.FUN"

# Wallet Configuration
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID="your_wallet_connect_id_here"

# Development/Debug
NEXT_PUBLIC_DEBUG_MODE="false"

# Next.js Configuration (for development)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-change-this-in-production"

# Environment
NODE_ENV="development"

# NOTE: DATABASE_URL is NOT needed in frontend!
# The frontend communicates with the backend API, which handles database operations.
# This follows proper separation of concerns:
# Frontend → Backend API → Database
`;

function setupEnvironment() {
  console.log('🔧 Setting up frontend environment variables...');
  console.log('📋 Architecture: Frontend → Backend API → Database');
  
  // Check if .env.local already exists
  if (fs.existsSync(ENV_FILE)) {
    console.log('⚠️  .env.local already exists');
    console.log('📝 Current content:');
    const currentContent = fs.readFileSync(ENV_FILE, 'utf8');
    console.log(currentContent);
    
    // Check if it contains DATABASE_URL
    if (currentContent.includes('DATABASE_URL')) {
      console.log('🚨 WARNING: Found DATABASE_URL in frontend environment!');
      console.log('🚨 Frontend should NOT connect directly to database!');
      console.log('🚨 Proper architecture: Frontend → Backend API → Database');
    }
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('Do you want to overwrite with proper frontend config? (y/N): ', (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        writeEnvFile();
      } else {
        console.log('✅ Keeping existing .env.local file');
        console.log('💡 Remember: Frontend should use backend API, not direct database access!');
      }
      readline.close();
    });
  } else {
    writeEnvFile();
  }
}

function writeEnvFile() {
  try {
    fs.writeFileSync(ENV_FILE, DEFAULT_ENV_CONTENT);
    console.log('✅ Created .env.local with proper frontend configuration');
    console.log('📍 File location:', ENV_FILE);
    console.log('\n📋 Environment variables set:');
    console.log('- NEXT_PUBLIC_API_URL: Backend API endpoint');
    console.log('- NEXT_PUBLIC_SOLANA_*: Solana network configuration');
    console.log('- NEXT_PUBLIC_SITE_*: Site configuration');
    console.log('- NEXTAUTH_*: NextAuth configuration');
    console.log('- NODE_ENV: development');
    
    console.log('\n✅ IMPORTANT: No DATABASE_URL in frontend!');
    console.log('📡 Frontend will communicate with backend API only');
    console.log('🏗️  Architecture: Frontend → Backend API → Database');
    
    console.log('\n🚀 Next steps:');
    console.log('1. Run: npm run dev');
    console.log('2. Frontend will use backend API at:', process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app');
    console.log('3. Backend handles all database operations');
    console.log('4. Test signup/signin - should work without database errors!');
    
  } catch (error) {
    console.error('❌ Failed to create .env.local:', error.message);
    console.log('\n📝 Please manually create .env.local with this content:');
    console.log(DEFAULT_ENV_CONTENT);
  }
}

// Run the setup
setupEnvironment(); 