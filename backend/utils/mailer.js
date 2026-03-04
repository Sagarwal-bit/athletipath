const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

function isSmtpConfigured() {
  return Boolean(
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS &&
    process.env.EMAIL_USER !== "yourgmail@gmail.com" &&
    process.env.EMAIL_PASS !== "your_app_password_here"
  );
}

async function verifySmtp() {
  if (!isSmtpConfigured()) {
    return {
      configured: false,
      ok: false,
      message: "SMTP credentials missing in .env",
    };
  }

  try {
    await transporter.verify();
    return {
      configured: true,
      ok: true,
      message: "SMTP is reachable and authenticated",
    };
  } catch (err) {
    return {
      configured: true,
      ok: false,
      message: err?.message || "SMTP verification failed",
    };
  }
}

const sendMail = async (to, subject, text) => {
  if (!isSmtpConfigured()) {
    throw new Error("SMTP credentials are not configured");
  }

  await transporter.sendMail({
    from: `"AthletiPath" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text
  });
};

module.exports = sendMail;
module.exports.verifySmtp = verifySmtp;
module.exports.isSmtpConfigured = isSmtpConfigured;
