#!/usr/bin/env ts-node

/**
 * Database Seed Script for N0DE Platform
 * Seeds initial data for development and testing
 */

import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  try {
    // Create test user if doesn't exist
    const email = 'test@n0de.pro';
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      const hashedPassword = await bcrypt.hash('testpassword123', 10);
      user = await prisma.user.create({
        data: {
          email,
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          passwordHash: hashedPassword,
          emailVerified: true,
          isActive: true,
          role: 'user',
        }
      });
      console.log('✅ Created test user:', email);
    } else {
      console.log('ℹ️ Test user already exists');
    }

    // Create organization for user
    let org = await prisma.organization.findFirst({
      where: { ownerId: user.id }
    });

    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: 'Test Organization',
          ownerId: user.id,
          plan: 'PROFESSIONAL',
          maxUsers: 10,
          maxApiKeys: 100,
        }
      });
      console.log('✅ Created organization');
    }

    // Create starter API key
    const existingKeys = await prisma.apiKey.findMany({
      where: { userId: user.id }
    });

    if (existingKeys.length === 0) {
      const apiKey = await prisma.apiKey.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          name: 'Starter API Key',
          key: `n0de_live_${randomBytes(32).toString('hex')}`,
          keyPreview: `n0de_live_${randomBytes(4).toString('hex')}...`,
          permissions: ['read', 'write'],
          rateLimit: 1000,
          isActive: true,
          environment: 'production',
        }
      });
      console.log('✅ Created starter API key');
    }

    // Create subscription
    const subscription = await prisma.subscription.findFirst({
      where: { userId: user.id }
    });

    if (!subscription) {
      await prisma.subscription.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          plan: 'PROFESSIONAL',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          autoRenew: true,
          price: 49.00,
          currency: 'USD',
          billingCycle: 'monthly',
          maxRequests: 5000000,
          maxBandwidth: '2TB',
          maxStorage: '500GB',
        }
      });
      console.log('✅ Created subscription');
    }

    // Seed some usage data
    const today = new Date();
    const usageStats = await prisma.usageStats.findFirst({
      where: {
        userId: user.id,
        date: {
          gte: new Date(today.setHours(0, 0, 0, 0))
        }
      }
    });

    if (!usageStats) {
      // Create usage stats for the past 7 days
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        await prisma.usageStats.upsert({
          where: {
            userId_date: {
              userId: user.id,
              date
            }
          },
          create: {
            userId: user.id,
            organizationId: org.id,
            date,
            totalRequests: Math.floor(Math.random() * 100000) + 50000,
            successfulRequests: Math.floor(Math.random() * 90000) + 45000,
            failedRequests: Math.floor(Math.random() * 1000) + 100,
            totalBandwidth: Math.floor(Math.random() * 1000000000) + 500000000, // bytes
            averageLatency: Math.floor(Math.random() * 50) + 20,
            peakRps: Math.floor(Math.random() * 1000) + 100,
            uniqueIps: Math.floor(Math.random() * 500) + 100,
            costInCents: Math.floor(Math.random() * 500) + 100,
          },
          update: {}
        });
      }
      console.log('✅ Created usage statistics');
    }

    // Create some billing records
    const billingUsage = await prisma.billingUsage.findFirst({
      where: { userId: user.id }
    });

    if (!billingUsage) {
      await prisma.billingUsage.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          billingPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          billingPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          totalRequests: 1250000,
          totalBandwidth: 1288490188, // ~1.2TB in bytes
          totalStorage: 262923469, // ~245GB in bytes
          totalCost: 49.00,
          isPaid: true,
        }
      });
      console.log('✅ Created billing usage');
    }

    // Create some activity logs
    const recentActivities = [
      {
        userId: user.id,
        type: 'API_KEY_CREATED',
        title: 'API Key Created',
        description: 'Created new API key for production environment',
        metadata: { keyName: 'Production Key' },
      },
      {
        userId: user.id,
        type: 'SUBSCRIPTION_RENEWED',
        title: 'Subscription Renewed',
        description: 'Professional plan renewed successfully',
        metadata: { plan: 'PROFESSIONAL' },
      },
      {
        userId: user.id,
        type: 'RATE_LIMIT_WARNING',
        title: 'Rate Limit Warning',
        description: 'API key approaching rate limit (85% used)',
        metadata: { usage: 850, limit: 1000 },
      }
    ];

    for (const activity of recentActivities) {
      const exists = await prisma.auditLog.findFirst({
        where: {
          userId: user.id,
          action: activity.type,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });

      if (!exists) {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            organizationId: org.id,
            action: activity.type,
            details: activity.description,
            ipAddress: '127.0.0.1',
            userAgent: 'seed-script',
          }
        });
      }
    }
    console.log('✅ Created activity logs');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📝 Test credentials:');
    console.log('   Email: test@n0de.pro');
    console.log('   Password: testpassword123');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });