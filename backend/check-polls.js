const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPolls() {
  try {
    const polls = await prisma.poll.findMany({
      include: {
        options: true
      }
    });
    
    console.log(`Total polls in database: ${polls.length}`);
    
    if (polls.length > 0) {
      console.log('\nPolls:');
      polls.forEach((poll, index) => {
        console.log(`${index + 1}. ID: ${poll.id}`);
        console.log(`   Question: ${poll.question}`);
        console.log(`   Status: ${poll.status}`);
        console.log(`   Options: ${poll.options.length}`);
      });
    } else {
      console.log('\n⚠️  No polls found in database!');
      console.log('Please create a session and add polls first.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkPolls();
