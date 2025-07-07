import { launch } from 'puppeteer';
import { writeFileSync } from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class InfoedgeJobsScraper {
    constructor() {
        this.browser = null;
        this.page = null;
        this.allJobs = [];
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
        console.log('🌐 Navigating to InfoEdge Careers page...');
        await this.page.goto('https://careers.infoedge.com/infoedge/jobslist', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        await delay(5000);
    }

    async processAllJobCards() {
        const seenTitles = new Set();
        let hasMore = true;

        while (hasMore) {
            await delay(2000);

            // Count job cards on current page
            const totalJobs = await this.page.$$eval('lib-job', jobs => jobs.length);
            console.log(`📦 Found ${totalJobs} job cards on current page`);

            for (let i = 0; i < totalJobs; i++) {
                try {
                    console.log(`📝 Processing job ${i + 1}/${totalJobs}`);

                    // Select only the i-th job card freshly
                    const cardHandle = (await this.page.$$('lib-job'))[i];
                    if (!cardHandle) {
                        console.warn(`⚠️ Job card ${i + 1} not found`);
                        continue;
                    }

                    await cardHandle.hover();
                    await delay(500);

                    const applyBtn = await cardHandle.$('button');
                    if (!applyBtn) {
                        console.log(`❌ No Apply button found`);
                        continue;
                    }

                    await applyBtn.click();
                    await this.page.waitForSelector('section', { timeout: 10000 });

                    const jobData = await this.page.evaluate(() => {
                        const getText = (labelText) => {
                            const label = Array.from(document.querySelectorAll('label.attribute-text'))
                                .find(el => el.innerText.trim() === labelText);
                            return label?.parentElement?.nextElementSibling?.innerText.trim() || '';
                        };

                        return {
                            title: document.querySelector('#current_openings > div.container.kohler-joblist-space.ng-star-inserted > div > div > div.col-12.mb-4 > lib-jobs-list > div > div > div:nth-child(1) > lib-job > mat-card > mat-card-header > div')?.innerText.trim() || '',
                            location: getText('Location'),
                            experience: getText('Years Of Exp'),
                            skills: getText('Skills Required'),
                            description: document.querySelector('div.job-view__description')?.innerText.trim() || '',
                            url: window.location.href
                        };
                    });

                    if (jobData.title && !seenTitles.has(jobData.title)) {
                        seenTitles.add(jobData.title);
                        this.allJobs.push(jobData);
                        console.log(`✅ Collected: ${jobData.title}`);
                    } else {
                        console.log(`⚠️ Duplicate or missing title: ${jobData.title}`);
                    }

                    // Return to the job list page
                    //await this.page.goto('https://careers.infoedge.com/infoedge/jobslist', { waitUntil: 'networkidle2' });
                    //await delay(3000);

                } catch (err) {
                    console.warn(`⚠️ Failed job ${i + 1}: ${err.message}`);
                    await this.page.goto('https://careers.infoedge.com/infoedge/jobslist', { waitUntil: 'networkidle2' });
                    await delay(3000);
                }
            }

            // Pagination check
            try {
                const nextBtn = await this.page.$('li.page-item > a.page-link');
                if (nextBtn) {
                    const disabled = await this.page.evaluate(el => el.classList.contains('disabled'), nextBtn);
                    if (disabled) {
                        hasMore = false;
                        console.log('✅ No more pages.');
                    } else {
                        console.log('🔁 Moving to next page...');
                        await nextBtn.click();
                        await delay(5000);
                    }
                } else {
                    hasMore = false;
                    console.log('✅ Pagination button not found — all jobs loaded.');
                }
            } catch (e) {
                console.log('⚠️ Pagination error:', e.message);
                hasMore = false;
            }
        }
    }



    async saveResults() {
        writeFileSync('infoEdgeJobs.json', JSON.stringify(this.allJobs, null, 2));
        console.log(`💾 Saved ${this.allJobs.length} jobs to infoEdgeJobs.json`);
    }

    async close() {
        await this.browser.close();
    }

    async run() {
        try {
            await this.initialize();
            await this.navigateToJobsPage();
            await this.processAllJobCards();
            await this.saveResults();
        } catch (error) {
            console.error('❌ Scraper failed:', error);
        } finally {
            await this.close();
        }
    }
}

(async () => {
    const scraper = new InfoedgeJobsScraper();
    await scraper.run();
})();
