-- Migration script to fix payment_history table
-- This script adds the missing columns with default values for existing rows

-- Step 1: Add columns as nullable first
ALTER TABLE "payment_history" 
ADD COLUMN IF NOT EXISTS "amount" INTEGER,
ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Step 2: Update existing rows with default values
UPDATE "payment_history" 
SET 
  "amount" = 0,
  "userId" = (SELECT id FROM users LIMIT 1)
WHERE "amount" IS NULL OR "userId" IS NULL;

-- Step 3: Make columns required
ALTER TABLE "payment_history" 
ALTER COLUMN "amount" SET NOT NULL,
ALTER COLUMN "userId" SET NOT NULL;

-- Step 4: Add foreign key constraint for userId
ALTER TABLE "payment_history"
ADD CONSTRAINT "payment_history_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 5: Add index for better performance
CREATE INDEX IF NOT EXISTS "payment_history_userId_idx" ON "payment_history"("userId");