const nodemailer = require('nodemailer');
require('dotenv').config(); 
 

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail', 
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS  
    },
    logger: true, 
    debug: false 
});
 
/**
* Sends an email.
* @param {string} to 
* @param {string} subject 
* @param {string} htmlContent 
* @returns {Promise<boolean>} 
*/
async function sendEmail(to, subject, htmlContent) {
    if (!to || !subject || !htmlContent) {
        console.error('Email sending failed: Missing recipient, subject, or content.');
        return false;
    }
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('Email sending failed: Email credentials not configured in environment variables.');
        return false;
    }
 
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER, 
            to: to,
            subject: subject,
            html: htmlContent
        };
 
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully to %s. Message ID: %s', to, info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending email to %s:', to, error);
        return false;
    }
}
 
module.exports = { sendEmail };