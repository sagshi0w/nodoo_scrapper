import { launch } from 'puppeteer';
import { writeFileSync } from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class AdobeJobsScraper {
    constructor(headless = true) {
        this.headless = headless;
        this.browser = null;
        this.page = null;
        this.allJobs = [];
        this.jobCardSelectors = [];
    }

    async initialize() {
        this.browser = await launch({
            headless: this.headless ? true : false,
            args: ['--no-sandbox', ...(this.headless ? [] : ['--start-maximized'])],
            defaultViewport: this.headless ? { width: 1920, height: 1080 } : null
        });

        this.page = await this.browser.newPage();
        await this.page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        );
    }

    async navigateToJobsPage() {
        console.log('🌐 Navigating to Adobe Careers page...');
        await this.page.goto('https://careers.adobe.com/us/en/search-results?keywords=India&from=190&s=1', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        console.log('📋 Collecting job links from all pages...');
        let pageCount = 1;

        while (true) {
            console.log(`🔎 Scraping page ${pageCount}...`);

            const cards = await this.page.$$eval('a[data-ph-at-id="job-link"]', anchors =>
                anchors.map(anchor => anchor.href)
            );

            this.jobCardSelectors.push(...cards);

            const nextBtn = await this.page.$('a[data-ph-at-id="pagination-next-link"]');
            if (!nextBtn) {
                console.log('🚫 No more pages. Pagination ended.');
                break;
            }

            await Promise.all([
                nextBtn.click(),
                this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
            ]);

            await delay(5000);
            pageCount++;
        }

        console.log(`✅ Total jobs found: ${this.jobCardSelectors.length}`);
    }

    async extractJobDetailsFromLink(url) {
        const jobPage = await this.browser.newPage();
        try {
            await jobPage.goto(url, { waitUntil: 'networkidle2' });

            await jobPage.waitForSelector('body > main > div.body-wrapper.ph-page-container', { timeout: 10000 });

            const jobDetails = await jobPage.evaluate(() => {
                const getText = sel => {
                    const el = document.querySelector(sel);
                    return el ? el.innerText.trim() : '';
                };

                return {
                    title: getText('h1.job-title'),
                    company: 'Adobe',
                    location: getText('.job-info[data-ph-at-job-location-text]'),
                    description: getText('body > main > div.body-wrapper.ph-page-container > div > div.job-page-external > div > div > div.col-lg-8.col-md-8.col-sm-12 > section:nth-child(2) > div > section.job-description.au-target.phw-widget-ctr-nd'),
                };
            });

            await jobPage.close();
            return { ...jobDetails, url };
        } catch (err) {
            await jobPage.close();
            console.warn(`⚠️ Failed to extract from ${url}:`, err.message);
            return { title: '', location: '', description: '', url };
        }
    }

    async processAllJobs() {
        for (let i = 0; i < this.jobCardSelectors.length; i++) {
            console.log(`📝 Processing job ${i + 1}/${this.jobCardSelectors.length}`);
            const jobData = await this.extractJobDetailsFromLink(this.jobCardSelectors[i]);
            jobData.scrapedAt = new Date().toISOString();
            this.allJobs.push(jobData);
        }
    }

    async saveResults() {
        writeFileSync('./scrappedJobs/adobeJobs.json', JSON.stringify(this.allJobs, null, 2));
        console.log(`💾 Saved ${this.allJobs.length} jobs to adobeJobs.json`);
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

const runAdobeScraper = async ({ headless = true } = {}) => {
    const scraper = new AdobeJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runAdobeScraper;

// CLI support
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        const scraper = new AdobeJobsScraper(headlessArg);
        await scraper.run();
    })();
}
