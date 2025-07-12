const puppeteer = require('puppeteer');
const fs = require('fs');

const delay = ms => new Promise(res => setTimeout(res, ms));

class CredJobsScraper {
    constructor(headless = true) {
        this.browser = null;
        this.page = null;
        this.allJobs = [];
        this.headless = headless;
    }

    async initialize() {
        this.browser = await puppeteer.launch({
            headless: this.headless,
            args: ['--no-sandbox', '--start-maximized'],
            defaultViewport: null
        });
        this.page = await this.browser.newPage();
        await this.page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        );
    }

    async navigateToJobsPage() {
        console.log('🌐 Navigating to CRED Careers page...');
        await this.page.goto('https://careers.cred.club/openings', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        await delay(3000);
    }

    async processAllJobsByClicking() {
        let pageCount = 1;

        await this.page.waitForSelector('div.cursor-pointer.border');

        const jobCards = await this.page.$$('div.cursor-pointer.border');
        console.log(`🔗 Found ${jobCards.length} job cards`);

        for (let i = 0; i < jobCards.length; i++) {
            console.log(`📝 Processing job ${i + 1}/${jobCards.length}`);

            const jobMeta = await this.page.evaluate((idx) => {
                const cards = document.querySelectorAll('div.cursor-pointer.border');
                const card = cards[idx];
                const getText = (el, sel) => el.querySelector(sel)?.innerText.trim() || '';
                return {
                    title: getText(card, 'div.lowercase'),
                    location: getText(card, 'div.justify-between > div:last-child')
                };
            }, i);

            const refreshedCards = await this.page.$$('div.cursor-pointer.border');
            if (!refreshedCards[i]) continue;

            await Promise.all([
                refreshedCards[i].click(),
                this.page.waitForSelector('iframe', { timeout: 15000 })
            ]);

            await delay(1500);

            const frameHandle = await this.page.$('iframe');
            if (!frameHandle) {
                console.warn('⚠️ iframe not found. Skipping...');
                await this.page.goBack({ waitUntil: 'networkidle2' });
                await delay(1500);
                continue;
            }

            let frame = null;
            try {
                frame = await frameHandle.contentFrame();
            } catch (err) {
                console.warn(`⚠️ Failed to access iframe: ${err.message}`);
                await this.page.goBack({ waitUntil: 'networkidle2' });
                await delay(1500);
                continue;
            }

            if (!frame) {
                console.warn('⚠️ Frame content is null. Skipping...');
                await this.page.goBack({ waitUntil: 'networkidle2' });
                await delay(1500);
                continue;
            }

            await delay(1000);

            const jobDetails = await frame.evaluate(() => {
                const paragraphs = Array.from(document.querySelectorAll('div[data-qa="job-details"] p'));
                return {
                    description: paragraphs.map(p => p.innerText.trim()).join('\n\n') || ''
                };
            });

            jobDetails.title = jobMeta.title;
            jobDetails.location = jobMeta.location;
            jobDetails.url = this.page.url();
            jobDetails.company = 'CRED';
            jobDetails.scrapedAt = new Date().toISOString();

            this.allJobs.push(jobDetails);
            console.log(`✅ Collected: ${jobDetails.title}`);

            await this.page.goBack({ waitUntil: 'networkidle2' });
            await delay(2000);
        }
    }

    async saveResults() {
        fs.writeFileSync('credJobs.json', JSON.stringify(this.allJobs, null, 2));
        console.log(`💾 Saved ${this.allJobs.length} jobs to credJobs.json`);
    }

    async close() {
        await this.browser.close();
    }

    async run() {
        try {
            await this.initialize();
            await this.navigateToJobsPage();
            await this.processAllJobsByClicking();
            await this.saveResults();
        } catch (error) {
            console.error('❌ Scraper failed:', error);
        } finally {
            await this.close();
        }
    }
}

// CLI + exportable function
const runCredScraper = async ({ headless = true } = {}) => {
    const scraper = new CredJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

module.exports = runCredScraper;

if (require.main === module) {
    const headless = !process.argv.includes('--headless=false');
    (async () => {
        await runCredScraper({ headless });
    })();
}
