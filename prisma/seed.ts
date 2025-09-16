import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create demo user
  const demoUserEmail = 'demo@n0de.com';
  const demoPassword = 'Demo123!@#';
  const hashedPassword = await bcrypt.hash(demoPassword, 12);

  const demoUser = await prisma.user.upsert({
    where: { email: demoUserEmail },
    update: {},
    create: {
      email: demoUserEmail,
      passwordHash: hashedPassword,
      firstName: 'Demo',
      lastName: 'User',
      username: 'demouser',
      emailVerified: true,
      isActive: true,
    },
  });

  console.log('✅ Created demo user:', demoUser.email);

  // Create demo API key
  const apiKeyHash = await bcrypt.hash('n0de_test_demo123456789abcdef', 10);
  
  const demoApiKey = await prisma.apiKey.upsert({
    where: { keyHash: apiKeyHash },
    update: {},
    create: {
      userId: demoUser.id,
      name: 'Demo API Key',
      keyHash: apiKeyHash,
      keyPreview: 'n0de_test_demo123...',
      permissions: ['read', 'write'],
      rateLimit: 1000,
      isActive: true,
    },
  });

  console.log('✅ Created demo API key:', demoApiKey.name);

  // Create RPC nodes
  const rpcNodes = [
    {
      name: 'Frankfurt Mainnet',
      region: 'frankfurt',
      endpoint: 'https://api.mainnet-beta.solana.com',
      network: 'mainnet',
      isActive: true,
      priority: 1,
      maxRps: 5000,
      avgLatency: 8.2,
      uptime: 99.99,
    },
    {
      name: 'Amsterdam Mainnet',
      region: 'amsterdam',
      endpoint: 'https://api.mainnet-beta.solana.com',
      network: 'mainnet',
      isActive: true,
      priority: 2,
      maxRps: 4000,
      avgLatency: 12.1,
      uptime: 99.95,
    },
    {
      name: 'North America Mainnet',
      region: 'north-america',
      endpoint: 'https://api.mainnet-beta.solana.com',
      network: 'mainnet',
      isActive: true,
      priority: 3,
      maxRps: 6000,
      avgLatency: 15.3,
      uptime: 99.97,
    },
  ];

  for (const node of rpcNodes) {
    const created = await prisma.rpcNode.upsert({
      where: { endpoint: node.endpoint + '_' + node.region },
      update: {},
      create: node,
    });
    console.log('✅ Created RPC node:', created.name);
  }

  // Create sample usage stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let hour = 0; hour < 24; hour++) {
    await prisma.usageStats.upsert({
      where: {
        userId_apiKeyId_date_hour_region_endpoint: {
          userId: demoUser.id,
          apiKeyId: demoApiKey.id,
          date: today,
          hour: hour,
          region: 'frankfurt',
          endpoint: 'getAccountInfo',
        },
      },
      update: {},
      create: {
        userId: demoUser.id,
        apiKeyId: demoApiKey.id,
        date: today,
        hour: hour,
        requestCount: Math.floor(Math.random() * 100) + 50,
        successCount: Math.floor(Math.random() * 95) + 45,
        errorCount: Math.floor(Math.random() * 5),
        avgLatency: Math.random() * 10 + 8,
        totalLatency: Math.random() * 1000 + 500,
        bytesTransferred: Math.floor(Math.random() * 1000000) + 500000,
        uniqueIPs: Math.floor(Math.random() * 10) + 1,
        region: 'frankfurt',
        endpoint: 'getAccountInfo',
      },
    });
  }

  console.log('✅ Created sample usage stats');

  // Create sample system metrics
  const now = new Date();
  const metricsTypes = ['latency', 'uptime', 'throughput', 'error_rate'];
  const regions = ['frankfurt', 'amsterdam', 'north-america'];

  for (const metricType of metricsTypes) {
    for (const region of regions) {
      let value: number;
      let unit: string;

      switch (metricType) {
        case 'latency':
          value = Math.random() * 20 + 8;
          unit = 'ms';
          break;
        case 'uptime':
          value = 99.9 + Math.random() * 0.09;
          unit = 'percent';
          break;
        case 'throughput':
          value = Math.random() * 10000 + 5000;
          unit = 'rps';
          break;
        case 'error_rate':
          value = Math.random() * 0.1;
          unit = 'percent';
          break;
        default:
          value = 0;
          unit = 'unknown';
      }

      await prisma.systemMetrics.create({
        data: {
          metricType,
          region,
          value,
          unit,
          timestamp: now,
          metadata: {
            source: 'seed',
            environment: 'demo',
          },
        },
      });
    }
  }

  console.log('✅ Created sample system metrics');
  console.log('🎉 Database seed completed successfully!');
  console.log('');
  console.log('Demo credentials:');
  console.log('Email:', demoUserEmail);
  console.log('Password:', demoPassword);
  console.log('API Key: n0de_test_demo123456789abcdef');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });