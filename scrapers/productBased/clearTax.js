import { launch } from 'puppeteer';
import { writeFileSync } from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

const extractClearTaxData = (job) => {
    if (!job) return null;

    return {
        ...job,
        title: job.title?.trim() || '',
        location: job.location?.trim() || '',
        description: job.description?.trim() || '',
        company: 'ClearTax',
        scrapedAt: new Date().toISOString()
    };
};

class CleartaxJobsScraper {
    constructor(headless = true) {
        this.browser = null;
        this.page = null;
        this.allJobs = [];
        this.jobLinks = [];
        this.headless = headless;
    }

    async initialize() {
        this.browser = await launch({
            headless: this.headless ? true : false,
            args: ['--no-sandbox', '--start-maximized'],
            defaultViewport: null
        });
        this.page = await this.browser.newPage();
        await this.page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        );
    }

    async navigateToJobsPage() {
        console.log('🌐 Navigating to ClearTax Careers page...');
        await this.page.goto('https://clear.darwinbox.in/ms/candidate/careers', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        console.log('📋 Collecting job links...');
        await delay(2000);
        const newJobUrls = await this.page.evaluate(() => {
            return Array.from(document.querySelectorAll('td[data-th="Job title"] a[href]'))
                .map(a => a.href);
        });

        for (const url of newJobUrls) {
            this.jobLinks.push(url);
        }

        console.log(`✅ Total unique jobs collected: ${this.jobLinks.length}`);
    }

    async extractJobDetailsFromLink(url) {
        const jobPage = await this.browser.newPage();
        try {
            await jobPage.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            const jobData = await jobPage.evaluate(() => {
                const getText = sel => document.querySelector(sel)?.innerText.trim() || '';
                return {
                    title: getText('h4.display-2.custom-theme-color'),
                    location: getText('p.mb-4.tooltip-custom'),
                    description: getText('div.job-summary'),
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
                const enriched = extractClearTaxData(jobData);
                this.allJobs.push(enriched);
                console.log(`✅ ${jobData.title}`);
            }
        }
    }

    async saveResults() {
        // writeFileSync('./scrappedJobs/clearTaxJobs.json', JSON.stringify(this.allJobs, null, 2));
        console.log(`💾 Scraped ${this.allJobs.length} jobs from ClearTax`);
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

// Callable runner function
const runClearTaxScraper = async ({ headless = true } = {}) => {
    const scraper = new CleartaxJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runClearTaxScraper;

// CLI support
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await runClearTaxScraper({ headless: headlessArg });
    })();
}
