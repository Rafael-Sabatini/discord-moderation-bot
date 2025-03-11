const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendVerificationEmail(userEmail, verificationCode, username) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: "Discord Server Email Verification",
    html: `
            <h1>Discord Email Verification</h1>
            <p>Hello ${username},</p>
            <p>Your verification code is: <strong>${verificationCode}</strong></p>
            <p>Please use this code with the /verify-code command in Discord to complete your verification.</p>
            <p>If you didn't request this verification, please ignore this email.</p>
        `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

module.exports = sendVerificationEmail;
