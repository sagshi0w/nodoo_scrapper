import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class techMahindraJobsScraper {
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
        console.log('🌐 Navigating to TechMahindra Careers...');
        await this.page.goto('https://careers.techmahindra.com/CurrentOpportunity.aspx#Advance', {
            waitUntil: 'networkidle2'
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];
        let pageIndex = 1;

        while (pageIndex < 2) {
            // Wait for job listings container
            //await this.page.waitForSelector('div.paragraph--type--card-info-stand-tiles', { timeout: 10000 });

            // Extract job detail links
            const jobLinks = await this.page.$$eval('a', anchors =>
                anchors
                    .filter(a => a.textContent.trim() === 'Apply/Shortlist')
                    .map(a => a.href)
            );

            for (const link of jobLinks) {
                this.allJobLinks.push(link);
            }

            console.log(`📄 Page ${pageIndex}: Total job links so far: ${this.allJobLinks.length}`);

            // Check for next page button
            const nextPageSelector = 'a.page_enabled[href*="__doPostBack"]';
            const hasNext = await this.page.$(nextPageSelector);

            if (!hasNext) {
                console.log('✅ No more pages.');
                break;
            }

            console.log('➡️ Clicking next page...');
            await Promise.all([
                this.page.click(nextPageSelector),
                await delay(30000)
                //this.page.waitForTimeout(5000),
            ]);

            pageIndex++;
        }

        console.log(`🎉 Done! Total unique job links collected: ${this.allJobLinks.length}`);
    }

    async extractJobDetailsFromLink(url) {
        const jobPage = await this.browser.newPage();
        try {
            await jobPage.goto(url, { waitUntil: 'networkidle2' });
            await delay(5000);

            // Extract job summary
            const jobSummary = await jobPage.evaluate(() => {
                const heading = Array.from(document.querySelectorAll('div.col-md-12 h3'))
                    .find(el => el.innerText.trim() === 'Job Summary');
                const para = heading?.nextElementSibling;
                return para?.innerText.trim() || '';
            });

            // Extract other job details
            const job = await jobPage.evaluate((jobSummary) => {
                const getText = sel => document.querySelector(sel)?.innerText.trim() || '';

                const getTextFromIconClass = (iconClass) => {
                    const items = [...document.querySelectorAll('ul.skillset li')];
                    for (let li of items) {
                        if (li.querySelector(`i.${iconClass}`)) {
                            return li.querySelector('span.red')?.innerText.trim() || '';
                        }
                    }
                    return '';
                };

                return {
                    title: getText('#ctl00_ContentPlaceHolder1_lblDesignationName'),
                    company: 'Tech Mahindra',
                    location: getTextFromIconClass('fa-map-marker'),
                    description: jobSummary,
                    url: window.location.href
                };
            }, jobSummary);

            await jobPage.close();
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
        console.log(`💾 Saved ${this.allJobs.length} jobs to techMahindraJobs.json`);
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
            .replace(/about\s+phonepe\s+group\s*:/gi, '')
            .replace(/about\s+phonepe\s*:/gi, '')
            .replace(/culture/gi, '')
            .replace(/job summary:?/gi, '')
            .replace(/(\n\s*)(responsibilities|requirements|qualifications|skills|experience|education|benefits|what\s+we\s+offer|key\s+responsibilities|job\s+description|role\s+and\s+responsibilities|about\s+the\s+role|what\s+you'll\s+do|what\s+you\s+will\s+do)(\s*:?\s*\n)/gi, '\n\n$1$2$3\n\n')
            .replace(/(\n\s*)(\d+\.\s*)(.*?)(\n)/gi, '\n\n$1$2$3$4\n')
            .replace(/(\n\s*)(•\s*)(.*?)(\n)/gi, '\n\n$1$2$3$4\n')
            .replace(/[ \t]+$/gm, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    return {
        ...job,
        title: job.title?.trim() || '',
        location: job.location?.trim() || '',
        description: cleanedDescription,
        company: 'Tech Mahindra'
    };
};

// ✅ Exportable runner function
const runTechMahindraScraper = async ({ headless = true } = {}) => {
    const scraper = new techMahindraJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runTechMahindraScraper;

// ✅ CLI support: node phonepe.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await runTechMahindraScraper({ headless: headlessArg });
    })();
}
