#!/usr/bin/env node

import cron from 'node-cron';
import moment from 'moment-timezone';
import { createRequire } from 'module';
import { performActivelyHiringUpdate } from './utils/activelyHiring.js';
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
    const summaryText = `✅ Actively Hiring Detection completed at ${stats.endTime}

📊 Summary:
- Total Companies Processed: ${stats.totalCompanies}
- Companies Updated: ${stats.companiesUpdated}
- Actively Hiring: ${stats.activelyHiringCount}
- Not Actively Hiring: ${stats.notActivelyHiringCount}
- Errors: ${stats.errors}
- Processing Time: ${stats.duration} seconds

💾 Results saved to Company collection in database`;

    const emailHTML = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #28a745;">✅ Actively Hiring Detection Completed Successfully</h2>
      <p><strong>Completed at:</strong> ${stats.endTime}</p>
      
      <h3 style="color: #007bff;">📊 Processing Summary</h3>
      <ul>
        <li><strong>Total Companies Processed:</strong> ${stats.totalCompanies.toLocaleString()}</li>
        <li><strong>Companies Updated:</strong> ${stats.companiesUpdated.toLocaleString()}</li>
        <li><strong>Actively Hiring:</strong> ${stats.activelyHiringCount.toLocaleString()}</li>
        <li><strong>Not Actively Hiring:</strong> ${stats.notActivelyHiringCount.toLocaleString()}</li>
        <li><strong>Errors:</strong> ${stats.errors}</li>
        <li><strong>Processing Time:</strong> ${stats.duration} seconds</li>
      </ul>
      
      <p style="color: #6c757d; font-size: 0.9em;">
        💾 All company hiring statuses have been updated in the database.
      </p>
    </div>`;

    const mailOptions = {
      from: config.notification.email.user,
      to: config.notification.email.recipients.join(', '),
      subject: `✅ Actively Hiring Detection Completed - ${stats.activelyHiringCount} companies actively hiring`,
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
    const errorText = `❌ Actively Hiring Detection failed at ${moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss")}

Error: ${error.message}
${error.stack || ''}`;

    const emailHTML = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc3545;">❌ Actively Hiring Detection Failed</h2>
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
      subject: `❌ Actively Hiring Detection Failed - ${error.message}`,
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

// Main actively hiring detection function
const runActivelyHiringDetection = async () => {
  const startTime = Date.now();
  const startTimeFormatted = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
  
  console.log(`🚀 [${startTimeFormatted}] Starting scheduled actively hiring detection...`);
  
  try {
    const results = await performActivelyHiringUpdate();
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    const endTimeFormatted = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
    
    // Add timing info to results
    results.startTime = startTimeFormatted;
    results.endTime = endTimeFormatted;
    results.duration = duration;
    
    console.log(`✅ [${endTimeFormatted}] Actively hiring detection completed successfully!`);
    
    // Send success notification
    await notify.success(results);
    
    return results;
    
  } catch (error) {
    const endTimeFormatted = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
    console.error(`❌ [${endTimeFormatted}] Actively hiring detection failed:`, error);
    
    // Send error notification
    await notify.error(error, { startTime: startTimeFormatted, endTime: endTimeFormatted });
    
    throw error;
  }
};

// Schedule actively hiring detection to run daily at 7:00 AM IST
const scheduleActivelyHiringDetection = () => {
  console.log('⏰ Actively Hiring Detection Scheduler Started');
  console.log('📅 Scheduled to run daily at 7:00 AM IST (01:30 UTC)');
  console.log('🔄 Next run:', moment().tz("Asia/Kolkata").add(1, 'day').startOf('day').add(7, 'hours').format("YYYY-MM-DD HH:mm:ss"));
  
  // Run at 7:00 AM IST daily (01:30 UTC)
  cron.schedule('30 1 * * *', async () => {
    console.log('\n' + '='.repeat(60));
    console.log('🕕 Daily Actively Hiring Detection Started');
    console.log('='.repeat(60));
    
    try {
      await runActivelyHiringDetection();
    } catch (error) {
      console.error('❌ Scheduled actively hiring detection failed:', error);
    } finally {
      // Close database connection after each run
      await closeDatabase();
    }
    
    console.log('='.repeat(60));
    console.log('🕕 Daily Actively Hiring Detection Completed');
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
  console.log('🧪 Running actively hiring detection immediately (test mode)...');
  runActivelyHiringDetection()
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
  scheduleActivelyHiringDetection();
  
  // Keep the process running
  console.log('🔄 Scheduler is running. Press Ctrl+C to stop.');
  
  // Keep the process alive
  setInterval(() => {
    // Just keep the process running
  }, 1000 * 60 * 60); // Check every hour
}

