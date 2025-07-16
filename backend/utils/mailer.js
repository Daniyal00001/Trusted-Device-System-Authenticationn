const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOTPEmail = async (toEmail, otpCode) => {
  const mailOptions = {
    from: `"Trusted Auth App" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Your OTP Code for Device Verification",
    text: `Your OTP code is: ${otpCode}\n\nIt will expire in 5 minutes.`,
    html: `<p>Your OTP code is: <strong>${otpCode}</strong></p><p>It will expire in 5 minutes.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending OTP: ${error.message}`);
    return false;
  }
};

module.exports = { sendOTPEmail };
