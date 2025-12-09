#!/usr/bin/env node

import cron from 'node-cron';
import moment from 'moment-timezone';
import { createRequire } from 'module';
import { performJobMatching } from './utils/jobMatching.js';
import { closeDatabase } from './utils/database.js';
import { buildJobMatchingUsersEmailHTML } from './utils/emailTemplates.js';
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
  success: async (stats, htmlContent) => {
    const summaryText = `✅ Job Matching completed at ${stats.endTime}

📊 Summary:
- Total Jobs Processed: ${stats.totalJobs}
- Total Profiles Processed: ${stats.totalProfiles}
- Total Matches Found: ${stats.totalMatches}
- Users with Matches: ${stats.usersWithMatches}
- Excellent Matches (≥85%): ${stats.excellentMatches}
- Good Matches (≥70%): ${stats.goodMatches}
- Average Recommendations per User: ${stats.averageRecommendationsPerUser}
- Processing Time: ${stats.duration} seconds

💾 Results saved to jobMatching collection in database (matches ≥40%)`;

    await transporter.sendMail({
      from: `"Job Matching" <${config.notification.email.user}>`,
      to: config.notification.email.recipients,
      subject: `✅ Job Matching Completed - ${stats.totalMatches} matches found`,
      text: summaryText,
      html: htmlContent || undefined
    });

    console.log("📧 Success notification email sent.");
  },

  error: async (error, stats = {}) => {
    const errorText = `❌ Job Matching failed at ${moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss")}

Error: ${error.message}
${error.stack || ''}`;

    await transporter.sendMail({
      from: `"Job Matching" <${config.notification.email.user}>`,
      to: config.notification.email.recipients,
      subject: `❌ Job Matching Failed - ${error.message}`,
      text: errorText
    });

    console.log("📧 Error notification email sent.");
  }
};

// Main job matching function
const runJobMatching = async () => {
  const startTime = Date.now();
  const startTimeFormatted = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
  
  console.log(`🚀 [${startTimeFormatted}] Starting scheduled job matching...`);
  
  try {
    const results = await performJobMatching();
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    const endTimeFormatted = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
    
    // Add timing info to results
    results.startTime = startTimeFormatted;
    results.endTime = endTimeFormatted;
    results.duration = duration;
    
    console.log(`✅ [${endTimeFormatted}] Job matching completed successfully!`);
    
    // Generate email HTML using template
    const emailHTML = buildJobMatchingUsersEmailHTML(results.usersWithMatchesDetails || []);
    
    // Send success notification
    await notify.success(results, emailHTML);
    
    return results;
    
  } catch (error) {
    const endTimeFormatted = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
    console.error(`❌ [${endTimeFormatted}] Job matching failed:`, error);
    
    // Send error notification
    await notify.error(error, { startTime: startTimeFormatted, endTime: endTimeFormatted });
    
    throw error;
  }
};

// Schedule job matching to run daily at 6:00 AM IST
const scheduleJobMatching = () => {
  console.log('⏰ Job Matching Scheduler Started');
  console.log('📅 Scheduled to run daily at 6:00 AM IST (00:30 UTC)');
  console.log('🔄 Next run:', moment().tz("Asia/Kolkata").add(1, 'day').startOf('day').add(6, 'hours').format("YYYY-MM-DD HH:mm:ss"));
  
  // Run at 6:00 AM IST daily (00:30 UTC)
  cron.schedule('30 0 * * *', async () => {
    console.log('\n' + '='.repeat(60));
    console.log('🕕 Daily Job Matching Started');
    console.log('='.repeat(60));
    
    try {
      await runJobMatching();
    } catch (error) {
      console.error('❌ Scheduled job matching failed:', error);
    } finally {
      // Close database connection after each run
      await closeDatabase();
    }
    
    console.log('='.repeat(60));
    console.log('🕕 Daily Job Matching Completed');
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
  console.log('🧪 Running job matching immediately (test mode)...');
  runJobMatching()
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
  scheduleJobMatching();
  
  // Keep the process running
  console.log('🔄 Scheduler is running. Press Ctrl+C to stop.');
  
  // Keep the process alive
  setInterval(() => {
    // Just keep the process running
  }, 1000 * 60 * 60); // Check every hour
}
