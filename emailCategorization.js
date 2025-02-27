const categorizeEmail = (emailText) => {
    emailText = cleanEmailText(emailText);
    console.log("Cleaned Email Text: ", emailText);  // Check cleaned text
    
    if (/\b(interested|looking forward|want to book)\b/i.test(emailText)) {
        console.log("Category: Interested");
        return 'Interested';
    }
    if (/\b(meeting confirmed|meeting scheduled|booked|confirmed appointment)\b/i.test(emailText)) {
        console.log("Category: Meeting Booked");
        return 'Meeting Booked';
    }
    if (/\b(not interested|no thanks|unsubscribe)\b/i.test(emailText)) {
        console.log("Category: Not Interested");
        return 'Not Interested';
    }
    if (/\b(free|offer|limited time|prize|discount|special)\b/i.test(emailText)) {
        console.log("Category: Spam");
        return 'Spam';
    }
    if (/\b(out of office|on vacation|away from desk|out of town)\b/i.test(emailText)) {
        console.log("Category: Out of Office");
        return 'Out of Office';
    }
    console.log("Category: Uncategorized");  // Default
    return 'Uncategorized';
  };
  
  module.exports = { categorizeEmail };
  