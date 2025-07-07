import cron from "node-cron";
import runAckoScraper from "./scrapers/productBased/acko.js";
import runAmazonScraper from "./scrapers/productBased/amazon.js";
import extractData from "./utils/extractData.js";
import sendToBackend from "./sendToBackend.js";

const runAllScrapers = async () => {
  try {
    console.log("🔁 Starting automated job scraping...");

    const ackoJobs = await runAckoScraper();
    const amazonJobs = await runAmazonScraper();

    const allJobs = [...ackoJobs, ...amazonJobs];
    const enrichedJobs = [];

    for (const job of allJobs) {
      const enrichedJob = extractData(job);
      enrichedJobs.push(enrichedJob);
      console.log("📤 Sending job to backend:", JSON.stringify(enrichedJob, null, 2));
    }

    await sendToBackend(enrichedJobs);
    console.log("✅ All jobs processed and sent to DB.");
  } catch (err) {
    console.error("❌ Error during scraping process:", err.message);
  }
};

// Schedule to run every day at 12:00 AM
cron.schedule("0 0 * * *", () => {
  console.log("⏰ Running scheduled job at 12:00 AM...");
  runAllScrapers();
});

// Optional: run once immediately when script starts
runAllScrapers();