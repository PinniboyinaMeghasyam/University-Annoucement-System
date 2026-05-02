// Simple Node.js script to test the messaging API endpoint using built-in modules
const https = require('https');
const http = require('http');
const url = require('url');

function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });
    
    req.on('error', (e) => {
      reject(e);
    });
    
    req.end();
  });
}

async function testMessagingAPI() {
  try {
    console.log('Testing /api/users/messaging endpoint...\n');
    
    // Parse the URL
    const parsedUrl = new URL('http://localhost:5001/api/users/messaging');
    
    // Make request without authentication first to see what happens
    console.log('1. Testing without authentication:');
    try {
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname,
        method: 'GET'
      };
      
      const response1 = await makeRequest(options);
      console.log('   Status:', response1.statusCode);
      console.log('   Data:', response1.data);
    } catch (error) {
      console.log('   Error:', error.message);
    }
    
    console.log('\n2. Testing with a fake token:');
    try {
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname,
        method: 'GET',
        headers: {
          'Authorization': 'Bearer fake-token'
        }
      };
      
      const response2 = await makeRequest(options);
      console.log('   Status:', response2.statusCode);
      console.log('   Data:', response2.data);
    } catch (error) {
      console.log('   Error:', error.message);
    }
    
    console.log('\nTest completed.');
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

testMessagingAPI();