import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

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
            defaultViewport: { width: 1920, height: 1080 },
        });
        this.page = await this.browser.newPage();
        await this.page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        );
    }

    async navigateToJobsPage() {
        console.log('🌐 Navigating to TCS Careers page...');
        await this.page.goto('https://ibegin.tcsapps.com/candidate/jobs/search', {
            waitUntil: 'networkidle2',
            timeout: 60000,
        });
        await delay(5000);
    }

    cleanJobDescription(html = '') {
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .replace(/\n{2,}/g, '\n')
            .trim();
    }

    async scrapeAllJobs() {
        const cardsSelector = 'div.row.custom-row.searched-job';
        const titleSel = 'span[data-ng-bind="jobDescription.title"]';
        const locSel = 'span[data-ng-bind="jobDescription.location"]';
        const descSel = 'span[data-ng-bind-html="jobDesc"]';
        const nextBtnSel = 'div.iframe-button-wrapper > button';

        for (let pageNum = 1; pageNum <= 100; pageNum++) {
            console.log(`📄 Scraping Page ${pageNum}...`);
            await this.page.waitForSelector(cardsSelector, { timeout: 15000 });
            const cards = await this.page.$$(cardsSelector);
            if (!cards.length) break;
            console.log(`🔍 Found ${cards.length} job cards`);

            for (let i = 0; i < cards.length; i++) {
                console.log(`📝 Processing job ${i + 1}/${cards.length}`);
                try {
                    const card = cards[i];
                    await card.evaluate(el =>
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    );
                    await delay(1000);
                    await card.click();
                    await delay(3000);

                    await this.page.waitForSelector('iframe', { timeout: 10000 });
                    const frameHandle = await this.page.$('iframe');
                    const frame = await frameHandle.contentFrame();
                    if (!frame) throw new Error('Failed to access iframe context');

                    await frame.waitForSelector(titleSel, { timeout: 10000 });

                    const raw = await frame.evaluate(
                        (ts, ls, ds) => ({
                            title: document.querySelector(ts)?.innerText.trim() || '',
                            location: document.querySelector(ls)?.innerText.trim() || '',
                            description: document.querySelector(ds)?.innerHTML.trim() || '',
                            url: window.location.href,
                            company: 'TCS',
                        }),
                        titleSel,
                        locSel,
                        descSel
                    );

                    if (raw.title) {
                        const cleaned = this.cleanJobDescription(raw.description);
                        const job = { ...raw, description: cleaned, scrapedAt: new Date().toISOString() };
                        this.allJobs.push(job);
                        console.log(`✅ Scraped: ${job.title}`);
                    } else {
                        console.warn('⚠️ Skipped: No title in iframe view');
                    }

                    await delay(1000);
                } catch (err) {
                    console.warn(`⚠️ Error on job ${i + 1}:`, err.message);
                    await this.page.screenshot({
                        path: `tcs-error-job-${i + 1}.png`,
                        fullPage: true
                    });
                    console.warn(`📸 Screenshot saved for job ${i + 1}`);
                }
            }

            const next = await this.page.$(nextBtnSel);
            if (next && !(await this.page.evaluate(btn => btn.disabled, next))) {
                console.log('➡️ Going to next page');
                await next.click();
                await delay(5000);
            } else break;
        }
        console.log(`✅ Done! Scraped ${this.allJobs.length} jobs`);
    }

    async saveResults() {
        writeFileSync('./scrappedJobs/tcsJobs.json', JSON.stringify(this.allJobs, null, 2));
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
        } catch (e) {
            console.error('❌ Scraper failed:', e);
        } finally {
            await this.close();
        }
    }
}

export default async function runTcsScraper({ headless = true } = {}) {
    const scraper = new TcsJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    (async () => {
        await runTcsScraper({ headless: process.argv.includes('--headless=false') ? false : true });
    })();
}
