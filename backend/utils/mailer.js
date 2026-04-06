// utils/mailer.js — Email notifications via Nodemailer
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const GOLD = '#C9A84C';

function baseTemplate(title, bodyHtml) {
  return `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#FAF5EC;font-family:'Georgia',serif;">
  <div style="max-width:520px;margin:40px auto;background:#FFFDF8;border:1px solid ${GOLD};border-radius:12px;overflow:hidden;">
    <div style="background:#1A1209;padding:28px 32px;text-align:center;">
      <p style="margin:0;color:${GOLD};font-size:11px;letter-spacing:3px;text-transform:uppercase;">✦ Ashtakoota ✦</p>
      <h1 style="margin:8px 0 0;color:#FAF5EC;font-size:22px;font-weight:400;">${title}</h1>
    </div>
    <div style="padding:32px;">${bodyHtml}</div>
    <div style="background:#F0E8D5;padding:16px 32px;text-align:center;font-size:11px;color:#6B5837;">
      May the stars align · Ashtakoota Vedic Dating
    </div>
  </div>
</body></html>`;
}

async function sendLikeNotification(toEmail, toName, fromName) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: toEmail,
    subject: `${fromName} liked your profile ✦`,
    html: baseTemplate('Someone likes you', `
      <p style="color:#3D2F12;font-size:16px;">Hello <strong>${toName}</strong>,</p>
      <p style="color:#6B5837;line-height:1.7;">
        <strong style="color:#C9A84C;">${fromName}</strong> has liked your profile on Ashtakoota.
        If you like them back, the stars will connect you for a full compatibility reading.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${process.env.FRONTEND_URL}" style="background:#C9A84C;color:#1A1209;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">View Profile</a>
      </div>`),
  });
}

async function sendMatchNotification(toEmail, toName, matchName, score) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: toEmail,
    subject: `It's a match! You & ${matchName} scored ${score}/36 ✦`,
    html: baseTemplate("It's a match! ✦", `
      <p style="color:#3D2F12;font-size:16px;">Hello <strong>${toName}</strong>,</p>
      <p style="color:#6B5837;line-height:1.7;">
        The stars have aligned — you and <strong style="color:#C9A84C;">${matchName}</strong>
        have matched! Your Ashtakoota compatibility score is:
      </p>
      <div style="text-align:center;margin:24px 0;">
        <div style="font-size:52px;font-weight:bold;color:#C9A84C;">${score}</div>
        <div style="color:#6B5837;font-size:14px;">out of 36 Gunas</div>
      </div>
      <div style="text-align:center;">
        <a href="${process.env.FRONTEND_URL}" style="background:#C9A84C;color:#1A1209;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">Open Chat</a>
      </div>`),
  });
}

async function sendCompatRequestNotification(toEmail, toName, fromName) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: toEmail,
    subject: `${fromName} wants to check your compatibility ✦`,
    html: baseTemplate('Compatibility Request', `
      <p style="color:#3D2F12;font-size:16px;">Hello <strong>${toName}</strong>,</p>
      <p style="color:#6B5837;line-height:1.7;">
        <strong style="color:#C9A84C;">${fromName}</strong> has sent you a compatibility reading request.
        Accept it to see your full Ashtakoota score — all 8 Kootas revealed.
        <br><br>This request expires in <strong>48 hours</strong>.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${process.env.FRONTEND_URL}" style="background:#C9A84C;color:#1A1209;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">Accept Request</a>
      </div>`),
  });
}

module.exports = { sendLikeNotification, sendMatchNotification, sendCompatRequestNotification };
