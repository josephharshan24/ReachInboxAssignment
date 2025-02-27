const { convert } = require('html-to-text');
const { categorizeEmail } = require('./emailCategorization');

function extractPlainText(html) {
    return convert(html, {
        wordwrap: false,
        ignoreImage: true,
        ignoreHref: true
    });
}

function processEmail(email) {
    const plainTextBody = extractPlainText(email.body);
    const category = categorizeEmail(plainTextBody);

    console.log(`Email categorized as: ${category}`);

    return { ...email, body: plainTextBody, category };
}

module.exports = { processEmail };

