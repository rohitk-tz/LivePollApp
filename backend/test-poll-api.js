const http = require('http');

const pollId = '7f93d6f9-226a-4815-b4bd-d3e9218f710b'; // Active poll: "abc"

const options = {
  hostname: 'localhost',
  port: 3000,
  path: `/polls/${pollId}`,
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log(`Testing API endpoint: http://localhost:3000/polls/${pollId}\n`);

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    console.log(`\nResponse Body:`);
    
    try {
      const jsonData = JSON.parse(data);
      console.log(JSON.stringify(jsonData, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error(`Error: ${error.message}`);
  console.log('\n⚠️  Make sure the backend server is running on port 3000!');
  console.log('   Run: cd backend && npm run dev');
});

req.end();
