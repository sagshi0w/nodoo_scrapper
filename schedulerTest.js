import moment from "moment-timezone";
import pLimit from "p-limit";
import axios from "axios";
import { createRequire } from 'module';
import fs from 'fs';
import extractData from "./utils/extractData.js";
import sendToBackend from "./utils/sendToBackend.js";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const require = createRequire(import.meta.url);
const nodemailer = require('nodemailer');

// ✅ Scrapers
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

import runInfosysScraper from "./scrapers/servicebased/infosys.js";
import runAspireSystemScraper from "./scrapers/servicebased/aspireSystem.js"
import runEclerxScraper from "./scrapers/servicebased/eclerx.js"
import runSaskenScraper from "./scrapers/servicebased/sasken.js"
import runIBSSoftwareJobsScraper from "./scrapers/servicebased/nousInfosystems.js"
import runNousInfosystemsJobsScraper from "./scrapers/servicebased/nousInfosystems.js"
import runNTTDataJobsScraper from "./scrapers/servicebased/nttData.js"
import runCGIJobsScraper from "./scrapers/servicebased/cgi.js"
import runMindFireSolutionsJobsScraper from "./scrapers/servicebased/mindFireSolutions.js"
import runMavericJobsScraper from "./scrapers/servicebased/maveric.js"
import runYashTechnologiesJobsScraper from "./scrapers/servicebased/yashTechnologies.js"
import runSynechronJobsScraper from "./scrapers/servicebased/synechron.js"

import runQuinnoxJobsScraper from "./scrapers/servicebased/quinnox.js"
import runInfogainJobsScraper from "./scrapers/servicebased/infogain.js"
import runThreeiInfotechJobsScraper from "./scrapers/servicebased/threeiInfotech.js"
import runCybageJobsScraper from "./scrapers/servicebased/cybage.js"
import runExperionTechnologiesJobsScraper from "./scrapers/servicebased/experionTechnologies.js"
import runCLoverInfotechJobsScraper from "./scrapers/servicebased/cloverInfotech.js"
import runIncedoJobsScraper from "./scrapers/servicebased/incedo.js"
import runNetSolutionsJobsScraper from "./scrapers/servicebased/netSolutions.js"
import runWNSJobsScraper from "./scrapers/servicebased/WNS.js"
import runThoughtFocusJobsScraper from "./scrapers/servicebased/ThoughtFocus.js"
import runTezoJobsScraper from "./scrapers/servicebased/tezo.js"
import runSaviantConsultingJobsScraper from "./scrapers/servicebased/SaviantConsulting.js"

import runTextbookJobsScraper from "./scrapers/productBased/textbook.js"
import runKhanAcademyJobsScraper from "./scrapers/productBased/khanAcademy.js"
import runPractoJobsScraper from "./scrapers/productBased/practo.js"
import runNaviJobsScraper from "./scrapers/productBased/navi.js"
import runFreechargeJobsScraper from "./scrapers/productBased/freecharge.js"
import runUpstoxJobsScraper from "./scrapers/productBased/upstox.js"
import runLocusJobsScraper from "./scrapers/productBased/Locus.js"
import runFyndJobsScraper from "./scrapers/productBased/Fynd.js"
import runHcltechJobsScraper from "./scrapers/servicebased/hclTech.js"

import runRamcoSystemsJobsScraper from "./scrapers/servicebased/RamcoSystems.js"
import runCapgeminiJobsScraper from "./scrapers/servicebased/Capgemini.js"
import runDeloitteJobsScraper from "./scrapers/servicebased/Deloitte.js"
import runPwCIndiaJobsScraper from "./scrapers/servicebased/PwCIndia.js"

// 01.09.2025
import runOracleJobsScraper from "./scrapers/productBased/oracle.js"
import runTanlaJobsScraper from "./scrapers/servicebased/tanla.js"

// 02.09.2025
import MotivityLabs from "./scrapers/servicebased/motivityLabs.js"

// 03.09.2025
import Accelya from "./scrapers/servicebased/accelya.js"

// 04.09.2025
import  SoftTech from "./scrapers/servicebased/softTech.js"
import  Cybertech from "./scrapers/servicebased/cybertech.js"

// 05.09.2025
import  VirtualGalaxy from "./scrapers/servicebased/virtualGalaxy.js"

// 07.09.2025
import  DRCSystems from "./scrapers/servicebased/DRCSystems.js"
import  TrigynTechnologies from "./scrapers/servicebased/trigynTechnologies.js"

// 08.09.2025
import  RSSoftware from "./scrapers/servicebased/rsSoftware.js"
import  SarvamAI from "./scrapers/servicebased/sarvam-ai.js"
import  MetaForms from "./scrapers/servicebased/metaforms.js"

// 09.09.2025
import  Atomicwork from "./scrapers/servicebased/atomicwork.js"
import  TrueFoundary from "./scrapers/servicebased/trueFoundary.js"
import  Repello from "./scrapers/servicebased/repelloAI.js"
import  Neysa from "./scrapers/servicebased/neysa.js"
import  Realfast from "./scrapers/servicebased/realfast.js"
import  Spyne from "./scrapers/servicebased/spyne.js"
import  Procol from "./scrapers/servicebased/procol.js"

// Not working scrappers:
import runTataMgJobsScraper from "./scrapers/productBased/tata1mg.js"
import runGlobalLogicJobsScraper from "./scrapers/servicebased/GlobalLogic.js"
import runCognizantJobsScraper from "./scrapers/servicebased/Cognizant.js"

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
    success: async (stats) => {
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
            text: summaryText
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
    //   { fn: Procol, headless: true },
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

        if (allJobs.length > 0) {
            const enrichedJobs = allJobs.map(job => extractData(job));
            console.log("enrichedJobs=", enrichedJobs);
            //await sendToBackend(enrichedJobs);
            //console.log(`📤 Sent ${enrichedJobs.length} jobs to backend`);
        }

        const endTime = moment().tz("Asia/Kolkata");
        stats.endTime = endTime.format("YYYY-MM-DD HH:mm:ss");
        stats.duration = moment.duration(endTime.diff(startTime)).asMinutes().toFixed(2);

        console.log(`✅ [${stats.endTime}] Scraping Summary:
    - Success: ${stats.successCount}
    - Fail: ${stats.failCount}
    - Total jobs: ${stats.totalJobs}
    - Duration: ${stats.duration} mins`);

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
