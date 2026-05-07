let dotenv;
try {
  dotenv = await import('dotenv');
  dotenv.config();
} catch (err) {
  console.error('⚠️  dotenv package not installed. Run `npm install` in server folder.');
  process.exit(1);
}

console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY);
console.log('Length:', process.env.GEMINI_API_KEY?.length);
console.log('First 10 chars:', process.env.GEMINI_API_KEY?.substring(0, 10));

// Test fetch
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${process.env.GEMINI_API_KEY}`;

console.log('\nTesting fetch...');
fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    contents: [{
      parts: [{
        text: 'Say hello'
      }]
    }]
  })
})
.then(res => res.json())
.then(data => {
  console.log('✅ Success!');
  console.log('Response:', JSON.stringify(data, null, 2).substring(0, 500));
})
.catch(err => {
  console.error('❌ Error:', err.message);
});
