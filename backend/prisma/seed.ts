import { PrismaClient, GroupRole, StatsContext, MatchDayStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';

config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Find or create group
  let group = await prisma.group.findFirst({
    include: { memberships: true, teams: true },
  });

  if (!group) {
    const passwordHash = await bcrypt.hash('123456', 10);
    const orgUser = await prisma.user.upsert({
      where: { email: 'organizador@futsal.test' },
      update: {},
      create: {
        email: 'organizador@futsal.test',
        passwordHash,
        displayName: 'Organizador Master',
      },
    });

    group = await prisma.group.create({
      data: {
        name: 'Futbol Miercoles',
        inviteCode: 'MIERCOLES-5X5',
        recurrenceDay: 3, // Wednesday
        memberships: {
          create: {
            userId: orgUser.id,
            role: GroupRole.ORGANIZER,
          },
        },
      },
      include: { memberships: true, teams: true },
    });
    console.log(`✅ Created group: ${group.name} (${group.inviteCode})`);
  } else {
    console.log(`ℹ️ Using existing group: ${group.name} (${group.id})`);
  }

  // 2. Create Teams
  const teamsData = [
    { name: 'Los Galácticos', color: '#4ADE80' },
    { name: 'Inter de Mitre', color: '#60A5FA' },
    { name: 'La Máquina', color: '#FB923C' },
  ];

  const teams: any[] = [];
  for (const t of teamsData) {
    const team = await prisma.team.upsert({
      where: { groupId_name: { groupId: group.id, name: t.name } },
      update: { color: t.color },
      create: {
        groupId: group.id,
        name: t.name,
        color: t.color,
      },
    });
    teams.push(team);
  }
  console.log(`✅ ${teams.length} teams configured`);

  // 3. Create Sample Players
  const passwordHash = await bcrypt.hash('123456', 10);
  const sampleUsers = [
    { email: 'pelusa@futsal.test', displayName: 'El Pelusa ⚽', teamIndex: 0, role: GroupRole.CAPTAIN },
    { email: 'tanque@futsal.test', displayName: 'El Tanque 🚀', teamIndex: 0, role: GroupRole.PLAYER },
    { email: 'mago@futsal.test', displayName: 'El Mago 🪄', teamIndex: 1, role: GroupRole.CAPTAIN },
    { email: 'rayo@futsal.test', displayName: 'El Rayo ⚡', teamIndex: 1, role: GroupRole.PLAYER },
    { email: 'matador@futsal.test', displayName: 'El Matador 🎯', teamIndex: 2, role: GroupRole.CAPTAIN },
    { email: 'muralla@futsal.test', displayName: 'La Muralla 🧱', teamIndex: 2, role: GroupRole.PLAYER },
  ];

  const players: any[] = [];
  for (const p of sampleUsers) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: { displayName: p.displayName },
      create: {
        email: p.email,
        passwordHash,
        displayName: p.displayName,
      },
    });

    const targetTeam = teams[p.teamIndex];
    await prisma.membership.upsert({
      where: { userId_groupId: { userId: user.id, groupId: group.id } },
      update: { teamId: targetTeam.id, role: p.role },
      create: {
        userId: user.id,
        groupId: group.id,
        teamId: targetTeam.id,
        role: p.role,
      },
    });

    players.push({ user, team: targetTeam });
  }
  console.log(`✅ ${players.length} players seeded and assigned to teams`);

  // 4. Create MatchDays
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 7);
  pastDate.setHours(20, 0, 0, 0);

  const todayDate = new Date();
  todayDate.setHours(20, 0, 0, 0);

  const md1 = await prisma.matchDay.upsert({
    where: { groupId_date: { groupId: group.id, date: pastDate } },
    update: { status: MatchDayStatus.COMPLETED },
    create: {
      groupId: group.id,
      label: 'Jornada 1 - Miércoles Pasado',
      date: pastDate,
      status: MatchDayStatus.COMPLETED,
    },
  });

  const md2 = await prisma.matchDay.upsert({
    where: { groupId_date: { groupId: group.id, date: todayDate } },
    update: { status: MatchDayStatus.ACTIVE },
    create: {
      groupId: group.id,
      label: 'Jornada 2 - Hoy (En Curso)',
      date: todayDate,
      status: MatchDayStatus.ACTIVE,
    },
  });
  console.log('✅ MatchDays configured (1 Completed, 1 Active)');

  // 5. Seed Stats for MatchDay 1 (Completed)
  const statsMd1 = [
    // Pelusa (Los Galacticos)
    { playerIdx: 0, context: StatsContext.TEAM, goals: 3, assists: 1, missedGoals: 1, ownGoals: 0, ballsOut: 1 },
    { playerIdx: 0, context: StatsContext.OTHER, goals: 2, assists: 1, missedGoals: 0, ownGoals: 0, ballsOut: 0 },
    // Tanque (Los Galacticos)
    { playerIdx: 1, context: StatsContext.TEAM, goals: 2, assists: 0, missedGoals: 3, ownGoals: 0, ballsOut: 4 },
    // Mago (Inter de Mitre)
    { playerIdx: 2, context: StatsContext.TEAM, goals: 1, assists: 4, missedGoals: 0, ownGoals: 0, ballsOut: 1 },
    // Rayo (Inter de Mitre)
    { playerIdx: 3, context: StatsContext.TEAM, goals: 1, assists: 1, missedGoals: 2, ownGoals: 1, ballsOut: 3 },
    { playerIdx: 3, context: StatsContext.OTHER, goals: 1, assists: 0, missedGoals: 1, ownGoals: 0, ballsOut: 2 },
    // Matador (La Maquina)
    { playerIdx: 4, context: StatsContext.TEAM, goals: 3, assists: 0, missedGoals: 1, ownGoals: 0, ballsOut: 0 },
    // Muralla (La Maquina)
    { playerIdx: 5, context: StatsContext.TEAM, goals: 0, assists: 1, missedGoals: 0, ownGoals: 2, ballsOut: 3 },
  ];

  for (const s of statsMd1) {
    const p = players[s.playerIdx];
    await prisma.playerMatchStats.upsert({
      where: {
        playerId_matchDayId_context: {
          playerId: p.user.id,
          matchDayId: md1.id,
          context: s.context,
        },
      },
      update: {
        goals: s.goals,
        assists: s.assists,
        missedGoals: s.missedGoals,
        ownGoals: s.ownGoals,
        ballsOut: s.ballsOut,
      },
      create: {
        playerId: p.user.id,
        matchDayId: md1.id,
        teamId: s.context === StatsContext.TEAM ? p.team.id : null,
        context: s.context,
        goals: s.goals,
        assists: s.assists,
        missedGoals: s.missedGoals,
        ownGoals: s.ownGoals,
        ballsOut: s.ballsOut,
      },
    });
  }

  // 6. Seed Stats for MatchDay 2 (Active)
  const statsMd2 = [
    { playerIdx: 0, context: StatsContext.TEAM, goals: 2, assists: 2, missedGoals: 0, ownGoals: 0, ballsOut: 1 },
    { playerIdx: 1, context: StatsContext.TEAM, goals: 1, assists: 0, missedGoals: 2, ownGoals: 0, ballsOut: 3 },
    { playerIdx: 2, context: StatsContext.TEAM, goals: 2, assists: 2, missedGoals: 1, ownGoals: 0, ballsOut: 0 },
    { playerIdx: 4, context: StatsContext.TEAM, goals: 1, assists: 1, missedGoals: 0, ownGoals: 0, ballsOut: 1 },
  ];

  for (const s of statsMd2) {
    const p = players[s.playerIdx];
    await prisma.playerMatchStats.upsert({
      where: {
        playerId_matchDayId_context: {
          playerId: p.user.id,
          matchDayId: md2.id,
          context: s.context,
        },
      },
      update: {
        goals: s.goals,
        assists: s.assists,
        missedGoals: s.missedGoals,
        ownGoals: s.ownGoals,
        ballsOut: s.ballsOut,
      },
      create: {
        playerId: p.user.id,
        matchDayId: md2.id,
        teamId: s.context === StatsContext.TEAM ? p.team.id : null,
        context: s.context,
        goals: s.goals,
        assists: s.assists,
        missedGoals: s.missedGoals,
        ownGoals: s.ownGoals,
        ballsOut: s.ballsOut,
      },
    });
  }

  console.log('✅ Match stats seeded successfully!');
  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
