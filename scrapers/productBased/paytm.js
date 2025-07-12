import { launch } from 'puppeteer';
import { writeFileSync } from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class PaytmJobsScraper {
    constructor(headless = true) {
        this.headless = headless;
        this.browser = null;
        this.page = null;
        this.allJobs = [];
        this.jobLinks = [];
    }

    async initialize() {
        this.browser = await launch({
            headless: this.headless,
            args: ['--no-sandbox', ...(this.headless ? [] : ['--start-maximized'])],
            defaultViewport: this.headless ? { width: 1920, height: 1080 } : null
        });
        this.page = await this.browser.newPage();
        await this.page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        );
    }

    async navigateToJobsPage() {
        console.log('🌐 Navigating to Paytm Careers page...');
        await this.page.goto('https://jobs.lever.co/paytm?', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        console.log('📋 Collecting job links...');
        await delay(2000);
        const newJobUrls = await this.page.evaluate(() => {
            return Array.from(document.querySelectorAll('a.posting-title'))
                .map(a => a.href);
        });
        this.jobLinks.push(...newJobUrls);
        console.log(`✅ Total unique jobs collected: ${this.jobLinks.length}`);
    }

    async extractJobDetailsFromLink(url) {
        const jobPage = await this.browser.newPage();
        try {
            await jobPage.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            const jobData = await jobPage.evaluate(() => {
                const getText = (sel) => document.querySelector(sel)?.innerText.trim() || '';
                return {
                    title: getText('h2'),
                    location: getText('div.location'),
                    description: getText('div[data-qa="job-description"]'),
                    url: window.location.href
                };
            });

            await jobPage.close();
            return jobData;
        } catch (err) {
            await jobPage.close();
            console.warn(`⚠️ Failed to extract from ${url}:`, err.message);
            return { title: '', location: '', description: '', url };
        }
    }

    async processAllJobs() {
        const seen = new Set();
        for (let i = 0; i < this.jobLinks.length; i++) {
            console.log(`📝 Processing job ${i + 1}/${this.jobLinks.length}`);
            const jobData = await this.extractJobDetailsFromLink(this.jobLinks[i]);
            if (jobData.title && !seen.has(jobData.title)) {
                seen.add(jobData.title);
                this.allJobs.push(jobData);
                console.log(`✅ ${jobData.title}`);
            }
        }
    }

    async saveResults() {
        writeFileSync('paytmJobs.json', JSON.stringify(this.allJobs, null, 2));
        console.log(`💾 Saved ${this.allJobs.length} jobs to paytmJobs.json`);
    }

    async close() {
        await this.browser.close();
    }

    async run() {
        try {
            await this.initialize();
            await this.navigateToJobsPage();
            await this.collectAllJobCardLinks();
            await this.processAllJobs();
            await this.saveResults();
        } catch (error) {
            console.error('❌ Scraper failed:', error);
        } finally {
            await this.close();
        }
    }
}

// ✅ Exportable function
const runPaytmScraper = async ({ headless = true } = {}) => {
    const scraper = new PaytmJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runPaytmScraper;

// ✅ CLI support: node paytm.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await runPaytmScraper({ headless: headlessArg });
    })();
}
