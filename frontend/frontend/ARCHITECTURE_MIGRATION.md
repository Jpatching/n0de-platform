# PV3 Architecture Migration Guide

## 🚨 Important Change: Database Access Architecture

### ❌ Old (Incorrect) Architecture:
```
Frontend → Direct PostgreSQL Database
```
- Frontend had `DATABASE_URL` in environment
- Frontend API routes (`/api/auth/*`) connected directly to database
- Security risk and architectural anti-pattern

### ✅ New (Correct) Architecture:
```
Frontend → Backend API → PostgreSQL Database
```
- Frontend only communicates with backend API
- Backend handles all database operations
- Proper separation of concerns

## 🔧 What Changed

### Environment Variables
**Removed from Frontend:**
- `DATABASE_URL` - No longer needed in frontend

**Added to Frontend:**
- `NEXT_PUBLIC_API_URL` - Points to your backend API
- Proper Solana and site configuration

### Authentication Flow
**Before:**
1. Frontend → `/api/auth/signup` → Direct database
2. Frontend → `/api/auth/signin` → Direct database

**After:**
1. Frontend → Backend API `/api/v1/auth/*` → Database
2. Wallet auth uses proper backend flow
3. Email/authenticator auth temporarily uses frontend API (to be migrated)

## 🚀 Current Status

### ✅ Working (Backend API):
- Wallet authentication
- Developer registration
- Partner applications
- Game matching

### 🔄 In Transition (Frontend API):
- Email signup/signin
- Authenticator signup/signin
- User profile management

### 📋 Next Steps:
1. **Immediate**: Remove `DATABASE_URL` from frontend environment
2. **Short-term**: Migrate email/authenticator auth to backend
3. **Long-term**: Remove all frontend API routes that access database

## 🛠️ How to Fix Your Setup

### 1. Update Environment Variables
```bash
# Run the setup script
node setup-env.js
```

### 2. Your Backend API
Your backend is already properly configured at:
```
https://pv3-backend-api-production.up.railway.app
```

### 3. Database Connection
The database should ONLY be accessed by your backend:
```
Backend: postgresql://postgres:bOOTEOuUdHGDpqgmYJJuqsALFqtCPDbH@junction.proxy.rlwy.net:21162/railway
```

## 🎯 Benefits of Proper Architecture

### Security:
- Database credentials not exposed to frontend
- Centralized authentication and authorization
- Better rate limiting and validation

### Scalability:
- Backend can handle multiple frontend clients
- Database connection pooling
- Easier to add mobile apps, etc.

### Maintainability:
- Clear separation of concerns
- Single source of truth for business logic
- Easier testing and debugging

## 🔍 Troubleshooting

### "Can't reach database server" Error:
This means frontend is still trying to connect to database directly.
**Solution**: Remove `DATABASE_URL` from frontend environment.

### Authentication Not Working:
Check that `NEXT_PUBLIC_API_URL` points to your backend:
```
https://pv3-backend-api-production.up.railway.app
```

### Wallet Generation for Email Users:
The new system ensures ALL users get wallet addresses:
- Email users: Generated Solana wallet for PDA vault access
- Authenticator users: Generated Solana wallet for PDA vault access  
- Wallet users: Use their connected wallet

This ensures consistent PDA vault functionality across all auth methods.

## 📞 Support

If you encounter issues:
1. Check browser console for error messages
2. Verify environment variables are set correctly
3. Ensure backend API is accessible
4. Check that no `DATABASE_URL` exists in frontend environment 