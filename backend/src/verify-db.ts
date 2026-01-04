import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyDatabase() {
  try {
    console.log('Testing database connection...\n');
    
    // Test each table
    const sessionCount = await prisma.session.count();
    const participantCount = await prisma.participant.count();
    const pollCount = await prisma.poll.count();
    const pollOptionCount = await prisma.pollOption.count();
    const voteCount = await prisma.vote.count();
    
    console.log('✓ Database Connection: SUCCESS\n');
    console.log('Tables verified:');
    console.log(`  - sessions: ${sessionCount} records`);
    console.log(`  - participants: ${participantCount} records`);
    console.log(`  - polls: ${pollCount} records`);
    console.log(`  - poll_options: ${pollOptionCount} records`);
    console.log(`  - votes: ${voteCount} records`);
    console.log('\nAll tables exist and are accessible!');
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('✗ Database Connection: FAILED');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    await prisma.$disconnect();
    process.exit(1);
  }
}

verifyDatabase();
