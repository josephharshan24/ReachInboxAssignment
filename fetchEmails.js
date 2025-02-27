require('dotenv').config(); 
console.log("IMAP_USER:", process.env.IMAP_USER);
console.log("IMAP_PASSWORD:", process.env.IMAP_PASSWORD);
const Imap = require('imap-simple');
const { simpleParser } = require('mailparser');
const { Client } = require('@elastic/elasticsearch');
const { processEmail } = require('./emailProcessor'); // Import email processor

const imapConfig = {
  imap: {
    user: process.env.IMAP_USER,  
    password: process.env.IMAP_PASSWORD,  
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
  },
};


// Connect to Elasticsearch
const esClient = new Client({ node: 'http://localhost:9200' });

async function fetchEmails() {
  try {
    const connection = await Imap.connect(imapConfig);
    await connection.openBox('INBOX');

    const searchCriteria = ['UNSEEN']; // Fetch only unread emails
    const fetchOptions = { bodies: '', struct: true };

    const messages = await connection.search(searchCriteria, fetchOptions);
    console.log(`Fetched ${messages.length} emails.`);

    for (const item of messages) {
      const email = await simpleParser(item.parts[0].body);
      
      // Process email (extract plain text + categorize)
      const processedEmail = processEmail({
        messageId: email.messageId,
        subject: email.subject,
        from: email.from.text,
        to: email.to.text,
        date: email.date,
        body: email.html || email.text, // Use HTML if available, else text
      });

      // Store in Elasticsearch
      await esClient.index({
        index: 'emails',
        document: processedEmail,
      });

      console.log(`Indexed email: ${processedEmail.subject} | Category: ${processedEmail.category}`);
    }

    connection.end();
  } catch (error) {
    console.error('Error fetching emails:', error);
  }
}

fetchEmails();
