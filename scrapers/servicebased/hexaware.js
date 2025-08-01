import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class hexawareJobsScraper {
    constructor(headless = true) {
        this.headless = headless;
        this.browser = null;
        this.page = null;
        this.allJobLinks = [];
        this.allJobs = [];
    }

    async initialize() {
        this.browser = await puppeteer.launch({
            headless: this.headless,
            args: ['--no-sandbox', ...(this.headless ? [] : ['--start-maximized'])],
            defaultViewport: this.headless ? { width: 1920, height: 1080 } : null
        });
        this.page = await this.browser.newPage();
    }

    async navigateToJobsPage() {
        console.log('🌐 Navigating to Hexaware Careers...');
        await this.page.goto('https://jobs.hexaware.com/#en/sites/CX_1/jobs?lastSelectedFacet=LOCATIONS&mode=location&selectedLocationsFacet=300000000446279&sortBy=POSTING_DATES_DESC', {
            waitUntil: 'networkidle2'
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];
        let previousHeight = 0;
        let sameHeightCount = 0;
        const seen = new Set();

        while (true) {
            // Scroll to bottom
            await this.page.evaluate(() => {
                window.scrollBy(0, window.innerHeight);
            });

            await delay(5000);

            // Extract links after scroll
            const newLinks = await this.page.$$eval(
                'a.job-list-item__link',
                anchors => anchors.map(a => a.href)
            );

            // Add only unique links
            for (const link of newLinks) {
                if (!seen.has(link)) {
                    this.allJobLinks.push(link);
                    seen.add(link);
                }
            }

            console.log(`📄 Found ${this.allJobLinks.length} job links so far...`);

            // Check scroll height to decide if we're done
            const currentHeight = await this.page.evaluate(() => document.body.scrollHeight);

            if (currentHeight === previousHeight) {
                sameHeightCount++;
            } else {
                sameHeightCount = 0;
            }

            if (sameHeightCount >= 2) {
                console.log(`✅ Finished scrolling. Total job links collected: ${this.allJobLinks.length}`);
                break;
            }

            previousHeight = currentHeight;
        }

        return this.allJobLinks;
    }

    async extractJobDetailsFromLink(url) {
        const jobPage = await this.browser.newPage();
        try {
            await jobPage.goto(url, { waitUntil: 'networkidle2' });
            await delay(5000);

            // ✅ Extract job summary using jobPage
            // Extract other job details
            const job = await jobPage.evaluate(() => {
                const getText = sel => document.querySelector(sel)?.innerText.trim() || '';

                return {
                    title: getText('h1.job-details__title'),
                    company: 'Hexaware',
                    location: getText('div.job-details__subtitle'),
                    description: getText(".job-details__description-content"),
                    url: window.location.href
                };
            });

            console.log("job=", job);

            return job;

        } catch (err) {
            await jobPage.close();
            console.warn(`❌ Failed to scrape ${url}: ${err.message}`);
            return null;
        }
    }


    async processAllJobs() {
        for (let i = 0; i < this.allJobLinks.length; i++) {
            const url = this.allJobLinks[i];
            console.log(`📝 [${i + 1}/${this.allJobLinks.length}] Processing: ${url}`);
            const jobData = await this.extractJobDetailsFromLink(url);
            if (jobData && jobData.title) {
                const enrichedJob = extractWiproData(jobData);
                this.allJobs.push(enrichedJob);
                console.log(`✅ ${jobData.title}`);
            }
            await delay(1000);
        }
    }

    async saveResults() {
        // fs.writeFileSync('./scrappedJobs/phonepeJobs.json', JSON.stringify(this.allJobs, null, 2));
        console.log(`💾 Saved ${this.allJobs.length} jobs to hexawareJobs.json`);
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

const extractWiproData = (job) => {
    if (!job) return job;
    let cleanedDescription = job.description || '';
    if (cleanedDescription) {
        cleanedDescription = cleanedDescription
            .replace(/[ \t]+$/gm, '')

            // Collapse extra newlines to just double newlines
            .replace(/\n{3,}/g, '\n\n')

            .trim();
    }

    return {
        ...job,
        title: job.title?.trim() || '',
        location: job.location?.trim() || '',
        description: cleanedDescription,
        company: 'Hexaware'
    };
};

// ✅ Exportable runner function
const runHexawareJobsScraper = async ({ headless = true } = {}) => {
    const scraper = new hexawareJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runHexawareJobsScraper;

// ✅ CLI support: node phonepe.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await runHexawareJobsScraper({ headless: headlessArg });
    })();
}
