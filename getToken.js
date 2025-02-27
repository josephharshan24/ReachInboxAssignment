require('dotenv').config();

const { google } = require('googleapis');
require('dotenv').config();
const readline = require('readline');

// Ensure environment variables are loaded
if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.REDIRECT_URI) {
    console.error("Missing required environment variables. Check your .env file.");
    process.exit(1);
}

// Create OAuth2 client
const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
);

// Generate auth URL
const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://mail.google.com/'],
    prompt: 'consent',
});

console.log('Authorize this app by visiting this URL:', authUrl);

// Create interface to accept user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oauth2Client.getToken(code, (err, tokens) => {
        if (err) {
            console.error('Error retrieving access token:', err);
            return;
        }
        console.log('Access Token:', tokens.access_token);
        console.log('Refresh Token:', tokens.refresh_token);
    });
});
