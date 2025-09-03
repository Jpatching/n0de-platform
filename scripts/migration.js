const { PrismaClient } = require('@prisma/client');

async function runMigration() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/n0de_production'
      }
    }
  });

  try {
    console.log('Starting migration...');
    
    // Step 1: Add columns as nullable
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "payment_history" 
      ADD COLUMN IF NOT EXISTS "amount" INTEGER,
      ADD COLUMN IF NOT EXISTS "userId" TEXT
    `);
    console.log('Added nullable columns');

    // Step 2: Get first user ID for default value
    const firstUser = await prisma.user.findFirst();
    if (!firstUser) {
      console.log('No users found, creating default user');
      const defaultUser = await prisma.user.create({
        data: {
          email: 'system@n0de.pro',
          name: 'System User',
          role: 'USER'
        }
      });
      firstUser = defaultUser;
    }

    // Step 3: Update existing rows
    await prisma.$executeRawUnsafe(`
      UPDATE "payment_history" 
      SET 
        "amount" = COALESCE("amount", 0),
        "userId" = COALESCE("userId", $1)
      WHERE "amount" IS NULL OR "userId" IS NULL
    `, firstUser.id);
    console.log('Updated existing rows with defaults');

    // Step 4: Make columns required
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "payment_history" 
      ALTER COLUMN "amount" SET NOT NULL,
      ALTER COLUMN "userId" SET NOT NULL
    `);
    console.log('Made columns required');

    // Step 5: Add foreign key if not exists
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'payment_history_userId_fkey'
        ) THEN
          ALTER TABLE "payment_history"
          ADD CONSTRAINT "payment_history_userId_fkey" 
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
    console.log('Added foreign key constraint');

    // Step 6: Create index
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "payment_history_userId_idx" ON "payment_history"("userId")
    `);
    console.log('Created index');

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();