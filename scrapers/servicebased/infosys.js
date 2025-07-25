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
        const processedTitles = new Set();
        let pageNum = 1;
        let lastFirstTitle = '';

        while (true) {
            console.log(`📄 Scraping Page ${pageNum}...`);
            await this.page.waitForSelector(jobCardsSelector, { timeout: 10000 });

            const cards = await this.page.$$(jobCardsSelector);
            if (cards.length === 0) break;

            const currentFirstTitle = await this.page.evaluate(el =>
                el.querySelector('div.job-titleTxt')?.innerText.trim() || '',
                cards[0]
            );

            if (currentFirstTitle === lastFirstTitle) {
                console.log('✅ Reached last page (duplicate first job)');
                break;
            }
            lastFirstTitle = currentFirstTitle;

            for (let index = 0; index < cards.length; index++) {
                try {
                    const card = cards[index];

                    const cardTitle = await this.page.evaluate(el =>
                        el.querySelector('div.job-titleTxt')?.innerText.trim() || '', card);

                    if (processedTitles.has(cardTitle)) {
                        console.log(`⏭️ Already processed: ${cardTitle}`);
                        continue;
                    }

                    console.log(`📝 Processing Infosys job ${index + 1}: ${cardTitle}`);
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

                    const closeBtn = await this.page.$('[data-ph-at-id="close-button"]');
                    if (closeBtn) {
                        await closeBtn.click();
                    } else {
                        await this.page.goBack({ waitUntil: 'networkidle2' });
                    }

                    await delay(1500);
                } catch (err) {
                    console.warn(`⚠️ Error on job ${index + 1}: ${err.message}`);
                }
            }

            // Go to next page
            const navButtons = await this.page.$$('li.pointer');

            let nextBtnFound = false;
            for (const btn of navButtons) {
                const isVisible = await btn.evaluate(el => {
                    return el.offsetParent !== null && !el.classList.contains('disabled');
                });

                const imgAlt = await btn.$eval('img', img => img.getAttribute('alt')).catch(() => null);

                if (isVisible && imgAlt === 'previous icon') {
                    await btn.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
                    await btn.click();
                    await delay(2000);
                    nextBtnFound = true;
                    break;
                }
            }

            if (!nextBtnFound) {
                console.log('🛑 No more pages or next button disabled');
                break;
            }

            pageNum++;
        }

        console.log(`✅ Total jobs scraped: ${this.allJobs.length}`);
    }

    async saveResults() {
        console.log(`💾 Would save ${this.allJobs.length} jobs to scrappedJobs/infosysJobs.json`);
        // writeFileSync('./scrappedJobs/infosysJobs.json', JSON.stringify(this.allJobs, null, 2));
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
