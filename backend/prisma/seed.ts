/**
 * Database Seeding Script
 * 
 * Creates sample data for development and testing:
 * - Sample sessions with different states
 * - Polls with various types and states
 * - Poll options
 * - Participants
 * - Sample votes
 * 
 * Usage: npx prisma db seed
 */

import { PrismaClient, SessionStatus, PollType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean existing data (in development only!)
  if (process.env.NODE_ENV !== 'production') {
    console.log('🧹 Cleaning existing data...');
    await prisma.vote.deleteMany();
    await prisma.participant.deleteMany();
    await prisma.pollOption.deleteMany();
    await prisma.poll.deleteMany();
    await prisma.session.deleteMany();
    console.log('✓ Cleaned existing data');
  }

  // Create Session 1: Active session with multiple polls
  console.log('\n📊 Creating Session 1 (Active)...');
  const session1 = await prisma.session.create({
    data: {
      code: 'ABC123',
      presenterName: 'John Doe',
      status: SessionStatus.ACTIVE,
      startedAt: new Date(Date.now() - 30 * 60 * 1000), // Started 30 min ago
    },
  });
  console.log(`✓ Created session: ${session1.code} (${session1.status})`);

  // Create participants for Session 1
  console.log('👥 Creating participants for Session 1...');
  const participant1 = await prisma.participant.create({
    data: {
      sessionId: session1.id,
      displayName: 'Alice Johnson',
      joinedAt: new Date(Date.now() - 25 * 60 * 1000),
    },
  });

  const participant2 = await prisma.participant.create({
    data: {
      sessionId: session1.id,
      displayName: 'Bob Smith',
      joinedAt: new Date(Date.now() - 20 * 60 * 1000),
    },
  });

  const participant3 = await prisma.participant.create({
    data: {
      sessionId: session1.id,
      displayName: 'Carol Williams',
      joinedAt: new Date(Date.now() - 15 * 60 * 1000),
    },
  });

  const participant4 = await prisma.participant.create({
    data: {
      sessionId: session1.id,
      displayName: 'David Brown',
      joinedAt: new Date(Date.now() - 10 * 60 * 1000),
    },
  });

  console.log(`✓ Created ${4} participants`);

  // Poll 1: Closed multiple choice poll
  console.log('📋 Creating Poll 1 (Closed)...');
  const poll1 = await prisma.poll.create({
    data: {
      sessionId: session1.id,
      question: 'What is your preferred programming language?',
      pollType: PollType.MULTIPLE_CHOICE,
      allowMultiple: false,
      isAnonymous: false,
      sequenceOrder: 1,
      createdAt: new Date(Date.now() - 20 * 60 * 1000),
      closedAt: new Date(Date.now() - 10 * 60 * 1000),
      options: {
        create: [
          { optionText: 'JavaScript/TypeScript', sequenceOrder: 1 },
          { optionText: 'Python', sequenceOrder: 2 },
          { optionText: 'Java', sequenceOrder: 3 },
          { optionText: 'C#', sequenceOrder: 4 },
          { optionText: 'Go', sequenceOrder: 5 },
        ],
      },
    },
    include: { options: true },
  });
  console.log(`✓ Created poll: "${poll1.question}" with ${poll1.options.length} options`);

  // Add votes for Poll 1
  console.log('🗳️  Adding votes for Poll 1...');
  await prisma.vote.create({
    data: {
      pollId: poll1.id,
      participantId: participant1.id,
      optionId: poll1.options[0].id, // JavaScript/TypeScript
      submittedAt: new Date(Date.now() - 15 * 60 * 1000),
    },
  });

  await prisma.vote.create({
    data: {
      pollId: poll1.id,
      participantId: participant2.id,
      optionId: poll1.options[1].id, // Python
      submittedAt: new Date(Date.now() - 14 * 60 * 1000),
    },
  });

  await prisma.vote.create({
    data: {
      pollId: poll1.id,
      participantId: participant3.id,
      optionId: poll1.options[0].id, // JavaScript/TypeScript
      submittedAt: new Date(Date.now() - 13 * 60 * 1000),
    },
  });

  await prisma.vote.create({
    data: {
      pollId: poll1.id,
      participantId: participant4.id,
      optionId: poll1.options[2].id, // Java
      submittedAt: new Date(Date.now() - 12 * 60 * 1000),
    },
  });

  console.log('✓ Added 4 votes');

  // Poll 2: Active multiple choice poll (currently accepting votes)
  console.log('📋 Creating Poll 2 (Active)...');
  const poll2 = await prisma.poll.create({
    data: {
      sessionId: session1.id,
      question: 'Which framework do you prefer for web development?',
      pollType: PollType.MULTIPLE_CHOICE,
      allowMultiple: true,
      isAnonymous: true,
      sequenceOrder: 2,
      createdAt: new Date(Date.now() - 5 * 60 * 1000),
      options: {
        create: [
          { optionText: 'React', sequenceOrder: 1 },
          { optionText: 'Vue.js', sequenceOrder: 2 },
          { optionText: 'Angular', sequenceOrder: 3 },
          { optionText: 'Svelte', sequenceOrder: 4 },
          { optionText: 'Next.js', sequenceOrder: 5 },
        ],
      },
    },
    include: { options: true },
  });
  console.log(`✓ Created poll: "${poll2.question}" with ${poll2.options.length} options`);

  // Add some votes for Poll 2 (still active)
  console.log('🗳️  Adding votes for Poll 2...');
  await prisma.vote.create({
    data: {
      pollId: poll2.id,
      participantId: participant1.id,
      optionId: poll2.options[0].id, // React
      submittedAt: new Date(Date.now() - 3 * 60 * 1000),
    },
  });

  await prisma.vote.create({
    data: {
      pollId: poll2.id,
      participantId: participant2.id,
      optionId: poll2.options[4].id, // Next.js
      submittedAt: new Date(Date.now() - 2 * 60 * 1000),
    },
  });

  console.log('✓ Added 2 votes (poll still active)');

  // Poll 3: Rating scale poll (not yet closed)
  console.log('📋 Creating Poll 3 (Rating Scale)...');
  const poll3 = await prisma.poll.create({
    data: {
      sessionId: session1.id,
      question: 'How would you rate your experience with live polling?',
      pollType: PollType.RATING_SCALE,
      allowMultiple: false,
      isAnonymous: true,
      minRating: 1,
      maxRating: 5,
      sequenceOrder: 3,
      createdAt: new Date(Date.now() - 2 * 60 * 1000),
    },
  });
  console.log(`✓ Created rating poll: "${poll3.question}"`);

  // Add rating votes
  console.log('🗳️  Adding rating votes...');
  await prisma.vote.create({
    data: {
      pollId: poll3.id,
      participantId: participant1.id,
      ratingValue: 5,
      submittedAt: new Date(Date.now() - 1 * 60 * 1000),
    },
  });

  await prisma.vote.create({
    data: {
      pollId: poll3.id,
      participantId: participant3.id,
      ratingValue: 4,
      submittedAt: new Date(Date.now() - 30 * 1000),
    },
  });

  console.log('✓ Added 2 rating votes');

  // Create Session 2: Pending session (not started yet)
  console.log('\n📊 Creating Session 2 (Pending)...');
  const session2 = await prisma.session.create({
    data: {
      code: 'XYZ789',
      presenterName: 'Jane Smith',
      status: SessionStatus.PENDING,
    },
  });
  console.log(`✓ Created session: ${session2.code} (${session2.status})`);

  // Create a draft poll for Session 2
  console.log('📋 Creating draft poll for Session 2...');
  const poll4 = await prisma.poll.create({
    data: {
      sessionId: session2.id,
      question: 'What topic should we cover in the next session?',
      pollType: PollType.MULTIPLE_CHOICE,
      allowMultiple: false,
      isAnonymous: true,
      sequenceOrder: 1,
      options: {
        create: [
          { optionText: 'Microservices Architecture', sequenceOrder: 1 },
          { optionText: 'Database Optimization', sequenceOrder: 2 },
          { optionText: 'Cloud Computing', sequenceOrder: 3 },
          { optionText: 'DevOps Best Practices', sequenceOrder: 4 },
        ],
      },
    },
    include: { options: true },
  });
  console.log(`✓ Created draft poll: "${poll4.question}"`);

  // Create Session 3: Ended session
  console.log('\n📊 Creating Session 3 (Ended)...');
  const session3 = await prisma.session.create({
    data: {
      code: 'DEF456',
      presenterName: 'Mike Johnson',
      status: SessionStatus.ENDED,
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // Started 2 hours ago
      endedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // Ended 1 hour ago
    },
  });
  console.log(`✓ Created session: ${session3.code} (${session3.status})`);

  // Create participant for Session 3
  const participant5 = await prisma.participant.create({
    data: {
      sessionId: session3.id,
      displayName: 'Emily Davis',
      joinedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  });

  // Create closed poll for Session 3
  const poll5 = await prisma.poll.create({
    data: {
      sessionId: session3.id,
      question: 'Was this session helpful?',
      pollType: PollType.MULTIPLE_CHOICE,
      allowMultiple: false,
      isAnonymous: true,
      sequenceOrder: 1,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      closedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      options: {
        create: [
          { optionText: 'Very Helpful', sequenceOrder: 1 },
          { optionText: 'Somewhat Helpful', sequenceOrder: 2 },
          { optionText: 'Not Helpful', sequenceOrder: 3 },
        ],
      },
    },
    include: { options: true },
  });

  await prisma.vote.create({
    data: {
      pollId: poll5.id,
      participantId: participant5.id,
      optionId: poll5.options[0].id,
      submittedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
    },
  });

  console.log(`✓ Created poll with vote for ended session`);

  // Summary
  console.log('\n✅ Seeding completed successfully!');
  console.log('\n📊 Database Summary:');
  const sessionCount = await prisma.session.count();
  const pollCount = await prisma.poll.count();
  const participantCount = await prisma.participant.count();
  const voteCount = await prisma.vote.count();
  const optionCount = await prisma.pollOption.count();

  console.log(`   Sessions: ${sessionCount}`);
  console.log(`   Polls: ${pollCount}`);
  console.log(`   Poll Options: ${optionCount}`);
  console.log(`   Participants: ${participantCount}`);
  console.log(`   Votes: ${voteCount}`);

  console.log('\n🎯 Test Data:');
  console.log(`   Active Session: ${session1.code}`);
  console.log(`   Pending Session: ${session2.code}`);
  console.log(`   Ended Session: ${session3.code}`);
  console.log('\n💡 You can now test the application with realistic data!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
