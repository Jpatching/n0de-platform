# Complete OAuth Setup Guide for n0de.pro

## 🎯 **CRITICAL: OAuth Provider Configuration Required**

The frontend is fully deployed and configured. OAuth authentication requires configuring redirect URIs in both Google Cloud Console and GitHub.

## 🔧 **Google Cloud Console Setup**

### Step 1: Access OAuth Client
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services > Credentials**
3. Find OAuth 2.0 Client ID: `562429757888-af5gje3397ue5c72tn5dkv0f6q8rk.apps.googleusercontent.com`

**🔗 Direct Link:** [Edit Google OAuth Client](https://console.cloud.google.com/apis/credentials/oauthclient/562429757888-af5gje3397ue5c72tn5dkv0f6q8rk.apps.googleusercontent.com)

### Step 2: Add ALL Redirect URIs
Click **Edit** and add these to **Authorized redirect URIs**:
```
https://n0de-backend-production-4e34.up.railway.app/api/v1/auth/google/callback
https://n0de.pro/auth/callback  
https://n0de-website-oil2qn97u-jpatchings-projects.vercel.app/auth/callback
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
```

## 🔧 **GitHub OAuth App Setup**

### Step 1: Access OAuth App
1. Go to [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/developers)
2. Find your n0de OAuth application with Client ID: `Ov23liiMzWVaA2FznWex`

**🔗 Direct Link:** [Edit GitHub OAuth App](https://github.com/settings/applications/)

### Step 2: Add ALL Callback URLs
Since GitHub only allows one callback URL per app, you have two options:

**Option A: Update existing app**
```
Authorization callback URL: https://n0de-backend-production-4e34.up.railway.app/api/v1/auth/github/callback
```

**Option B: Create separate apps for different environments**
- **Production App**: `https://n0de-backend-production-4e34.up.railway.app/api/v1/auth/github/callback`
- **Development App**: `http://localhost:3001/api/v1/auth/github/callback`

## 🚀 **Railway Backend Configuration**

Set these environment variables in Railway:

```bash
# Frontend Configuration
FRONTEND_URL=https://n0de.pro
CORS_ORIGIN=https://n0de.pro,https://n0de-website-oil2qn97u-jpatchings-projects.vercel.app

# OAuth Redirect Configuration  
GOOGLE_OAUTH_REDIRECT_URI=https://n0de-backend-production-4e34.up.railway.app/api/v1/auth/google/callback
GITHUB_OAUTH_REDIRECT_URI=https://n0de-backend-production-4e34.up.railway.app/api/v1/auth/github/callback

# OAuth Client Configuration (current IDs detected)
GOOGLE_CLIENT_ID=562429757888-af5gje3397ue5c72tn5dkv0f6q8rk.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=Ov23liiMzWVaA2FznWex
GITHUB_CLIENT_SECRET=your_github_client_secret
```

## 🔀 **OAuth Flow Architecture**

### Current Flow:
1. **User clicks "Sign in with Google" on:** `https://n0de.pro`
2. **Frontend redirects to:** `https://n0de-backend-production-4e34.up.railway.app/api/v1/auth/google?redirect_uri=https://n0de.pro/auth/callback`
3. **Backend redirects to Google with:** Backend's callback URL 
4. **Google redirects back to:** `https://n0de-backend-production-4e34.up.railway.app/api/v1/auth/google/callback`
5. **Backend processes OAuth and redirects to:** `https://n0de.pro/auth/callback?token=...`
6. **Frontend completes authentication**

## ✅ **Frontend Status**

**✅ Deployed:** https://n0de-website-oil2qn97u-jpatchings-projects.vercel.app  
**✅ Domain:** n0de.pro (configured in Vercel)  
**✅ OAuth Flow:** Properly implemented  
**✅ Environment Variables:** Production ready  
**✅ API Integration:** All endpoints standardized  
**✅ No Placeholder Data:** Everything pulls from real backend  

## 🧪 **Testing After OAuth Setup**

Once OAuth is configured, test:

1. **Sign in flow:** Google + GitHub authentication
2. **API key creation:** Should sync with backend
3. **Dashboard data:** Live metrics via WebSocket
4. **Subscription flow:** Payment integration
5. **Complete user journey:** Registration → API keys → Usage → Billing

## 🚨 **Priority Action Items**

1. **Configure Google OAuth redirect URIs** (5 minutes)
2. **Configure GitHub OAuth callback URL** (3 minutes) 
3. **Set Railway environment variables** (2 minutes)

**Total setup time: ~10 minutes** ⏱️

Once these are configured, the entire n0de platform will be fully functional! 🎉