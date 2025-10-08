import nodemailer from 'nodemailer';

export function makeTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST, // e.g. smtp.gmail.com or provider SMTP
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendVerificationEmail({ to, code }) {
  const transporter = makeTransport();
  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || '"Rides App" <no-reply@ridesapp.example>',
    to,
    subject: 'Verify email - 6 digit code',
    text: `Your verification code is: ${code}. It expires in 10 minutes.`,
    html: `<p>Your verification code is:</p><h2>${code}</h2><p>This code expires in 10 minutes.</p>`,
  });
  return info;
}
