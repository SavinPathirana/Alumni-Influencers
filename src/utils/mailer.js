const nodemailer = require('nodemailer');

//SMTP configuration
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

//Send mail
const sendMail = async (to, subject, text, html) => {
    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || process.env.SMTP_USER,
            to,
            subject,
            text,
            html
        });
        console.log(`Email sent successfully to ${to} [ID: ${info.messageId}]`);
        return info;
    } catch (error) {
        console.error(`Email delivery failed to ${to}:`, error.message);
        throw error;
    }
};

module.exports = sendMail;
