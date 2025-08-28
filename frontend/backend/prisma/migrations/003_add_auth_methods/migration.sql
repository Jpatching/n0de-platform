-- Add authentication method fields to users table
ALTER TABLE "users" ADD COLUMN "authMethod" TEXT NOT NULL DEFAULT 'wallet';
ALTER TABLE "users" ADD COLUMN "password" TEXT;
ALTER TABLE "users" ADD COLUMN "totpSecret" TEXT;
ALTER TABLE "users" ADD COLUMN "lastLoginAt" TIMESTAMP(3);

-- Make wallet field optional for email/authenticator users
ALTER TABLE "users" ALTER COLUMN "wallet" DROP NOT NULL;

-- Add unique constraint for email
ALTER TABLE "users" ADD CONSTRAINT "users_email_key" UNIQUE ("email");

-- Create indexes for new auth fields
CREATE INDEX "users_authMethod_idx" ON "users"("authMethod");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "users_lastLoginAt_idx" ON "users"("lastLoginAt");

-- Update existing users to have wallet auth method (they already have wallet field)
UPDATE "users" SET "authMethod" = 'wallet' WHERE "wallet" IS NOT NULL; 