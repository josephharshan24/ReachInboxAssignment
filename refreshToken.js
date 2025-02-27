const { google } = require("googleapis");
require("dotenv").config();

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

// Function to get a new access token
async function getAccessToken() {
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    console.log("Access Token:", credentials.access_token);
  } catch (error) {
    console.error("Error refreshing access token:", error.message);
  }
}

getAccessToken();
