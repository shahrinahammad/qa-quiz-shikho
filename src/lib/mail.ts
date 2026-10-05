import nodemailer from 'nodemailer'

export async function sendAgentCredentialEmail(to: string, cc: string, name: string, pass: string) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })

  const mailOptions = {
    from: `"QA QUIZ Portal" <${process.env.GMAIL_USER}>`,
    to: to,
    cc: cc,
    subject: 'Welcome to QA QUIZ Portal - Your Credentials',
    text: `Hello ${name},\n\nYour account has been created successfully.\n\nHere are your login details:\nPortal Link: https://qa-quiz-shikho.vercel.app/\nEmail: ${to}\nPassword: ${pass}\n\nPlease login to the portal and change your password if needed.\n\nBest regards,\nQA QUIZ Admin`
  }

  await transporter.sendMail(mailOptions)
}
