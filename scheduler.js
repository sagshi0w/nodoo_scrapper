import cron from "node-cron";
import moment from "moment-timezone";
import pLimit from "p-limit";
import axios from "axios";
import { createRequire } from 'module';
import extractData from "./utils/extractData.js";
import sendToBackend from "./utils/sendToBackend.js";

const require = createRequire(import.meta.url);
const nodemailer = require('nodemailer');

require('dotenv').config();

console.log(process.env.EMAIL_USER);

// Import all scrapers
// A:
import runAckoScraper from "./scrapers/productBased/acko.js";
import runAmazonScraper from "./scrapers/productBased/amazon.js";
import runAdobeScraper from "./scrapers/productBased/adobe.js";
import runAtlassianScraper from "./scrapers/productBased/atlassian.js";

// C:
import runClearTaxScraper from "./scrapers/productBased/clearTax.js";

// F:
import runFlipkartScraper from "./scrapers/productBased/flipkart.js";
import runFreshworksScraper from "./scrapers/productBased/freshworks.js";

// G:
import runGoldmanScraper from "./scrapers/productBased/goldmanSach.js";
import runGoogleScraper from "./scrapers/productBased/google.js";
import runGrowwScraper from "./scrapers/productBased/groww.js";

// M:
import runMeeshoScraper from "./scrapers/productBased/meesho.js";
import runMicrosoftScraper from "./scrapers/productBased/microsoft.js";

// P:
import runPaypalScraper from "./scrapers/productBased/paypal.js";
import runPhonepeScraper from "./scrapers/productBased/phonepe.js";

// R:
import runRazorpayScraper from "./scrapers/productBased/razorpay.js";

// S:
import runSiemensScraper from "./scrapers/productBased/siemens.js";

// U:
import runUberScraper from "./scrapers/productBased/uber.js";

// Z:
import runZohoScraper from "./scrapers/productBased/zoho.js";


// Configuration
const config = {
  concurrency: 5, // Number of scrapers to run in parallel
  notification: {
    email: {
      service: "Gmail",
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
      recipients: ["sagar.shinde0113@gmail.com"]
    },
    slack: {
      webhookUrl: process.env.SLACK_WEBHOOK
    }
  }
};

// Initialize email transporter
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
    const subject = `✅ Job Scraping Success (${stats.successCount} jobs)`;
    const text = `
      Scraping completed at ${stats.endTime}
      Duration: ${stats.duration} minutes
      Successful scrapers: ${stats.successCount}
      Failed scrapers: ${stats.failCount}
      Total jobs found: ${stats.totalJobs}
    `;

    // Send email
    await transporter.sendMail({
      from: `"Job Scraper" <${config.notification.email.user}>`,
      to: config.notification.email.recipients,
      subject,
      text
    });

    // Send Slack notification
    if (config.notification.slack.webhookUrl) {
      await axios.post(config.notification.slack.webhookUrl, {
        text: subject,
        attachments: [{
          color: "good",
          fields: Object.entries(stats).map(([key, value]) => ({
            title: key,
            value: String(value),
            short: true
          }))
        }]
      });
    }
  },

  error: async (error, context = {}) => {
    const subject = "❌ Job Scraping Failed";
    const text = `
      Error: ${error.message}
      Time: ${moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss")}
      Context: ${JSON.stringify(context, null, 2)}
      Stack Trace:
      ${error.stack}
    `;

    await transporter.sendMail({
      from: `"Job Scraper" <${config.notification.email.user}>`,
      to: config.notification.email.recipients,
      subject,
      text
    });

    if (config.notification.slack.webhookUrl) {
      await axios.post(config.notification.slack.webhookUrl, {
        text: subject,
        attachments: [{
          color: "danger",
          text: error.message,
          fields: Object.entries(context).map(([key, value]) => ({
            title: key,
            value: String(value),
            short: true
          }))
        }]
      });
    }
  }
};

// Enhanced scraper runner with parallel execution
const runAllScrapers = async () => {
  const startTime = moment().tz("Asia/Kolkata");
  const stats = {
    startTime: startTime.format("YYYY-MM-DD HH:mm:ss"),
    successCount: 0,
    failCount: 0,
    totalJobs: 0,
    errors: []
  };

  try {
    console.log(`⏰ [${stats.startTime}] Starting all scrapers...`);

    //List of all scraper functions
    const scrapers = [
      runAckoScraper, runAmazonScraper, runAdobeScraper, runAtlassianScraper, runClearTaxScraper,
      runFlipkartScraper, runFreshworksScraper, runGoldmanScraper, runGoogleScraper, runGrowwScraper,
      runMeeshoScraper, runMicrosoftScraper, runPaypalScraper, runPhonepeScraper, runRazorpayScraper,
      runSiemensScraper, runUberScraper, runZohoScraper
    ];

    // const scrapers = [
    //   runPaypalScraper
    // ]

    // Run scrapers with concurrency control
    const limit = pLimit(config.concurrency);
    const results = await Promise.allSettled(
      scrapers.map(scraper => limit(() => scraper()))
    );

    // Process results
    const allJobs = [];
    results.forEach((result, i) => {
      if (result.status === "fulfilled") {
        if (Array.isArray(result.value)) {
          stats.successCount++;
          allJobs.push(...result.value);
        } else {
          console.warn("⚠️ Scraper fulfilled but result is not an array:", result.value);
        }
      } else {
        stats.failCount++;
        stats.errors.push({
          scraper: scrapers[i].name,
          error: result.reason.message
        });
        console.error(`❌ ${scrapers[i].name} failed:`, result.reason);
      }
    });

    stats.totalJobs = allJobs.length;

    // Process and send jobs
    if (allJobs.length > 0) {
      const enrichedJobs = allJobs.map(job => extractData(job));
      await sendToBackend(enrichedJobs);
      console.log(`📤 Sent ${enrichedJobs.length} jobs to backend`);
    }

    // Final stats
    const endTime = moment().tz("Asia/Kolkata");
    stats.endTime = endTime.format("YYYY-MM-DD HH:mm:ss");
    stats.duration = moment.duration(endTime.diff(startTime)).asMinutes().toFixed(2);

    console.log(`
      ✅ [${stats.endTime}] Completed with:
      - ${stats.successCount} successful scrapers
      - ${stats.failCount} failed scrapers
      - ${stats.totalJobs} total jobs found
      - Duration: ${stats.duration} minutes
    `);

    await notify.success(stats);
    return stats;
  } catch (error) {
    stats.endTime = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
    console.error("❌ Critical error:", error);
    await notify.error(error, stats);
    throw error;
  }
};

// Scheduled job with error handling
cron.schedule("0 2 * * *", async () => {
  console.log("🔄 Starting scheduled job run...");
  try {
    await runAllScrapers();
  } catch (error) {
    console.error("Scheduled job failed completely:", error);
  }
}, {
  scheduled: true,
  timezone: "Asia/Kolkata"
});

// Immediate run for testing (comment out in production)
// await runAllScrapers();

console.log("🔄 Job scheduler initialized (runs daily at 8:00 AM IST)");