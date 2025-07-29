const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
const sendMail = async (email, subject, htmlContent) => {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    console.error("Invalid or missing recipient email:", email);
    return;
  }

  try {
    const mailOptions = {
      from: `"Girijakalyana" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
       html: htmlContent,
    };

   
    await transporter.sendMail(mailOptions);
   
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

module.exports = { sendMail };