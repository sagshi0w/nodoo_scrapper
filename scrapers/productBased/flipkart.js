import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class FlipkartJobsScraper {
    constructor() {
        this.browser = null;
        this.page = null;
        this.allJobs = [];
    }

    async initialize() {
        this.browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--start-maximized'],
            defaultViewport: null
        });
        this.page = await this.browser.newPage();
        await this.page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        );
    }

    async navigateToJobsPage() {
        console.log('🌐 Navigating to Flipkart Careers page...');
        await this.page.goto('https://www.flipkartcareers.com/#!/joblist', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        await delay(5000);
    }

    async loadAllJobPages() {
        let pageCount = 1;

        while (true) {
            console.log(`📄 On page ${pageCount}, checking for 'Next' button...`);
            const nextBtn = await this.page.$('button.loadmore-btn');
            if (!nextBtn) {
                console.log('🚫 No more pages.');
                break;
            }

            await nextBtn.click();
            console.log('➡️ Clicked next. Waiting for jobs to load...');
            await delay(4000); // Adjust if needed for slower network
            pageCount++;
        }
    }

    async getAllJobCards() {
        const jobCardSelector = 'div.block-h';
        console.log('📋 Collecting all job cards...');
        await this.page.waitForSelector(jobCardSelector, { timeout: 10000 });

        const cardPositions = await this.page.$$eval(jobCardSelector, (_, selector) => {
            return Array.from(document.querySelectorAll(selector)).map((_, idx) => idx);
        }, jobCardSelector);

        console.log(`🔍 Found ${cardPositions.length} job cards`);
        return cardPositions;
    }

    async extractJobDetails(newPage) {
        try {
            const selectors = {
                title: 'h2.defThmSubHeading.align-titleJob.ng-binding:not(.job-location)',
                location: 'h2.defThmSubHeading.align-titleJob.job-location.ng-binding',
                description: '#content > div > section.listing-block.recent-vehicles.customJobVwSection > div:nth-child(3) > div > div > div'
            };

            await newPage.waitForSelector(selectors.title, { timeout: 20000 });
            await newPage.waitForSelector(selectors.location, { timeout: 20000 });

            return await newPage.evaluate((sel) => {
                const getText = selector => {
                    const el = document.querySelector(selector);
                    return el ? el.textContent.trim() : '';
                };
                const getHTML = selector => {
                    const el = document.querySelector(selector);
                    return el ? el.innerHTML.trim() : '';
                };

                return {
                    title: getText(sel.title),
                    company: 'Flipkart',
                    location: getText(sel.location),
                    description: getText(sel.description)
                };
            }, selectors);
        } catch (err) {
            console.warn('⚠️ Failed to extract job details:', err.message);
            return {
                title: '',
                location: '',
                description: ''
            };
        }
    }

    async processJobCardsByIndex(cardIndexes) {
        const jobCards = await this.page.$$('div.block-h');

        for (let i = 0; i < cardIndexes.length; i++) {
            try {
                console.log(`📝 Processing job ${i + 1}/${cardIndexes.length}`);
                const index = cardIndexes[i];

                const pagesBefore = await this.browser.pages();
                await jobCards[index].click();
                await delay(3000);

                const pagesAfter = await this.browser.pages();
                const newPage = pagesAfter.find(p => !pagesBefore.includes(p));

                if (!newPage) {
                    console.warn(`⚠️ No new tab opened for job ${i + 1}`);
                    continue;
                }

                await newPage.bringToFront();
                await newPage.waitForNetworkIdle({ timeout: 10000 });

                const jobDetails = await this.extractJobDetails(newPage);

                this.allJobs.push({
                    ...jobDetails,
                    url: newPage.url(),
                    //scrapedAt: new Date().toISOString()
                });

                await newPage.close();
            } catch (err) {
                console.error(`❌ Failed to process job ${i + 1}:`, err.message);
                fs.appendFileSync('failed_jobs.txt', `Job ${i + 1} | Error: ${err.message}\n`);
            }
        }
    }

    async saveResults() {
        fs.writeFileSync('flipkartJobs.json', JSON.stringify(this.allJobs, null, 2));
        console.log(`💾 Saved ${this.allJobs.length} jobs to flipkartJobs.json`);
    }

    async close() {
        await this.browser.close();
    }

    async run() {
        try {
            await this.initialize();
            await this.navigateToJobsPage();
            await this.loadAllJobPages();

            const cardIndexes = await this.getAllJobCards();
            await this.processJobCardsByIndex(cardIndexes);
            await this.saveResults();
        } catch (error) {
            console.error('❌ Scraper failed:', error);
        } finally {
            await this.close();
        }
    }
}

const runFlipkartScraper = async () => {
    const scraper = new FlipkartJobsScraper();
    await scraper.run();
    return scraper.allJobs;
};

export default runFlipkartScraper;

if (import.meta.url === `file://${process.argv[1]}`) {
    (async () => {
        await runFlipkartScraper();
    })();
}
