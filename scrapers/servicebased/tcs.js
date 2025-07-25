import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class TcsJobsScraper {
    constructor(headless = true) {
        this.headless = headless;
        this.browser = null;
        this.page = null;
        this.allJobs = [];
    }

    async initialize() {
        this.browser = await puppeteer.launch({
            headless: this.headless,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: { width: 1920, height: 1080 }
        });

        this.page = await this.browser.newPage();
        await this.page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        );
    }

    async navigateToJobsPage() {
        console.log('🌐 Navigating to TCS Careers page...');
        await this.page.goto('https://ibegin.tcsapps.com/candidate/jobs/search', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        await delay(5000);
    }

    cleanJobDescription(html = '') {
        return html
            .replace(/<[^>]*>/g, '') // strip HTML tags
            .replace(/&nbsp;/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .replace(/\n{2,}/g, '\n')
            .trim();
    }

    async scrapeAllJobs() {
        const jobCardsSelector = 'div.row.custom-row.searched-job';
        const jobDetailsSelector = 'span[data-ng-bind-html="jobDesc"]';
        const maxPages = 100;

        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            console.log(`📄 Scraping Page ${pageNum}...`);

            await this.page.waitForSelector(jobCardsSelector, { timeout: 10000 });
            const cards = await this.page.$$(jobCardsSelector);

            if (cards.length === 0) {
                console.log('✅ No more job cards. Stopping...');
                break;
            }

            for (let i = 0; i < cards.length; i++) {
                console.log(`📝 Processing TCS job ${i + 1}/${cards.length}`);

                try {
                    const card = cards[i];
                    await this.page.evaluate(el => el.scrollIntoView(), card);
                    await card.click();
                    await delay(1000);

                    await this.page.waitForFunction(() => {
                        const title = document.querySelector('#app-body > div.page-content.noTPad > div.ng-scope > div > div:nth-child(2) > div:nth-child(1) > div.row.custom-row.description-container > div.row.custom-row.description-title > span');
                        return title && title.innerText.length > 0;
                    }, { timeout: 5000 });

                    const job = await this.page.evaluate((detailsSelector) => {
                        return {
                            title: document.querySelector('#app-body > div.page-content.noTPad > div.ng-scope > div > div:nth-child(2) > div:nth-child(1) > div.row.custom-row.description-container > div.row.custom-row.description-title > span')?.innerText.trim() || '',
                            location: document.querySelector('span[data-ng-bind="jobDescription.location"]')?.innerText.trim() || '',
                            description: document.querySelector(detailsSelector)?.innerHTML.trim() || '',
                            url: window.location.href,
                            company: 'TCS'
                        };
                    }, jobDetailsSelector);

                    if (job?.title) {
                        job.description = this.cleanJobDescription(job.description);
                        job.scrapedAt = new Date().toISOString();
                        this.allJobs.push(job);
                        console.log(`✅ ${job.title}`);
                    } else {
                        console.log(`⚠️ Skipped: No title found.`);
                    }

                } catch (err) {
                    console.warn(`⚠️ Error processing job ${i + 1}:`, err.message);
                }
            }

            // Move to next page if available
            const nextBtnSelector = 'div.iframe-button-wrapper > button';
            const nextBtn = await this.page.$(nextBtnSelector);

            if (nextBtn) {
                const isDisabled = await this.page.evaluate(btn => btn.disabled, nextBtn);
                if (!isDisabled) {
                    console.log('➡️ Moving to next page...');
                    await nextBtn.click();
                    await delay(5000);
                } else {
                    console.log('🛑 Reached last page.');
                    break;
                }
            } else {
                break;
            }
        }

        console.log(`✅ Total jobs scraped: ${this.allJobs.length}`);
    }

    async saveResults() {
        //writeFileSync('./scrappedJobs/tcsJobs.json', JSON.stringify(this.allJobs, null, 2));
        console.log(`💾 Saved ${this.allJobs.length} jobs to scrappedJobs/tcsJobs.json`);
    }

    async close() {
        if (this.browser) await this.browser.close();
    }

    async run() {
        try {
            await this.initialize();
            await this.navigateToJobsPage();
            await this.scrapeAllJobs();
            await this.saveResults();
        } catch (error) {
            console.error('❌ Scraper failed:', error);
        } finally {
            await this.close();
        }
    }
}

const runTcsScraper = async ({ headless = true } = {}) => {
    const scraper = new TcsJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runTcsScraper;

// CLI runner
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await runTcsScraper({ headless: headlessArg });
    })();
}
