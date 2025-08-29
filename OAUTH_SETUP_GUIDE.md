# OAuth Provider Setup Guide for N0DE Platform

## 🔐 OAuth Configuration Required

To enable OAuth authentication (Google & GitHub), you need to set up OAuth applications with each provider and update the environment variables.

## 📝 Step-by-Step Setup

### 1. Google OAuth Setup

#### A. Create Google OAuth Application
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"

#### B. Configure OAuth Application
- **Application Name**: N0DE Platform
- **Authorized JavaScript origins**:
  ```
  https://www.n0de.pro
  https://n0de.pro
  ```
- **Authorized redirect URIs**:
  ```
  https://n0de-backend-production-4e34.up.railway.app/api/v1/auth/google/callback
  ```

#### C. Get Credentials
After creating, copy the:
- **Client ID** (starts with numbers, ends with `.apps.googleusercontent.com`)
- **Client Secret** (random string)

### 2. GitHub OAuth Setup

#### A. Create GitHub OAuth App
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"

#### B. Configure OAuth Application
- **Application Name**: N0DE Platform
- **Homepage URL**: `https://www.n0de.pro`
- **Application Description**: RPC Infrastructure Platform
- **Authorization callback URL**: 
  ```
  https://n0de-backend-production-4e34.up.railway.app/api/v1/auth/github/callback
  ```

#### C. Get Credentials
After creating, copy the:
- **Client ID** (alphanumeric string)
- **Client Secret** (click "Generate a new client secret")

### 3. Update Environment Variables

Replace the placeholder values in your `.env` file:

```bash
# Replace these placeholder values:
GOOGLE_CLIENT_ID=your-actual-google-client-id-here
GOOGLE_CLIENT_SECRET=your-actual-google-client-secret-here

GITHUB_CLIENT_ID=your-actual-github-client-id-here
GITHUB_CLIENT_SECRET=your-actual-github-client-secret-here
```

### 4. Deploy Changes

After updating the environment variables:

```bash
# Commit the changes
git add .env
git commit -m "feat: configure OAuth providers with production credentials"

# Deploy to Railway
railway up

# Or push to trigger automatic deployment
git push origin main
```

## 🧪 Testing OAuth Flows

After deployment, test the authentication:

1. **Google OAuth**:
   - Go to `https://www.n0de.pro`
   - Click "Sign in with Google"
   - Should redirect to Google consent screen
   - After approval, should redirect back to dashboard

2. **GitHub OAuth**:
   - Go to `https://www.n0de.pro`
   - Click "Sign in with GitHub"
   - Should redirect to GitHub authorization
   - After approval, should redirect back to dashboard

## 🔍 Troubleshooting

### Common Issues:

#### 1. "redirect_uri_mismatch" Error
- **Cause**: Redirect URI in OAuth app doesn't match backend URL
- **Fix**: Ensure callback URL is exactly: `https://n0de-backend-production-4e34.up.railway.app/api/v1/auth/google/callback`

#### 2. "invalid_client" Error
- **Cause**: Wrong Client ID or Client Secret
- **Fix**: Double-check credentials copied correctly

#### 3. CORS Errors
- **Cause**: Frontend URL not authorized
- **Fix**: Add both `https://n0de.pro` and `https://www.n0de.pro` to authorized origins

#### 4. "Application not found" in logs
- **Cause**: Environment variables not deployed
- **Fix**: Verify Railway deployment completed and variables are set

## ✅ Verification Checklist

- [ ] Google OAuth app created with correct redirect URI
- [ ] GitHub OAuth app created with correct callback URL  
- [ ] Environment variables updated with real credentials
- [ ] Backend deployed with new environment variables
- [ ] Google login flow tested end-to-end
- [ ] GitHub login flow tested end-to-end
- [ ] Users can access dashboard after OAuth login
- [ ] Token refresh works properly
- [ ] Upgrade flow works for authenticated users

## 🚨 Security Notes

1. **Keep credentials secure**: Never commit real OAuth credentials to version control
2. **Use Railway environment variables**: Set credentials in Railway dashboard for production
3. **Restrict domains**: Only allow your production domains in OAuth apps
4. **Monitor usage**: Check OAuth app usage in provider dashboards
5. **Rotate credentials**: Regularly update OAuth credentials for security

## 📊 Expected Results

After proper setup:
- ✅ OAuth users stay authenticated across browser sessions
- ✅ Token refresh happens automatically without user interaction
- ✅ Upgrade flow works for authenticated users
- ✅ No more authentication errors in application logs
- ✅ Improved user onboarding and retention rates

## 📞 Support

If you encounter issues:
1. Check Railway application logs for detailed error messages
2. Verify OAuth app settings in provider dashboards
3. Test with browser network tab open to see exact error responses
4. Ensure all URLs match exactly (including https/www)

---

**Priority**: 🔥 **HIGH** - This blocks all OAuth authentication functionality!