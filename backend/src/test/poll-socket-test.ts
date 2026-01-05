/**
 * Test script for poll window Socket.IO integration
 * Tests poll room subscription and vote update events
 * 
 * Note: This is an optional test file. socket.io-client is not installed in backend.
 * To use this test, install: npm install --save-dev socket.io-client @types/socket.io-client
 */

// Uncomment these imports after installing socket.io-client
// import { io, Socket } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:3000';

// Test configuration
const TEST_SESSION_ID = 'test-session-123';
const TEST_POLL_ID = 'test-poll-456';

// let socket: Socket;

async function testPollRoomSubscription() {
  console.log('\n=== Testing Poll Room Subscription ===\n');
  console.log('NOTE: This test requires socket.io-client to be installed.');
  console.log('Run: npm install --save-dev socket.io-client @types/socket.io-client');
  console.log('\nAlternatively, test using the frontend application directly.');
  
  /* Uncomment this code after installing dependencies:
  
  // Connect to Socket.IO server
  console.log(`Connecting to ${BACKEND_URL}...`);
  socket = io(BACKEND_URL, {
    query: {
      sessionId: TEST_SESSION_ID
    },
    transports: ['websocket', 'polling']
  });

  // Handle connection events
  socket.on('connect', () => {
    console.log(`✓ Connected: socket ID = ${socket.id}`);
    
    // Subscribe to poll room
    console.log(`\nSubscribing to poll room: poll:${TEST_POLL_ID}`);
    socket.emit('poll:subscribe', { pollId: TEST_POLL_ID });
  });

  socket.on('connect_error', (error: Error) => {
    console.error('✗ Connection error:', error.message);
  });

  socket.on('connection:error', (data: any) => {
    console.error('✗ Connection error from server:', data);
  });

  // Handle subscription responses
  socket.on('poll:subscribe:success', (data: any) => {
    console.log('✓ Poll subscription successful:', data);
    console.log('\nListening for poll events...');
    console.log('(Waiting for vote submissions...)');
  });

  socket.on('poll:subscribe:error', (data: any) => {
    console.error('✗ Poll subscription failed:', data);
  });

  // Listen for poll-specific events
  socket.on(`poll:${TEST_POLL_ID}:vote-submitted`, (data: any) => {
    console.log('\n📊 Vote submitted event received:');
    console.log('  Poll ID:', data.pollId);
    console.log('  Option ID:', data.optionId);
    console.log('  New Vote Count:', data.newVoteCount);
    console.log('  Timestamp:', data.timestamp);
  });

  socket.on(`poll:${TEST_POLL_ID}:updated`, (data: any) => {
    console.log('\n📝 Poll updated event received:');
    console.log('  Poll ID:', data.pollId);
    console.log('  Status:', data.status || 'unknown');
    console.log('  Timestamp:', data.timestamp);
  });

  socket.on(`poll:${TEST_POLL_ID}:deleted`, (data: any) => {
    console.log('\n🗑️  Poll deleted event received:');
    console.log('  Poll ID:', data.pollId);
    console.log('  Timestamp:', data.timestamp);
  });

  // Handle disconnect
  socket.on('disconnect', (reason: string) => {
    console.log(`\nDisconnected: ${reason}`);
  });

  // Keep the connection alive
  console.log('\nPress Ctrl+C to exit\n');
  */
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  
  /* Uncomment after installing dependencies:
  if (socket && socket.connected) {
    console.log('Unsubscribing and disconnecting...');
    socket.emit('poll:unsubscribe', { pollId: TEST_POLL_ID });
    socket.disconnect();
  }
  */
  
  process.exit(0);
});

// Run the test
testPollRoomSubscription().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});

// Instructions
console.log('===========================================');
console.log('  Poll Window Socket.IO Integration Test  ');
console.log('===========================================');
console.log('\nThis script tests the Socket.IO integration for interactive poll windows.');
console.log('\nPrerequisites:');
console.log('  1. Backend server running on http://localhost:3000');
console.log('  2. A session and poll created in the database');
console.log('  3. Install socket.io-client: npm install --save-dev socket.io-client @types/socket.io-client');
console.log('\nInstructions:');
console.log('  1. Update TEST_SESSION_ID and TEST_POLL_ID with real IDs');
console.log('  2. Uncomment the code in this file');
console.log('  3. Run this script: npx ts-node src/test/poll-socket-test.ts');
console.log('  4. Submit votes through the frontend or API');
console.log('  5. Watch for real-time events in this console');
console.log('\n===========================================\n');
