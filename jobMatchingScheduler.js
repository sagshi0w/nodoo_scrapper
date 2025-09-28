#!/usr/bin/env node

import cron from 'node-cron';
import moment from 'moment-timezone';
import { createRequire } from 'module';
import { performJobMatching } from './utils/jobMatching.js';
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

    const emailHTML = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #28a745;">✅ Job Matching Completed Successfully</h2>
      <p><strong>Completed at:</strong> ${stats.endTime}</p>
      
      <h3 style="color: #007bff;">📊 Processing Summary</h3>
      <ul>
        <li><strong>Total Jobs Processed:</strong> ${stats.totalJobs.toLocaleString()}</li>
        <li><strong>Total Profiles Processed:</strong> ${stats.totalProfiles}</li>
        <li><strong>Total Matches Found:</strong> ${stats.totalMatches.toLocaleString()}</li>
        <li><strong>Users with Matches:</strong> ${stats.usersWithMatches}</li>
        <li><strong>Excellent Matches (≥85%):</strong> ${stats.excellentMatches}</li>
        <li><strong>Good Matches (≥70%):</strong> ${stats.goodMatches}</li>
        <li><strong>Average Recommendations per User:</strong> ${stats.averageRecommendationsPerUser}</li>
        <li><strong>Processing Time:</strong> ${stats.duration} seconds</li>
      </ul>
      
      <p style="color: #6c757d; font-size: 0.9em;">
        💾 All matching results have been saved to the jobMatching collection in the database (matches ≥40%).
      </p>
    </div>`;

    const mailOptions = {
      from: config.notification.email.user,
      to: config.notification.email.recipients.join(', '),
      subject: `✅ Job Matching Completed - ${stats.totalMatches} matches found`,
      text: summaryText,
      html: emailHTML
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('📧 Success notification sent');
    } catch (error) {
      console.error('❌ Failed to send success notification:', error);
    }
  },

  error: async (error, stats = {}) => {
    const errorText = `❌ Job Matching failed at ${moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss")}

Error: ${error.message}
${error.stack || ''}`;

    const emailHTML = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc3545;">❌ Job Matching Failed</h2>
      <p><strong>Failed at:</strong> ${moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss")}</p>
      
      <h3 style="color: #dc3545;">Error Details</h3>
      <pre style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto;">
${error.message}
${error.stack || ''}
      </pre>
    </div>`;

    const mailOptions = {
      from: config.notification.email.user,
      to: config.notification.email.recipients.join(', '),
      subject: `❌ Job Matching Failed - ${error.message}`,
      text: errorText,
      html: emailHTML
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('📧 Error notification sent');
    } catch (emailError) {
      console.error('❌ Failed to send error notification:', emailError);
    }
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
    
    // Send success notification
    await notify.success(results);
    
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
      // No database connection to close when using backend API
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
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
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
