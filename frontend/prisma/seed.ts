import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding PV3 production database...');

  // Create initial tournament
  const tournament = await prisma.tournament.upsert({
    where: { id: 'pv3-championship-1' },
    update: {},
    create: {
      id: 'pv3-championship-1',
      name: '🏆 PV3 Championship',
      description: 'Join the ultimate Solana gaming championship! Compete in multiple games, climb the leaderboard, and win your share of the massive prize pool.',
      prizePool: 500.0,
      maxPlayers: 1000,
      gameType: 'mixed',
      entryFee: 0.5,
      startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'upcoming',
    },
  });

  // Create initial leaderboards
  const leaderboards = [
    {
      type: 'earnings',
      period: 'alltime',
      data: [],
    },
    {
      type: 'wins', 
      period: 'alltime',
      data: [],
    },
    {
      type: 'winrate',
      period: 'alltime', 
      data: [],
    },
    {
      type: 'earnings',
      period: 'daily',
      data: [],
    },
    {
      type: 'earnings',
      period: 'weekly',
      data: [],
    },
    {
      type: 'earnings',
      period: 'monthly',
      data: [],
    },
  ];

  for (const leaderboard of leaderboards) {
    await prisma.leaderboard.upsert({
      where: {
        type_period: {
          type: leaderboard.type,
          period: leaderboard.period,
        },
      },
      update: {},
      create: leaderboard,
    });
  }

  // Create system analytics entries
  const analyticsEntries = [
    {
      type: 'revenue',
      period: 'daily',
      data: { totalRevenue: 0, matches: 0, fees: 0 },
    },
    {
      type: 'users',
      period: 'daily',
      data: { activeUsers: 0, newUsers: 0, totalUsers: 0 },
    },
    {
      type: 'matches',
      period: 'daily',
      data: { totalMatches: 0, completedMatches: 0, averageWager: 0 },
    },
  ];

  for (const analytics of analyticsEntries) {
    await prisma.analytics.create({
      data: analytics,
    });
  }

  console.log('✅ Seeding completed!');
  console.log(`📊 Created tournament: ${tournament.name}`);
  console.log(`📈 Created ${leaderboards.length} leaderboard types`);
  console.log(`📊 Created ${analyticsEntries.length} analytics entries`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  }); 