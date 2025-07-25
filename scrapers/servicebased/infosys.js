import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

class InfosysJobsScraper {
    constructor(headless = true) {
        this.headless = headless;
        this.browser = null;
        this.page = null;
        this.allJobs = [];
    }

    async initialize() {
        this.browser = await puppeteer.launch({
            headless: this.headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                ...(this.headless ? [] : ['--start-maximized']),
            ],
            defaultViewport: this.headless ? { width: 1920, height: 1080 } : null,
        });

        this.page = await this.browser.newPage();
        await this.page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        );
    }

    async navigateToJobsPage() {
        console.log('🌐 Navigating to Infosys Careers page...');
        await this.page.goto(
            'https://career.infosys.com/jobs?companyhiringtype=IL&countrycode=IN',
            { waitUntil: 'networkidle2', timeout: 60000 }
        );
        await delay(3000);
    }

    cleanJobDescription(description = '') {
        return description
            .replace(/^job summary\s*[:\-]?/i, '')
            .replace(/\n+job summary\s*[:\-]?/gi, '\n')
            .replace(/^job description\s*[:\-]?/i, '')
            .replace(/\n+job description\s*[:\-]?/gi, '\n')
            .replace(
                /(Responsibilities:|Requirements:|Skills:|Qualifications:)/gi,
                '\n$1\n'
            )
            .replace(/[ \t]+$/gm, '')
            .replace(/\n{2,}/g, '\n')
            .trim();
    }

    async scrapeAllJobs() {
        const jobCardsSelector = 'mat-card.custom-card';
        const jobTitleSelector = 'span.jobTitle';
        const closeBtnSelector = '[data-ph-at-id="close-button"]';
        const nextBtnSelector = 'div.iframe-button-wrapper > button';

        const processedTitles = new Set();
        const maxPages = 1000;

        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            console.log(`📄 Scraping Page ${pageNum}...`);
            try {
                await this.page.waitForSelector(jobCardsSelector, { timeout: 10000 });
            } catch {
                console.log('⚠️ No job cards found on this page.');
                break;
            }

            let cards = await this.page.$$(jobCardsSelector);
            const totalCards = cards.length;

            for (let i = 0; i < totalCards; i++) {
                try {
                    // Re-fetch fresh card references each time to avoid staleness
                    cards = await this.page.$$(jobCardsSelector);
                    const card = cards[i];
                    if (!card) {
                        console.warn(`⚠️ Job card ${i + 1} not found.`);
                        continue;
                    }

                    await card.click();
                    await this.page.waitForSelector(jobTitleSelector, { timeout: 10000 });
                    await delay(2000);

                    const job = await this.page.evaluate(() => {
                        const title = document.querySelector('span.jobTitle')?.innerText.trim() || '';
                        const location = document.querySelector('span.jobCity')?.innerText.trim() || '';
                        const description = document.querySelector('div.jobDesc')?.innerText.trim() || '';
                        const url = window.location.href;
                        return { title, location, description, url, company: 'Infosys' };
                    });

                    if (processedTitles.has(job.title)) {
                        console.log(`⏭️ Skipping duplicate: ${job.title}`);
                    } else {
                        job.scrapedAt = new Date().toISOString();
                        job.description = this.cleanJobDescription(job.description);
                        this.allJobs.push(job);
                        processedTitles.add(job.title);
                        console.log(`✅ ${job.title}`);
                    }

                    // Try to close the job details popup
                    const closeBtn = await this.page.$(closeBtnSelector);
                    if (closeBtn) {
                        await closeBtn.click();
                    } else {
                        await this.page.goBack({ waitUntil: 'networkidle2' });
                    }

                    await delay(1500);
                } catch (err) {
                    console.warn(`⚠️ Error processing job ${i + 1}: ${err.message}`);
                }
            }

            // Move to next page
            const nextBtn = await this.page.$(nextBtnSelector);
            if (nextBtn) {
                const isDisabled = await this.page.evaluate(btn => btn.disabled, nextBtn);
                if (isDisabled) {
                    console.log('🛑 No more pages.');
                    break;
                } else {
                    console.log('➡️ Moving to next page...');
                    await nextBtn.click();
                    await delay(5000);
                }
            } else {
                console.log('🛑 Next button not found. Ending scrape.');
                break;
            }
        }

        console.log(`✅ Finished scraping all pages. Total jobs: ${this.allJobs.length}`);
    }

    async saveResults() {
        // writeFileSync('./scrappedJobs/infosysJobs.json', JSON.stringify(this.allJobs, null, 2));
        console.log(`💾 Would save ${this.allJobs.length} jobs to scrappedJobs/infosysJobs.json`);
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

const runInfosysScraper = async ({ headless = true } = {}) => {
    const scraper = new InfosysJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runInfosysScraper;

if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await runInfosysScraper({ headless: headlessArg });
    })();
}
