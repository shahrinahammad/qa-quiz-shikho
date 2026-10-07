import nodemailer from 'nodemailer'

const getTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

// ১. আইডি তৈরি / পাসওয়ার্ড রিসেট (শুধুমাত্র ইউজারের কাছে যাবে, কোনো CC থাকবে না)
export async function sendAgentCredentialEmail(to: string, name: string, pass: string, isReset: boolean = false) {
  const transporter = getTransporter()
  const subject = isReset ? '🔒 Security Update: Your Password Has Been Reset' : '🎉 Welcome to QA QUIZ Portal - Your Login Credentials!'
  const headerColor = isReset ? '#dc2626' : '#4f46e5'
  const headerTitle = isReset ? 'Password Reset 🔒' : 'Welcome Aboard! 🎉'
  const mainText = isReset 
    ? 'Your password for the QA QUIZ Portal has been successfully reset by the Admin.' 
    : 'Welcome aboard! Your account for the QA QUIZ Portal has been successfully created.'
  const buttonText = isReset ? 'Log in & Update Password' : 'Log in to Portal'

  await transporter.sendMail({
    from: `"QA QUIZ Portal" <${process.env.GMAIL_USER}>`,
    to: to,
    subject: subject,
    html: `
      <div style="font-family: sans-serif; background-color: #f4f7f6; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <div style="background-color: ${headerColor}; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0;">${headerTitle}</h1>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="margin-top: 0;">Hi ${name} 👋,</h2>
            <p>${mainText}</p>
            <div style="background-color: #f8fafc; border-left: 4px solid ${headerColor}; padding: 20px; margin-bottom: 30px;">
              <p><strong>Portal Link:</strong> <a href="https://qa-quiz-shikho.vercel.app/">https://qa-quiz-shikho.vercel.app/</a></p>
              <p><strong>Email Address:</strong> ${to}</p>
              <p><strong>Temporary Password:</strong> <span style="background-color: #e2e8f0; padding: 2px 6px;">${pass}</span></p>
            </div>
            <p style="color: #dc2626;">🚨 For your security, you must set a new password upon your first login.</p>
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://qa-quiz-shikho.vercel.app/" style="background-color: ${headerColor}; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none;">👉 ${buttonText}</a>
            </div>
          </div>
        </div>
      </div>
    `
  })
}

// ২. নতুন কুইজ অ্যাসাইন (এজেন্ট পাবে + Assigner CC-তে পাবে)
export async function sendQuizAssignedEmail(to: string, assignerEmail: string, agentName: string, quizTitle: string, duration: number, passScore: number, assignerName: string) {
  const transporter = getTransporter()
  await transporter.sendMail({
    from: `"QA QUIZ Portal" <${process.env.GMAIL_USER}>`,
    to: to,
    cc: assignerEmail, // 🆕 Assigner CC-তে থাকবে
    subject: `🚀 Action Required: New Quiz Assigned - ${quizTitle}`,
    html: `
      <div style="font-family: sans-serif; background-color: #f4f7f6; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #f59e0b; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0;">New Quiz Assigned! 🚀</h1>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="margin-top: 0;">Hi ${agentName},</h2>
            <p>A new quiz has just been assigned to you by <strong>${assignerName}</strong>.</p>
            <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 30px;">
              <p>🎯 <strong>Assessment:</strong> ${quizTitle}</p>
              <p>⏳ <strong>Time Limit:</strong> ${duration} Minutes</p>
              <p>🏆 <strong>Target Score:</strong> ${passScore}%</p>
            </div>
            <p style="color: #dc2626; text-align: center; font-weight: bold;">🚨 Deadline Alert: Please complete by the end of today.</p>
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://qa-quiz-shikho.vercel.app/" style="background-color: #f59e0b; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none;">Log in & Start Quiz</a>
            </div>
          </div>
        </div>
      </div>
    `
  })
}

// ৩. কুইজ সাবমিট হলে রিভিউ এর জন্য Assigner-কে মেইল
export async function sendQuizSubmittedEmail(assignerEmail: string, assignerName: string, agentName: string, quizTitle: string) {
  const transporter = getTransporter()
  await transporter.sendMail({
    from: `"QA QUIZ Portal" <${process.env.GMAIL_USER}>`,
    to: assignerEmail,
    subject: `✅ Ready for Review: ${agentName} submitted ${quizTitle}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Hello ${assignerName},</h2>
        <p><strong>${agentName}</strong> has just completed the quiz: <strong>${quizTitle}</strong>.</p>
        <p>It is now waiting for your review.</p>
        <a href="https://qa-quiz-shikho.vercel.app/super-admin/dashboard" style="background-color: #10b981; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">Review Now</a>
      </div>
    `
  })
}

