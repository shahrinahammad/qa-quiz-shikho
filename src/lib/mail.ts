import nodemailer from 'nodemailer'

// ১. অ্যাকাউন্ট তৈরি ও পাসওয়ার্ড রিসেট ইমেইল পাঠানোর ফাংশন
export async function sendAgentCredentialEmail(to: string, cc: string, name: string, pass: string, isReset: boolean = false) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })

  // ডাইনামিক কন্টেন্ট সেট করা
  const subject = isReset 
    ? '🔒 Security Update: Your Password Has Been Reset' 
    : '🎉 Welcome to QA QUIZ Portal - Your Login Credentials!'
    
  const headerColor = isReset ? '#dc2626' : '#4f46e5' // রিসেটের জন্য লাল, ওয়েলকামের জন্য নীল
  const headerTitle = isReset ? 'Password Reset 🔒' : 'Welcome Aboard! 🎉'
  
  const mainText = isReset 
    ? 'Your password for the QA QUIZ Portal has been successfully reset by the Admin.' 
    : 'Welcome aboard! Your account for the QA QUIZ Portal has been successfully created. We are excited to have you on board! 🌟'
    
  const buttonText = isReset ? 'Log in & Update Password' : 'Log in to Portal'

  const mailOptions = {
    from: `"QA QUIZ Portal" <${process.env.GMAIL_USER}>`,
    to: to,
    cc: cc,
    subject: subject,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; padding: 40px 20px; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
          
          <div style="background-color: ${headerColor}; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">${headerTitle}</h1>
          </div>

          <div style="padding: 40px 30px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 20px;">Hi ${name} 👋,</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              ${mainText}
            </p>

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid ${headerColor}; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
              <h3 style="margin-top: 0; color: #1e293b; font-size: 16px; margin-bottom: 15px;">📌 Login Details:</h3>
              
              <div style="margin-bottom: 10px;">
                <span style="color: #64748b; font-size: 14px; font-weight: 500;">Portal Link:</span><br>
                <a href="https://qa-quiz-shikho.vercel.app/" style="color: #4f46e5; text-decoration: none; font-weight: 500; word-break: break-all;">https://qa-quiz-shikho.vercel.app/</a>
              </div>
              
              <div style="margin-bottom: 10px;">
                <span style="color: #64748b; font-size: 14px; font-weight: 500;">Email Address:</span><br>
                <span style="color: #0f172a; font-weight: 500;">${to}</span>
              </div>
              
              <div>
                <span style="color: #64748b; font-size: 14px; font-weight: 500;">Temporary Password:</span><br>
                <span style="color: #0f172a; font-family: monospace; font-size: 16px; font-weight: 600; background-color: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${pass}</span>
              </div>
            </div>

            <p style="color: #dc2626; font-size: 14px; font-weight: 600; margin-bottom: 30px; text-align: center;">
              🚨 Security Note: For your security, you will be required to set a new password upon your first login.
            </p>

            <div style="text-align: center; margin-bottom: 30px;">
              <a href="https://qa-quiz-shikho.vercel.app/" style="display: inline-block; background-color: ${headerColor}; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 12px 30px; border-radius: 8px;">👉 ${buttonText}</a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              Best regards,<br>
              <strong>QA QUIZ Admin Team</strong>
            </p>
          </div>

        </div>
      </div>
    `
  }

  await transporter.sendMail(mailOptions)
}

// ২. নতুন কুইজ অ্যাসাইন ইমেইল পাঠানোর ফাংশন
export async function sendQuizAssignedEmail(to: string, agentName: string, quizTitle: string, duration: number, passScore: number, assignerName: string) {
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
    subject: `🚀 Action Required: Your New Quiz Challenge is Ready! - ${quizTitle}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; padding: 40px 20px; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
          
          <div style="background-color: #f59e0b; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">New Quiz Assigned! 🚀</h1>
          </div>

          <div style="padding: 40px 30px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 20px;">Hi ${agentName} 👋,</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              Ready to test your skills? A new quiz evaluation has just been assigned to you by <strong>${assignerName}</strong>. It's time to show us what you know! 🌟
            </p>

            <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
              <h3 style="margin-top: 0; color: #92400e; font-size: 16px; margin-bottom: 15px;">📌 Mission Details:</h3>
              
              <ul style="list-style-type: none; padding: 0; margin: 0; color: #92400e; font-size: 15px;">
                <li style="margin-bottom: 8px;">🎯 <strong>Assessment:</strong> ${quizTitle}</li>
                <li style="margin-bottom: 8px;">⏳ <strong>Time Limit:</strong> ${duration} Minutes</li>
                <li>🏆 <strong>Target Score:</strong> ${passScore}%</li>
              </ul>
            </div>

            <p style="color: #dc2626; font-size: 15px; font-weight: 600; text-align: center; margin-bottom: 30px;">
              🚨 Deadline Alert: This is a time-sensitive task. Please make sure to complete and submit your evaluation by the end of today.
            </p>

            <div style="text-align: center; margin-bottom: 30px;">
              <a href="https://qa-quiz-shikho.vercel.app/" style="display: inline-block; background-color: #f59e0b; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 12px 30px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(245, 158, 11, 0.2), 0 2px 4px -1px rgba(245, 158, 11, 0.1);">👉 Log in & Start Quiz Now</a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              You've got this! Best of luck. 💪<br><br>
              Best regards,<br>
              <strong>${assignerName}</strong><br>
              QA QUIZ Portal
            </p>
          </div>
        </div>
      </div>
    `
  }

  await transporter.sendMail(mailOptions)
}
