# Railway Backend OAuth Configuration for n0de.pro

## Critical OAuth Configuration Required

The backend OAuth is currently configured for `localhost:3001` instead of the production domain `n0de.pro`. This needs to be updated in the Railway backend.

### Required Railway Environment Variables:

```bash
# Frontend Configuration
FRONTEND_URL=https://n0de.pro
CORS_ORIGIN=https://n0de.pro

# OAuth Configuration
GOOGLE_OAUTH_REDIRECT_URI=https://n0de.pro/auth/callback
GITHUB_OAUTH_REDIRECT_URI=https://n0de.pro/auth/callback

# Or if using dynamic redirect URIs:
OAUTH_ALLOWED_ORIGINS=https://n0de.pro,https://n0de-website-nc7plss6o-jpatchings-projects.vercel.app
```

### Google Cloud Console Configuration:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to APIs & Services > Credentials
3. Find your OAuth 2.0 Client ID: `562429757888-af5gje3397ue5c72tn5dkv0f6q8rk.apps.googleusercontent.com`
4. Add ALL these to **Authorized redirect URIs**:
   ```
   https://n0de-backend-production-4e34.up.railway.app/api/v1/auth/google/callback
   https://n0de.pro/auth/callback
   https://n0de-website-oil2qn97u-jpatchings-projects.vercel.app/auth/callback
   http://localhost:3000/auth/callback
   http://localhost:3001/auth/callback
   ```

### GitHub OAuth App Configuration:

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Find your n0de OAuth app
3. Add ALL these **Authorization callback URLs** (create separate apps if needed):
   ```
   https://n0de-backend-production-4e34.up.railway.app/api/v1/auth/github/callback
   https://n0de.pro/auth/callback
   https://n0de-website-oil2qn97u-jpatchings-projects.vercel.app/auth/callback
   http://localhost:3000/auth/callback
   http://localhost:3001/auth/callback
   ```

## Current Issue Analysis:

The backend redirect URI is hardcoded as:
```
redirect_uri=http://localhost:3001/api/v1/auth/google/callback
```

This should be:
```
redirect_uri=https://n0de-backend-production-4e34.up.railway.app/api/v1/auth/google/callback
```

## Frontend OAuth Flow:

✅ Frontend correctly passes: `redirect_uri=https://n0de.pro/auth/callback`
❌ Backend ignores this and uses: `redirect_uri=http://localhost:3001/api/v1/auth/google/callback`

The backend needs to use the provided redirect_uri parameter or be configured for production.