const axios = require('axios');

// Test the messaging users API endpoint
async function testMessagingUsers() {
  try {
    console.log('Testing messaging users API endpoint...');
    
    // Replace with a valid token from your logged in user
    const token = 'YOUR_JWT_TOKEN_HERE'; // You'll need to get this from your browser's localStorage after logging in
    
    const response = await axios.get('http://localhost:5001/api/users/messaging', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Users data:', response.data);
    
    if (response.data && response.data.users) {
      console.log(`Found ${response.data.users.length} messaging users:`);
      response.data.users.forEach(user => {
        console.log(`- ${user.name} (${user.role})`);
      });
    }
  } catch (error) {
    console.error('API test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testMessagingUsers();