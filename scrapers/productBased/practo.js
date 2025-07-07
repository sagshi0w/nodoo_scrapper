const puppeteer = require('puppeteer');
const fs = require('fs');

const delay = ms => new Promise(res => setTimeout(res, ms));

class PractoJobsScraper {
    constructor() {
        this.browser = null;
        this.page = null;
        this.allJobs = [];
        this.jobLinks = [];
        //this.baseURL = 'https://www.atlassian.com';
    }

    async initialize() {
        this.browser = await puppeteer.launch({
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
        console.log('🌐 Navigating to Practo Careers page...');
        await this.page.goto('https://practo.app.param.ai/jobs/', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        console.log('📋 Collecting job links...');

        const jobUrls = await this.page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href^="/jobs/"]'))
            .map(a => a.href);
        });

        this.jobLinks.push(...jobUrls);

        console.log(`✅ Total jobs found: ${this.jobLinks.length}`);
    }

    async extractJobDetailsFromLink(url) {
        const jobPage = await this.browser.newPage();
        try {
            await jobPage.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            await jobPage.waitForSelector('div.text-3xl.font-bold.tracking-tight', { timeout: 10000 });

            const jobData = await jobPage.evaluate(() => {
                const getText = (sel) => document.querySelector(sel)?.innerText.trim() || '';
                const getRichText = (sel) => document.querySelector(sel)?.innerHTML.trim() || '';

                const title = getText('div.text-3xl.sm\\:text-4xl.md\\:text-5xl.lg\\:text-6xl.font-bold');
                const description = getRichText('div.ql-editor');

                const jobDetails = {};
                const blocks = document.querySelectorAll('div.w-full.lg\\:w-40 > div.space-y-2');
                blocks.forEach(block => {
                    const label = block.querySelector('div.text-sm')?.innerText.trim();
                    const value = block.querySelector('span.value')?.innerText.trim();

                    if (label && value) {
                        if (label.includes('Job ID')) jobDetails.jobId = value;
                        else if (label.includes('Job Type')) jobDetails.jobType = value;
                        else if (label.includes('Job Location')) jobDetails.location = value;
                        else if (label.includes('Experience')) jobDetails.experience = value;
                    }
                });

                return {
                    title,
                    location: jobDetails.location || '',
                    description,
                    jobId: jobDetails.jobId || '',
                    jobType: jobDetails.jobType || '',
                    experience: jobDetails.experience || '',
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
        for (let i = 0; i < this.jobLinks.length; i++) {
            console.log(`📝 Processing job ${i + 1}/${this.jobLinks.length}`);
            const jobData = await this.extractJobDetailsFromLink(this.jobLinks[i]);

            if(jobData.title){
                this.allJobs.push(jobData);

                console.log(`✅ ${jobData.title}`);
            }
        }
    }

    async saveResults() {
        fs.writeFileSync('practoJobs.json', JSON.stringify(this.allJobs, null, 2));
        console.log(`💾 Saved ${this.allJobs.length} jobs to practoJobs.json`);
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
    const scraper = new PractoJobsScraper();
    await scraper.run();
})();
