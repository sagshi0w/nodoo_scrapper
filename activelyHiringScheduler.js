#!/usr/bin/env node

import cron from 'node-cron';
import moment from 'moment-timezone';
import { createRequire } from 'module';
import { performActivelyHiringUpdate } from './utils/activelyHiring.js';
import { closeDatabase } from './utils/database.js';
import { buildActivelyHiringEmailHTML } from './utils/emailTemplates.js';
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
    const summaryText = `✅ Actively Hiring Detection completed at ${stats.endTime}

📊 Summary:
- Total Companies Processed: ${stats.totalCompanies}
- Companies Updated: ${stats.companiesUpdated}
- Actively Hiring: ${stats.activelyHiringCount}
- Not Actively Hiring: ${stats.notActivelyHiringCount}
- Errors: ${stats.errors}
- Processing Time: ${stats.duration} seconds

💾 Results saved to Company collection in database`;

    await transporter.sendMail({
      from: `"Actively Hiring Detection" <${config.notification.email.user}>`,
      to: config.notification.email.recipients,
      subject: `✅ Actively Hiring Detection Completed - ${stats.activelyHiringCount} companies actively hiring`,
      text: summaryText,
      html: htmlContent || undefined
    });

    console.log("📧 Success notification email sent.");
  },

  error: async (error, stats = {}) => {
    const errorText = `❌ Actively Hiring Detection failed at ${moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss")}

Error: ${error.message}
${error.stack || ''}`;

    await transporter.sendMail({
      from: `"Actively Hiring Detection" <${config.notification.email.user}>`,
      to: config.notification.email.recipients,
      subject: `❌ Actively Hiring Detection Failed - ${error.message}`,
      text: errorText
    });

    console.log("📧 Error notification email sent.");
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
    
    // Generate email HTML using template
    const emailHTML = buildActivelyHiringEmailHTML(results.activelyHiringCompanies || []);
    
    // Send success notification
    await notify.success(results, emailHTML);
    
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

