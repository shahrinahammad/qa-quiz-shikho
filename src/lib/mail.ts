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
    from: `"Shikho QA Portal" <${process.env.GMAIL_USER}>`,
    to: to,
    cc: cc,
    subject: 'Welcome to Shikho QA Portal - Your Credentials',
    text: `Hello ${name},\n\nYour account has been created successfully.\n\nHere are your login details:\nEmail: ${to}\nPassword: ${pass}\n\nPlease login to the portal and change your password if needed.\n\nBest regards,\nShikho Admin`
  }

  await transporter.sendMail(mailOptions)
}
