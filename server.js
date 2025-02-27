require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Client } = require('@elastic/elasticsearch');
const imaps = require('imap-simple');
const axios = require('axios');

// Validate required environment variables
if (!process.env.IMAP_USER || !process.env.IMAP_PASSWORD || !process.env.SLACK_WEBHOOK_URL || !process.env.HUGGINGFACE_API_KEY) {
  console.error("ERROR: IMAP_USER, IMAP_PASSWORD, SLACK_WEBHOOK_URL, or HUGGINGFACE_API_KEY is not set in .env file.");
  process.exit(1);
}

// Initialize Express app
const app = express();
app.use(express.json()); // Enable JSON parsing for requests

// Enable CORS
app.use(cors({
  origin: 'http://localhost:3001',  // Replace with your frontend URL
}));

// Elasticsearch client setup
const esClient = new Client({ node: 'http://localhost:9200' });

// IMAP server configuration
const imapConfig = {
  imap: {
    user: process.env.IMAP_USER,
    password: process.env.IMAP_PASSWORD,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    authTimeout: 10000,
  },
};

// Function to send Slack notifications
async function sendSlackNotification(message) {
  try {
    await axios.post(process.env.SLACK_WEBHOOK_URL, { text: message });
    console.log("✅ Slack notification sent!");
  } catch (error) {
    console.error("❌ Error sending Slack notification:", error);
  }
}

// Hugging Face functions

// Function to categorize email using Hugging Face API (text classification)
async function categorizeEmail(text) {
  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/distilbert-base-uncased',
      { inputs: text },
      {
        headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` },
      }
    );

    return response.data[0].label;  // Return the categorized label (e.g., "Work", "Spam", etc.)
  } catch (error) {
    console.error('❌ Error categorizing email:', error);
    return 'Uncategorized';
  }
}

// Function to generate suggested reply using Hugging Face API (text generation)
async function generateReply(emailText) {
  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
      { inputs: emailText },
      {
        headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` },
      }
    );

    return response.data.generated_text;  // Return the generated reply
  } catch (error) {
    console.error('❌ Error generating reply:', error);
    return 'Sorry, I couldn’t generate a reply at the moment.';
  }
}

// Function to sync emails from IMAP to Elasticsearch
async function syncEmails() {
  let connection;
  try {
    connection = await imaps.connect(imapConfig);
    await connection.openBox('INBOX');
    const searchCriteria = ['UNSEEN'];
    const fetchOptions = { bodies: ['HEADER.FIELDS (FROM SUBJECT DATE)', 'TEXT'], struct: true };
    const messages = await connection.search(searchCriteria, fetchOptions);

    for (const message of messages) {
      const subject = message.parts.find(part => part.which === 'HEADER.FIELDS (FROM SUBJECT DATE)')?.body.subject[0] || 'No Subject';
      const text = message.parts.find(part => part.which === 'TEXT')?.body || '';

      // Categorize email using Hugging Face model
      const category = await categorizeEmail(text);

      // Generate suggested reply using Hugging Face model
      const reply = await generateReply(text);

      await esClient.index({
        index: 'emails',
        body: {
          subject,
          text,
          from: message.parts.find(part => part.which === 'HEADER.FIELDS (FROM SUBJECT DATE)')?.body.from[0] || 'Unknown Sender',
          category,
          reply,  // Include generated reply
          timestamp: new Date(),
        },
      });

      console.log(`✅ Indexed email: "${subject}" | Category: ${category} | Reply: ${reply}`);

      // Send Slack notification
      await sendSlackNotification(`📩 New Email Indexed\n🔹 *Subject:* ${subject}\n🔹 *Category:* ${category}\n🔹 *Suggested Reply:* ${reply}`);
    }

  } catch (error) {
    console.error('❌ Error syncing emails:', error);
  } finally {
    if (connection) {
      connection.end();
    }
  }
}

// Sync emails every 30 seconds
setInterval(syncEmails, 30000);

// Welcome route
app.get('/', (req, res) => {
  res.send('Welcome to the Email Sync Service!');
});

// Health check route
app.get('/health', async (req, res) => {
  try {
    const esHealth = await esClient.cluster.health();
    res.json({ status: 'running', elasticsearch: esHealth.status });
  } catch (error) {
    res.status(500).json({ error: 'Elasticsearch is unreachable' });
  }
});

// Search route
app.post('/search', async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  try {
    const result = await esClient.search({
      index: 'emails',
      body: {
        query: {
          match: { text: query },
        },
      },
    });

    res.json(result.hits.hits);
  } catch (error) {
    console.error('❌ Elasticsearch search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.message);
  res.status(500).json({ error: err.message });
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
