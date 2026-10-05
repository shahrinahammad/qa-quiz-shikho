import nodemailer from 'nodemailer'

// 🆕 isReset নামে একটি নতুন অপশন যুক্ত করা হলো (ডিফল্ট: false)
export async function sendAgentCredentialEmail(to: string, cc: string, name: string, pass: string, isReset: boolean = false) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })

  // 🆕 ইমেইলের সাবজেক্ট এবং বডি ডাইনামিক করা হলো
  const subject = isReset ? 'QA QUIZ Portal - Password Reset' : 'Welcome to QA QUIZ Portal - Your Credentials';
  const mainText = isReset 
    ? 'Your password has been successfully reset by the Admin.' 
    : 'Your account has been created successfully.';

  const mailOptions = {
    from: `"QA QUIZ Portal" <${process.env.GMAIL_USER}>`,
    to: to,
    cc: cc,
    subject: subject,
    text: `Hello ${name},\n\n${mainText}\n\nHere are your login details:\nPortal Link: https://qa-quiz-shikho.vercel.app/\nEmail: ${to}\nPassword: ${pass}\n\nPlease login to the portal and change your password if needed.\n\nBest regards,\nQA QUIZ Admin`
  }

  await transporter.sendMail(mailOptions)
}
