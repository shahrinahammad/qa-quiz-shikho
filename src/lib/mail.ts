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

// ১. আইডি তৈরি / পাসওয়ার্ড রিসেট (CC ছাড়া)
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

// ২. নতুন কুইজ অ্যাসাইন
export async function sendQuizAssignedEmail(to: string, assignerEmail: string, agentName: string, quizTitle: string, duration: number, passScore: number, assignerName: string) {
  const transporter = getTransporter()
  await transporter.sendMail({
    from: `"QA QUIZ Portal" <${process.env.GMAIL_USER}>`,
    to: to,
    cc: assignerEmail,
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

// ৩. কুইজ সাবমিট হলে রিভিউ মেইল
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

// ৪. রিমাইন্ডার মেইল
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

// --- রিপোর্টের জন্য গ্লোবাল HTML জেনারেটর ---
const generateReportHTML = (title: string, dateText: string, color: string, data: any) => {
  const submittedList = data.details.filter((d: any) => d.status !== 'Pending');
  const pendingList = data.details.filter((d: any) => d.status === 'Pending');

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; padding: 30px 10px; color: #333;">
      <div style="max-width: 800px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
        
        <!-- Header -->
        <div style="background-color: ${color}; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 26px;">${title}</h1>
          <p style="color: #f1f5f9; margin: 10px 0 0 0; font-size: 15px;">Date: ${dateText}</p>
        </div>

        <div style="padding: 30px;">
          <!-- 1. Overall Summary -->
          <h2 style="color: #1e293b; font-size: 18px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">📊 Overall Summary</h2>
          <div style="display: flex; gap: 15px; margin-bottom: 30px;">
            <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; text-align: center; border-radius: 8px;">
              <h3 style="margin:0; font-size: 13px; color: #64748b; text-transform: uppercase;">Assigned</h3>
              <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #0f172a;">${data.summary.assigned}</p>
            </div>
            <div style="flex: 1; background: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; text-align: center; border-radius: 8px;">
              <h3 style="margin:0; font-size: 13px; color: #64748b; text-transform: uppercase;">Submitted</h3>
              <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #1d4ed8;">${data.summary.submitted}</p>
            </div>
            <div style="flex: 1; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; text-align: center; border-radius: 8px;">
              <h3 style="margin:0; font-size: 13px; color: #64748b; text-transform: uppercase;">QA Reviewed</h3>
              <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #15803d;">${data.summary.reviewed}</p>
            </div>
            <div style="flex: 1; background: #fef2f2; border: 1px solid #fecaca; padding: 15px; text-align: center; border-radius: 8px;">
              <h3 style="margin:0; font-size: 13px; color: #64748b; text-transform: uppercase;">Pending</h3>
              <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #b91c1c;">${data.summary.pending}</p>
            </div>
          </div>

          <!-- 2. QA Performance Summary (Dashboard Look) -->
          <h2 style="color: #1e293b; font-size: 18px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">🔎 QA Performance Summary</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;">
            <thead>
              <tr style="background-color: #f8fafc; text-align: left; text-transform: uppercase; font-size: 11px; color: #64748b;">
                <th style="padding: 12px; border-bottom: 1px solid #e2e8f0;">QA Name</th>
                <th style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">Total Assign</th>
                <th style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">Agent Submitted</th>
                <th style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">QA Reviewed</th>
                <th style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">Re-check Issues</th>
              </tr>
            </thead>
            <tbody>
              ${data.qaStats.map((qa: any) => `
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #0f172a;">${qa.qaName}</td>
                  <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #475569; font-weight: bold;">${qa.assigned}</td>
                  <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #2563eb; font-weight: bold;">${qa.submitted}</td>
                  <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #16a34a; font-weight: bold;">${qa.reviewed}</td>
                  <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #ea580c; font-weight: bold;">${qa.recheck}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- 3. Submitted Agent Details -->
          <h2 style="color: #1e293b; font-size: 18px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">✅ Submitted Agent Details</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px;">
            <thead>
              <tr style="background-color: #f1f5f9; text-align: left;">
                <th style="padding: 10px; border: 1px solid #e2e8f0;">Agent Name</th>
                <th style="padding: 10px; border: 1px solid #e2e8f0;">QA Name</th>
                <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: center;">Review Status</th>
                <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">Score</th>
              </tr>
            </thead>
            <tbody>
              ${submittedList.length === 0 ? '<tr><td colspan="4" style="padding: 15px; text-align: center; color: #64748b; border: 1px solid #e2e8f0;">No submitted exams found.</td></tr>' : 
                submittedList.map((d: any) => `
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">${d.agentName}</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; color: #475569;">${d.qaName}</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: ${d.status === 'Reviewed' ? '#15803d' : '#2563eb'};">${d.status}</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${d.score}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- 4. Not Attended List -->
          <h2 style="color: #1e293b; font-size: 18px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">❌ Not Attended (Pending)</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #fef2f2; text-align: left;">
                <th style="padding: 10px; border: 1px solid #fecaca; color: #991b1b;">Agent Name</th>
                <th style="padding: 10px; border: 1px solid #fecaca; color: #991b1b;">Assigned QA</th>
              </tr>
            </thead>
            <tbody>
              ${pendingList.length === 0 ? '<tr><td colspan="2" style="padding: 15px; text-align: center; color: #64748b; border: 1px solid #fecaca;">Everyone has submitted their exams! 🎉</td></tr>' : 
                pendingList.map((d: any) => `
                <tr>
                  <td style="padding: 10px; border: 1px solid #fecaca; font-weight: bold; color: #b91c1c;">${d.agentName}</td>
                  <td style="padding: 10px; border: 1px solid #fecaca; color: #b91c1c;">${d.qaName}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://qa-quiz-shikho.vercel.app/super-admin/dashboard" style="display: inline-block; background-color: ${color}; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 30px; border-radius: 8px;">View Live Dashboard</a>
          </div>
        </div>
      </div>
    </div>
  `
}

export async function sendDailyReportEmail(to: string, reportData: any) {
  const transporter = getTransporter()
  await transporter.sendMail({
    from: `"QA QUIZ Portal" <${process.env.GMAIL_USER}>`,
    to: to,
    subject: `📊 Daily Quiz Report - ${reportData.dateRange}`,
    html: generateReportHTML('Daily Quiz Report', reportData.dateRange, '#3b82f6', reportData) 
  })
}

export async function sendWeeklyReportEmail(to: string, reportData: any) {
  const transporter = getTransporter()
  await transporter.sendMail({
    from: `"QA QUIZ Portal" <${process.env.GMAIL_USER}>`,
    to: to,
    subject: `📈 Weekly Performance Report - ${reportData.dateRange}`,
    html: generateReportHTML('Weekly Performance Report', reportData.dateRange, '#8b5cf6', reportData) 
  })
}
