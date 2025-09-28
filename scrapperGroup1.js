import moment from "moment-timezone";
import pLimit from "p-limit";
import { createRequire } from 'module';
import fs from 'fs';
import extractData from "./utils/extractData.js";
import sendToBackend from "./utils/sendToBackend.js";
import { buildInsertedJobsEmailHTML } from "./utils/emailTemplates.js";
import shuffleJobsAvoidStackingSameCompany from "./utils/jobShuffler.js";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const require = createRequire(import.meta.url);
const nodemailer = require('nodemailer');

// ✅ Scrapers
import RSSoftware from "./scrapers/servicebased/rsSoftware.js"
import SarvamAI from "./scrapers/servicebased/sarvam-ai.js"
import MetaForms from "./scrapers/servicebased/metaforms.js"
import Atomicwork from "./scrapers/servicebased/atomicwork.js"
import TrueFoundary from "./scrapers/servicebased/trueFoundary.js"
import Repello from "./scrapers/servicebased/repelloAI.js"
import Neysa from "./scrapers/servicebased/neysa.js"
import Realfast from "./scrapers/servicebased/realfast.js"
import Spyne from "./scrapers/servicebased/spyne.js"
import Procol from "./scrapers/servicebased/procol.js"
import Uniphore from "./scrapers/servicebased/uniphore.js"
import GoKwik from "./scrapers/servicebased/GoKwik.js"
import Coreworks from "./scrapers/servicebased/Coreworks.js"
import Jhana from "./scrapers/servicebased/jhana.js"
import Spendflo from "./scrapers/servicebased/Spendflo.js"
import RevenueHero from "./scrapers/servicebased/RevenueHero.js"
import Fello from "./scrapers/servicebased/fello.js"
import Doqfy from "./scrapers/servicebased/Doqfy.js"
import Bullet from "./scrapers/servicebased/Bullet.js"
import SKF from "./scrapers/servicebased/skf.js"
import Cummins from "./scrapers/servicebased/cummins.js"
import Fuled from "./scrapers/remote/fuled.js"
import Bosch from "./scrapers/servicebased/bosch.js"
import onePassword from "./scrapers/remote/onePassword.js"

const config = {
    concurrency: 5,
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

const notify = {
    success: async (stats, htmlContent) => {
        const summaryText = `✅ Scraping completed at ${stats.endTime}
⏱ Duration: ${stats.duration} minutes
🟢 Successful scrapers: ${stats.successCount}
🔴 Failed scrapers: ${stats.failCount}
📦 Total jobs found: ${stats.totalJobs}

📊 Jobs per company:
${stats.scraperBreakdown.map(s => `- ${s.name}: ${s.count} jobs`).join('\n')}
`;

        // Write to file for GitHub Actions (optional)
        fs.writeFileSync('scrape_summary.txt', summaryText);

        await transporter.sendMail({
            from: `"Job Scraper" <${config.notification.email.user}>`,
            to: config.notification.email.recipients,
            subject: `✅ Job Scraping Success (${stats.successCount} scrapers)`,
            text: summaryText,
            html: htmlContent || undefined
        });

        console.log("📧 Success notification email sent.");
    },

    error: async (error, context = {}) => {
        const text = `❌ Job Scraping Failed
Error: ${error.message}
Time: ${moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss")}
Context: ${JSON.stringify(context, null, 2)}
Stack Trace:
${error.stack}`;

        await transporter.sendMail({
            from: `"Job Scraper" <${config.notification.email.user}>`,
            to: config.notification.email.recipients,
            subject: "❌ Job Scraping Failed",
            text
        });

        console.log("📧 Error notification email sent.");
    }
};

const scrapers = [
    { fn: RSSoftware, headless: true },
    { fn: SarvamAI, headless: true },
    { fn: MetaForms, headless: true },
    { fn: Atomicwork, headless: true },
    { fn: TrueFoundary, headless: true },
    { fn: Repello, headless: true },
    { fn: Neysa, headless: true },
    { fn: Realfast, headless: true },
    { fn: Spyne, headless: true },
    { fn: Procol, headless: true },
    { fn: Uniphore, headless: true },
    { fn: GoKwik, headless: true },
    { fn: Coreworks, headless: true },
    { fn: Jhana, headless: true },
    { fn: Spendflo, headless: true },
    { fn: RevenueHero, headless: true },
    { fn: Fello, headless: true },
    { fn: Doqfy, headless: true },
    { fn: Bullet, headless: true },
    { fn: SKF, headless: true },
    { fn: Cummins, headless: true },
    { fn: Fuled, headless: true },
    { fn: Bosch, headless: true },
    { fn: onePassword, headless: true },
];

const runAllScrapers = async () => {
    const startTime = moment().tz("Asia/Kolkata");
    const stats = {
        startTime: startTime.format("YYYY-MM-DD HH:mm:ss"),
        successCount: 0,
        failCount: 0,
        totalJobs: 0,
        errors: [],
        scraperBreakdown: []
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
                    stats.scraperBreakdown.push({ name, count: result.value.length });
                    allJobs.push(...result.value);
                } else {
                    console.warn("⚠️ Result from", name, "is not an array.");
                }
            } else {
                stats.failCount++;
                stats.errors.push({ scraper: name, error: result.reason.message });
                console.error(`❌ ${name} failed:`, result.reason);
            }
        });

        stats.totalJobs = allJobs.length;
        console.log('Number of jobs found = ', allJobs.length)

        let emailHTML = null;
        if (allJobs.length > 0) {
            const enrichedJobs = allJobs.map(job => extractData(job));
            const shuffledJobs = shuffleJobsAvoidStackingSameCompany(enrichedJobs);
            let backendSummary = null;
            try {
                backendSummary = await sendToBackend(shuffledJobs);
            } catch (e) {
                backendSummary = null;
            }
            emailHTML = buildInsertedJobsEmailHTML(enrichedJobs, backendSummary);
        }

        const endTime = moment().tz("Asia/Kolkata");
        stats.endTime = endTime.format("YYYY-MM-DD HH:mm:ss");
        stats.duration = moment.duration(endTime.diff(startTime)).asMinutes().toFixed(2);

        console.log(`✅ [${stats.endTime}] Scraping Summary:
    - Success: ${stats.successCount}
    - Fail: ${stats.failCount}
    - Total jobs: ${stats.totalJobs}
    - Duration: ${stats.duration} mins`);

        await notify.success(stats, emailHTML);
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