// ৪. কুইজ সাবমিট না করলে ২ ঘন্টা পর সফট রিমাইন্ডার (এজেন্টকে)
export async function sendQuizReminderEmail(to: string, agentName: string, quizTitle: string) {
  const transporter = getTransporter()
  await transporter.sendMail({
    from: `"QA QUIZ Portal" <${process.env.GMAIL_USER}>`,
    to: to,
    subject: `⏰ Reminder: Please complete your assigned quiz - ${quizTitle}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #ea580c;">Hello ${agentName},</h2>
        <p>This is a gentle reminder that you have a pending evaluation: <strong>${quizTitle}</strong>.</p>
        <p>Please log in to your dashboard and complete it as soon as possible.</p>
        <a href="https://qa-quiz-shikho.vercel.app/" style="background-color: #ea580c; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">Start Quiz Now</a>
      </div>
    `
  })
}

// ৫. ডেইলি রিপোর্ট (আপাতত আপনার মেইলে যাবে)
export async function sendDailyReportEmail(to: string, reportData: any) {
  const transporter = getTransporter()
  const { date, totalAssigned, totalSubmitted, pendingExams, agentStats } = reportData

  await transporter.sendMail({
    from: `"QA QUIZ Portal" <${process.env.GMAIL_USER}>`,
    to: to, // আপাতত আপনার ইমেইল
    subject: `📊 Daily Quiz Report - ${date}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2 style="background-color: #3b82f6; color: white; padding: 15px; text-align: center; border-radius: 8px;">Daily Quiz Report - ${date}</h2>
        <div style="display: flex; gap: 10px; margin: 20px 0;">
          <div style="flex: 1; padding: 15px; background: #eff6ff; text-align: center; border-radius: 8px;">
            <h3>Assigned</h3><p style="font-size: 24px; font-weight: bold;">${totalAssigned}</p>
          </div>
          <div style="flex: 1; padding: 15px; background: #f0fdf4; text-align: center; border-radius: 8px;">
            <h3>Submitted</h3><p style="font-size: 24px; font-weight: bold;">${totalSubmitted}</p>
          </div>
          <div style="flex: 1; padding: 15px; background: #fef2f2; text-align: center; border-radius: 8px;">
            <h3>Pending</h3><p style="font-size: 24px; font-weight: bold;">${pendingExams}</p>
          </div>
        </div>
        <h3>Agent Activity:</h3>
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <tr style="background: #f3f4f6;"><th style="padding: 10px; border: 1px solid #ddd;">Name</th><th style="padding: 10px; border: 1px solid #ddd;">Assigned</th><th style="padding: 10px; border: 1px solid #ddd;">Done</th></tr>
          ${agentStats.map((a: any) => `<tr><td style="padding: 10px; border: 1px solid #ddd;">${a.name}</td><td style="padding: 10px; border: 1px solid #ddd;">${a.assigned}</td><td style="padding: 10px; border: 1px solid #ddd;">${a.submitted}</td></tr>`).join('')}
        </table>
      </div>
    `
  })
}

// ৬. উইকলি রিপোর্ট (আপাতত আপনার মেইলে যাবে)
export async function sendWeeklyReportEmail(to: string, reportData: any) {
  const transporter = getTransporter()
  const { weekRange, totalAssigned, totalSubmitted, pendingExams, topPerformers } = reportData

  await transporter.sendMail({
    from: `"QA QUIZ Portal" <${process.env.GMAIL_USER}>`,
    to: to,
    subject: `📈 Weekly Performance Report - ${weekRange}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2 style="background-color: #8b5cf6; color: white; padding: 15px; text-align: center; border-radius: 8px;">Weekly QA Report</h2>
        <p style="text-align: center;"><strong>${weekRange}</strong></p>
        <div style="display: flex; gap: 10px; margin: 20px 0;">
          <div style="flex: 1; padding: 15px; background: #f5f3ff; text-align: center; border-radius: 8px;">
            <h3>Total Assigned</h3><p style="font-size: 24px; font-weight: bold;">${totalAssigned}</p>
          </div>
          <div style="flex: 1; padding: 15px; background: #f0fdf4; text-align: center; border-radius: 8px;">
            <h3>Total Completed</h3><p style="font-size: 24px; font-weight: bold;">${totalSubmitted}</p>
          </div>
        </div>
        <a href="https://qa-quiz-shikho.vercel.app/super-admin/dashboard" style="display: block; text-align: center; background-color: #8b5cf6; color: white; padding: 12px; border-radius: 8px; text-decoration: none;">View Full Analytics</a>
      </div>
    `
  })
}
