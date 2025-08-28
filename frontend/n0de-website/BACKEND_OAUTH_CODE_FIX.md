# Backend OAuth Code Fix - Remove Localhost URLs

## 🚨 **CRITICAL: Backend Code Changes Required**

The OAuth redirect URIs are hardcoded in the backend application code. Here are the exact changes needed:

## **📂 File: `src/auth/strategies/google.strategy.ts`**

**❌ CURRENT (hardcoded localhost):**
```typescript
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3001/api/v1/auth/google/callback', // ❌ HARDCODED
      scope: ['email', 'profile'],
    });
  }
}
```

**✅ FIXED (uses environment variable):**
```typescript
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }
}
```

## **📂 File: `src/auth/strategies/github.strategy.ts`**

**❌ CURRENT (hardcoded localhost):**
```typescript
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor() {
    super({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: 'http://localhost:3001/api/v1/auth/github/callback', // ❌ HARDCODED
      scope: ['user:email'],
    });
  }
}
```

**✅ FIXED (uses environment variable):**
```typescript
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor() {
    super({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_OAUTH_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/github/callback',
      scope: ['user:email'],
    });
  }
}
```

## **📂 File: `src/auth/auth.controller.ts` (OAuth callback handlers)**

**❌ CURRENT (hardcoded frontend URL):**
```typescript
@Get('google/callback')
@UseGuards(AuthGuard('google'))
async googleCallback(@Req() req, @Res() res) {
  const jwt = await this.authService.login(req.user);
  // ❌ HARDCODED localhost frontend URL
  res.redirect(`http://localhost:3000/auth/callback?token=${jwt.access_token}&refresh=${jwt.refresh_token}`);
}
```

**✅ FIXED (uses environment variable):**
```typescript
@Get('google/callback')
@UseGuards(AuthGuard('google'))
async googleCallback(@Req() req, @Res() res) {
  const jwt = await this.authService.login(req.user);
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.redirect(`${frontendUrl}/auth/callback?token=${jwt.access_token}&refresh=${jwt.refresh_token}`);
}

@Get('github/callback')
@UseGuards(AuthGuard('github'))
async githubCallback(@Req() req, @Res() res) {
  const jwt = await this.authService.login(req.user);
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.redirect(`${frontendUrl}/auth/callback?token=${jwt.access_token}&refresh=${jwt.refresh_token}`);
}
```

## **📂 File: `src/main.ts` (CORS and server logging)**

**❌ CURRENT (hardcoded URLs in logs):**
```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // ... other configuration ...
  
  await app.listen(port);
  console.log(`📍 Server: http://localhost:${port}`); // ❌ HARDCODED
  console.log(`📚 API Docs: http://localhost:${port}/api/docs`); // ❌ HARDCODED
  console.log(`🏥 Health: http://localhost:${port}/health`); // ❌ HARDCODED
}
```

**✅ FIXED (uses environment-aware URLs):**
```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // ... other configuration ...
  
  await app.listen(port);
  
  const serverUrl = process.env.NODE_ENV === 'production' 
    ? process.env.SERVER_URL || `https://n0de-backend-production-4e34.up.railway.app`
    : `http://localhost:${port}`;
    
  console.log(`📍 Server: ${serverUrl}`);
  console.log(`📚 API Docs: ${serverUrl}/api/docs`);
  console.log(`🏥 Health: ${serverUrl}/health`);
}
```

## **🔄 Environment Variables Set (Already Done)**

```bash
FRONTEND_URL=https://n0de.pro
GOOGLE_OAUTH_REDIRECT_URI=https://n0de-backend-production-4e34.up.railway.app/api/v1/auth/google/callback
GITHUB_OAUTH_REDIRECT_URI=https://n0de-backend-production-4e34.up.railway.app/api/v1/auth/github/callback
SERVER_URL=https://n0de-backend-production-4e34.up.railway.app
BASE_URL=https://n0de-backend-production-4e34.up.railway.app
```

## **⚡ Steps to Fix:**

1. **Make the code changes above** in your backend repository
2. **Commit and push** to trigger Railway deployment
3. **Wait for deployment** to complete
4. **Test OAuth flow** - should redirect to production URLs

## **✅ Expected Result After Fix:**

```bash
# Google OAuth should redirect to:
redirect_uri=https://n0de-backend-production-4e34.up.railway.app/api/v1/auth/google/callback

# GitHub OAuth should redirect to:  
redirect_uri=https://n0de-backend-production-4e34.up.railway.app/api/v1/auth/github/callback
```

**Priority: HIGH** - This is blocking all authentication functionality!