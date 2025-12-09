#!/usr/bin/env node

import cron from 'node-cron';
import moment from 'moment-timezone';
import { createRequire } from 'module';
import { performOldJobDeletion } from './utils/deleteOldJobs.js';
import { closeDatabase } from './utils/database.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const require = createRequire(import.meta.url);
const nodemailer = require('nodemailer');

// Email configuration
const config = {
  notification: {
    email: {
      service: "Gmail",
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
      recipients: process.env.EMAIL_RECIPIENTS
        ? process.env.EMAIL_RECIPIENTS.split(',').map(email => email.trim())
        : ['nodooin86@gmail.com']
    }
  }
};

const transporter = nodemailer.createTransport({
  service: config.notification.email.service,
  auth: {
    user: config.notification.email.user,
    pass: config.notification.email.pass
  }
});

// Notification functions
const notify = {
  success: async (stats) => {
    const summaryText = `✅ Old Job Deletion completed at ${stats.endTime}

📊 Summary:
- Total Jobs Deleted: ${stats.totalJobsDeleted}
- Cutoff Date: ${stats.cutoffDateFormatted}
- Processing Time: ${stats.duration} seconds

💾 Old jobs (older than 3 months) have been removed from the database`;

    // Verify email configuration
    if (!config.notification.email.user || !config.notification.email.pass) {
      console.error("❌ Email configuration missing: EMAIL_USER or EMAIL_PASS not set");
      return;
    }

    if (!config.notification.email.recipients || config.notification.email.recipients.length === 0) {
      console.error("❌ No email recipients configured");
      return;
    }

    try {
      const mailOptions = {
        from: `"Old Job Deletion" <${config.notification.email.user}>`,
        to: config.notification.email.recipients,
        subject: `✅ Old Job Deletion Completed - ${stats.totalJobsDeleted} jobs deleted`,
        text: summaryText,
        html: `
          <div style="font-family:Arial, sans-serif;">
            <h3 style="margin:0 0 8px 0;">Old Job Deletion Summary</h3>
            <table style="border-collapse:collapse;width:100%;">
              <tr>
                <td style="border:1px solid #ddd;padding:8px;font-weight:bold;">Total Jobs Deleted</td>
                <td style="border:1px solid #ddd;padding:8px;">${stats.totalJobsDeleted}</td>
              </tr>
              <tr>
                <td style="border:1px solid #ddd;padding:8px;font-weight:bold;">Cutoff Date</td>
                <td style="border:1px solid #ddd;padding:8px;">${stats.cutoffDateFormatted}</td>
              </tr>
              <tr>
                <td style="border:1px solid #ddd;padding:8px;font-weight:bold;">Processing Time</td>
                <td style="border:1px solid #ddd;padding:8px;">${stats.duration} seconds</td>
              </tr>
            </table>
            <p style="margin-top:16px;">Old jobs (older than 3 months) have been removed from the database.</p>
          </div>
        `
      };

      console.log(`📧 Attempting to send email to: ${mailOptions.to.join(', ')}`);
      const info = await transporter.sendMail(mailOptions);
      console.log("📧 Success notification email sent. Message ID:", info.messageId);
    } catch (emailError) {
      console.error("❌ Failed to send success notification email:", emailError.message);
      console.error("❌ Email error details:", emailError);
    }
  },

  error: async (error, stats = {}) => {
    const errorText = `❌ Old Job Deletion failed at ${moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss")}

Error: ${error.message}
${error.stack || ''}`;

    try {
      await transporter.sendMail({
        from: `"Old Job Deletion" <${config.notification.email.user}>`,
        to: config.notification.email.recipients,
        subject: `❌ Old Job Deletion Failed - ${error.message}`,
        text: errorText
      });
      console.log("📧 Error notification email sent.");
    } catch (emailError) {
      console.error("❌ Failed to send error notification email:", emailError);
    }
  }
};

// Main old job deletion function
const runOldJobDeletion = async () => {
  const startTime = Date.now();
  const startTimeFormatted = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
  
  console.log(`🚀 [${startTimeFormatted}] Starting scheduled old job deletion...`);
  
  try {
    const results = await performOldJobDeletion();
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    const endTimeFormatted = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
    
    // Add timing info to results
    results.startTime = startTimeFormatted;
    results.endTime = endTimeFormatted;
    results.duration = duration;
    
    console.log(`✅ [${endTimeFormatted}] Old job deletion completed successfully!`);
    
    // Debug: Log email details
    console.log(`📧 Email config check:`);
    console.log(`   - User: ${config.notification.email.user ? 'Set' : 'NOT SET'}`);
    console.log(`   - Recipients: ${config.notification.email.recipients ? config.notification.email.recipients.length + ' recipients' : 'NOT SET'}`);
    
    // Send success notification
    await notify.success(results);
    
    return results;
    
  } catch (error) {
    const endTimeFormatted = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
    console.error(`❌ [${endTimeFormatted}] Old job deletion failed:`, error);
    
    // Send error notification
    await notify.error(error, { startTime: startTimeFormatted, endTime: endTimeFormatted });
    
    throw error;
  }
};

// Schedule old job deletion to run daily at 8:00 AM IST
const scheduleOldJobDeletion = () => {
  console.log('⏰ Old Job Deletion Scheduler Started');
  console.log('📅 Scheduled to run daily at 8:00 AM IST (02:30 UTC)');
  console.log('🔄 Next run:', moment().tz("Asia/Kolkata").add(1, 'day').startOf('day').add(8, 'hours').format("YYYY-MM-DD HH:mm:ss"));
  
  // Run at 8:00 AM IST daily (02:30 UTC)
  cron.schedule('30 2 * * *', async () => {
    console.log('\n' + '='.repeat(60));
    console.log('🕕 Daily Old Job Deletion Started');
    console.log('='.repeat(60));
    
    try {
      await runOldJobDeletion();
    } catch (error) {
      console.error('❌ Scheduled old job deletion failed:', error);
    } finally {
      // Close database connection after each run
      await closeDatabase();
    }
    
    console.log('='.repeat(60));
    console.log('🕕 Daily Old Job Deletion Completed');
    console.log('='.repeat(60) + '\n');
  }, {
    timezone: "Asia/Kolkata"
  });
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT. Shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM. Shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('❌ Uncaught Exception:', error);
  await closeDatabase();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  await closeDatabase();
  process.exit(1);
});

// Start the scheduler
if (process.argv.includes('--run-now')) {
  // Run immediately for testing
  console.log('🧪 Running old job deletion immediately (test mode)...');
  runOldJobDeletion()
    .then(() => {
      console.log('✅ Test run completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test run failed:', error);
      process.exit(1);
    });
} else {
  // Start the cron scheduler
  scheduleOldJobDeletion();
  
  // Keep the process running
  console.log('🔄 Scheduler is running. Press Ctrl+C to stop.');
  
  // Keep the process alive
  setInterval(() => {
    // Just keep the process running
  }, 1000 * 60 * 60); // Check every hour
}

