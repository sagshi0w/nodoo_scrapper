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

    async scrapeAllPagesOneByOne() {
        const jobCardsSelector = 'mat-card.custom-card';
        const nextBtnSelector = 'div.iframe-button-wrapper > button';
        const processedTitles = new Set();

        let pageNum = 1;
        while (true) {
            console.log(`📄 Scraping Page ${pageNum}...`);

            let index = 0;

            while (true) {
                try {
                    await this.page.waitForSelector(jobCardsSelector, { timeout: 10000 });
                    const cards = await this.page.$$(jobCardsSelector);
                    if (index >= cards.length) break;

                    const card = cards[index];

                    // Read title from this specific card (no prefetching)
                    const cardTitle = await this.page.evaluate(el =>
                        el.querySelector('span.jobTitle')?.innerText.trim() || '', card);

                    if (processedTitles.has(cardTitle)) {
                        console.log(`⏭️ Already processed: ${cardTitle}`);
                        index++;
                        continue;
                    }

                    console.log(`📝 Processing job ${index + 1}: ${cardTitle}`);
                    await card.click();
                    await this.page.waitForSelector('span.jobTitle', { timeout: 10000 });
                    await delay(2000);

                    const job = await this.page.evaluate(() => {
                        return {
                            title: document.querySelector('span.jobTitle')?.innerText.trim() || '',
                            location: document.querySelector('span.jobCity')?.innerText.trim() || '',
                            description: document.querySelector('div.jobDesc')?.innerText.trim() || '',
                            url: window.location.href,
                            company: 'Infosys'
                        };
                    });

                    job.description = this.cleanJobDescription(job.description);
                    job.scrapedAt = new Date().toISOString();
                    this.allJobs.push(job);
                    processedTitles.add(job.title);
                    console.log(`✅ ${job.title}`);

                    // Close job detail view
                    const closeBtn = await this.page.$('[data-ph-at-id="close-button"]');
                    if (closeBtn) {
                        await closeBtn.click();
                    } else {
                        await this.page.goBack({ waitUntil: 'networkidle2' });
                    }

                    await delay(1500);
                    index++;
                } catch (err) {
                    console.warn(`⚠️ Error on job ${index + 1}: ${err.message}`);
                    index++;
                }
            }

            // ⏭ Move to next page
            const navButtons = await this.page.$$('li.pointer > a > img[alt="previous icon"]');

            if (navButtons.length === 2) {
                const nextBtn = navButtons[1];
                await nextBtn.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
                await nextBtn.click();
                await this.page.waitForTimeout(3000);
            } else if (navButtons.length === 1) {
                const nextBtn = navButtons[0];
                await nextBtn.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
                await nextBtn.click();
                await this.page.waitForTimeout(3000);
            } else {
                console.log('🛑 No navigation buttons found');
            }
        }

        console.log(`✅ Total jobs scraped: ${this.allJobs.length}`);
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
            await this.scrapeAllPagesOneByOne();
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
