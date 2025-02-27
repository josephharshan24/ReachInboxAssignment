require("dotenv").config();
const Imap = require("imap-simple");
const { simpleParser } = require("mailparser");

const imapConfig = {
  imap: {
    user: process.env.IMAP_USER,
    password: process.env.IMAP_PASSWORD,
    host: process.env.IMAP_HOST,
    port: process.env.IMAP_PORT,
    tls: true,
    authTimeout: 10000,
    tlsOptions: { rejectUnauthorized: false },
    
  },
};

// Function to fetch emails from the last 30 days
async function fetchEmails() {
  try {
    const connection = await Imap.connect(imapConfig);
    await connection.openBox("INBOX");

    // Get emails from the last 30 days
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - 30);

    const searchCriteria = ["ALL", ["SINCE", sinceDate.toISOString()]];
    const fetchOptions = { bodies: ["HEADER", "TEXT"], markSeen: false };

    const messages = await connection.search(searchCriteria, fetchOptions);

    const emails = await Promise.all(
      messages.map(async (message) => {
        const header = message.parts.find((part) => part.which === "HEADER")
          .body;
        const text = message.parts.find((part) => part.which === "TEXT").body;

        return {
          from: header.from[0],
          subject: header.subject[0],
          date: header.date[0],
          body: text,
        };
      })
    );

    console.log("Fetched Emails:", emails);
    connection.end();
  } catch (error) {
    console.error("IMAP Error:", error);
  }
}

// Function to listen for new emails (Real-time sync using IDLE mode)
async function startRealTimeSync() {
  try {
    const connection = await Imap.connect(imapConfig);
    await connection.openBox("INBOX");

    connection.on("mail", async () => {
      console.log("New email received! Fetching latest emails...");
      await fetchEmails();
    });

    console.log("Listening for new emails...");
  } catch (error) {
    console.error("IMAP Error:", error);
  }
}

// Run Fetch & Start Listening
fetchEmails();
startRealTimeSync();
