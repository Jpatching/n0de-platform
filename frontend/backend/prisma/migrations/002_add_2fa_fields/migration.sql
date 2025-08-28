-- Add 2FA fields to users table
ALTER TABLE "users" ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "twoFactorSecret" TEXT;
ALTER TABLE "users" ADD COLUMN "backupCodes" TEXT;
ALTER TABLE "users" ADD COLUMN "lastTwoFactorVerification" TIMESTAMP(3);
 
-- Create indexes for 2FA fields
CREATE INDEX "users_twoFactorEnabled_idx" ON "users"("twoFactorEnabled");
CREATE INDEX "users_lastTwoFactorVerification_idx" ON "users"("lastTwoFactorVerification"); 