import moment from "moment-timezone";
import pLimit from "p-limit";
import axios from "axios";
import { createRequire } from 'module';
import extractData from "./utils/extractData.js";
import sendToBackend from "./utils/sendToBackend.js";

const require = createRequire(import.meta.url);
const nodemailer = require('nodemailer');
require('dotenv').config();

// Scrapers
import runAckoScraper from "./scrapers/productBased/acko.js";
import runAmazonScraper from "./scrapers/productBased/amazon.js";
import runAdobeScraper from "./scrapers/productBased/adobe.js";
import runAtlassianScraper from "./scrapers/productBased/atlassian.js";
import runClearTaxScraper from "./scrapers/productBased/clearTax.js";
import runFlipkartScraper from "./scrapers/productBased/flipkart.js";
import runFreshworksScraper from "./scrapers/productBased/freshworks.js";
import runGoldmanScraper from "./scrapers/productBased/goldmanSach.js";
import runGoogleScraper from "./scrapers/productBased/google.js";
import runGrowwScraper from "./scrapers/productBased/groww.js";
import runMeeshoScraper from "./scrapers/productBased/meesho.js";
import runMicrosoftScraper from "./scrapers/productBased/microsoft.js";
import runPaypalScraper from "./scrapers/productBased/paypal.js";
import runPhonepeScraper from "./scrapers/productBased/phonepe.js";
import runRazorpayScraper from "./scrapers/productBased/razorpay.js";
import runSiemensScraper from "./scrapers/productBased/siemens.js";
import runUberScraper from "./scrapers/productBased/uber.js";
import runZohoScraper from "./scrapers/productBased/zoho.js";

const config = {
  concurrency: 5,
  notification: {
    email: {
      service: "Gmail",
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
      recipients: ["sagar.shinde0113@gmail.com"]
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

const notify = {
  success: async (stats) => {
    const subject = `✅ Job Scraping Success (${stats.successCount} jobs)`;
    const text = `Scraping completed at ${stats.endTime}
Duration: ${stats.duration} minutes
Successful scrapers: ${stats.successCount}
Failed scrapers: ${stats.failCount}
Total jobs found: ${stats.totalJobs}`;

    await transporter.sendMail({
      from: `"Job Scraper" <${config.notification.email.user}>`,
      to: config.notification.email.recipients,
      subject,
      text
    });

    console.log("📧 Success notification email sent.");
  },

  error: async (error, context = {}) => {
    const subject = "❌ Job Scraping Failed";
    const text = `Error: ${error.message}
Time: ${moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss")}
Context: ${JSON.stringify(context, null, 2)}
Stack Trace:
${error.stack}`;

    await transporter.sendMail({
      from: `"Job Scraper" <${config.notification.email.user}>`,
      to: config.notification.email.recipients,
      subject,
      text
    });

    console.log("📧 Error notification email sent.");
  }
};

const scrapers = [
  { fn: runAckoScraper, headless: true },
  { fn: runAmazonScraper, headless: true },
  { fn: runAdobeScraper, headless: true },
  { fn: runAtlassianScraper, headless: true },
  { fn: runClearTaxScraper, headless: false },
  { fn: runFlipkartScraper, headless: true },
  { fn: runFreshworksScraper, headless: true },
  { fn: runGoldmanScraper, headless: true },
  { fn: runGoogleScraper, headless: true },
  { fn: runGrowwScraper, headless: true },
  { fn: runMeeshoScraper, headless: true },
  { fn: runMicrosoftScraper, headless: true },
  { fn: runPaypalScraper, headless: false },
  { fn: runPhonepeScraper, headless: true },
  { fn: runRazorpayScraper, headless: true },
  { fn: runSiemensScraper, headless: true },
  { fn: runUberScraper, headless: true },
  { fn: runZohoScraper, headless: true },
];

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

    const limit = pLimit(config.concurrency);
    const results = await Promise.allSettled(
      scrapers.map(({ fn, headless }) =>
        limit(() => fn({ headless }))
      )
    );

    const allJobs = [];
    results.forEach((result, i) => {
      const name = scrapers[i].fn.name;
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
          scraper: name,
          error: result.reason.message
        });
        console.error(`❌ ${name} failed:`, result.reason);
      }
    });

    stats.totalJobs = allJobs.length;

    if (allJobs.length > 0) {
      const enrichedJobs = allJobs.map(job => extractData(job));
      await sendToBackend(enrichedJobs);
      console.log(`📤 Sent ${enrichedJobs.length} jobs to backend`);
    }

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

runAllScrapers()
  .then(() => {
    console.log("✅ Scraping completed.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Scraping failed:", err);
    process.exit(1);
  });
