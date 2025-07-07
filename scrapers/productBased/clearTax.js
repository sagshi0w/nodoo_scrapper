import { launch } from 'puppeteer';
import { writeFileSync } from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class CleartaxJobsScraper {
    constructor() {
        this.browser = null;
        this.page = null;
        this.allJobs = [];
        this.jobLinks = [];
    }

    async initialize() {
        this.browser = await launch({
            headless: false,
            args: ['--no-sandbox', '--start-maximized'],
            defaultViewport: null
        });
        this.page = await this.browser.newPage();
        await this.page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        );
    }

    async navigateToJobsPage() {
        console.log('🌐 Navigating to Groww Careers page...');
        await this.page.goto('https://clear.darwinbox.in/ms/candidate/careers', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        console.log('📋 Collecting job links...');

        //while (true) {
            // Collect job URLs

            await delay(2000);
            const newJobUrls = await this.page.evaluate(() => {
                return Array.from(document.querySelectorAll('td[data-th="Job title"] a[href]'))
                    .map(a => a.href);  // get the full absolute URL
            });

            for (const url of newJobUrls) {
                this.jobLinks.push(url);
            }

            console.log(`🔗 Found ${this.jobLinks.length} unique job links so far...`);

            // const loadMoreSelector = 'button.iconNext';

            // const loadMoreBtn = await this.page.$(loadMoreSelector);
            // if (!loadMoreBtn) {
            //     console.log('❌ No more "Load more" button — all jobs loaded.');
            //     break;
            // }

            // try {
            //     console.log('🔄 Clicking "Load more"...');

            //     await this.page.evaluate(selector => {
            //         const btn = document.querySelector(selector);
            //         if (btn) {
            //             btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            //         }
            //     }, loadMoreSelector);

            //     await this.page.waitForSelector(loadMoreSelector, { visible: true, timeout: 5000 });
            //     await loadMoreBtn.click();
            //     await delay(2000);
            // } catch (err) {
            //     console.warn(`⚠️ Skipping click due to error: ${err.message}`);
            //     break;
            // }
        //}

        console.log(`✅ Total unique jobs collected: ${this.jobLinks.length}`);
    }


    async extractJobDetailsFromLink(url) {
        const jobPage = await this.browser.newPage();
        try {
            await jobPage.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            const jobData = await jobPage.evaluate(() => {
                const getText = (sel) => document.querySelector(sel)?.innerText.trim() || '';

                const title = getText('h4.display-2.custom-theme-color');
                const location = getText('p.mb-4.tooltip-custom');
                //const experience = getText('body > app-root > div > app-user-views > div.module-container > app-jobs-wrapper > app-job-details > div > div.box.job-main-details.p-24.clearfix.mb-12 > div.job-details-list > div.job-details > div.job-details-item.experience-range > pbody > app-root > div > app-user-views > div.module-container > app-jobs-wrapper > app-job-details > div > div.box.job-main-details.p-24.clearfix.mb-12 > div.job-details-list > div.job-details > div.job-details-item.experience-range');
                const description = getText('div.job-summary');

                return {
                    title,
                    location,
                    //experience,
                    description,
                    url: window.location.href
                };
            });

            await jobPage.close();
            return { ...jobData};
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

            if(jobData.title && !seen.has(jobData.title)){
                seen.add(jobData.title);

                this.allJobs.push(jobData);

                console.log(`✅ ${jobData.title}`);
            }
        }
    }

    async saveResults() {
        writeFileSync('clearTaxJobs.json', JSON.stringify(this.allJobs, null, 2));
        console.log(`💾 Saved ${this.allJobs.length} jobs to clearTaxJobs.json`);
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

(async () => {
    const scraper = new CleartaxJobsScraper();
    await scraper.run();
})();
