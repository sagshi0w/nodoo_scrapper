import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class wiproJobsScraper {
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
        console.log('🌐 Navigating to Wipro Careers...');
        await this.page.goto('https://careers.wipro.com/search/?createNewAlert=false&q=&locationsearch=India', {
            waitUntil: 'networkidle2'
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];
        let pageIndex = 1;

        while (pageIndex < 50) {
            // Wait for job links on current page
            await this.page.waitForSelector('a.jobTitle-link', { timeout: 10000 });

            // Collect job links
            const jobLinks = await this.page.$$eval('a.jobTitle-link', anchors =>
                anchors.map(a => a.href).filter(href => href.includes('/job/'))
            );

            for (const link of jobLinks) {
                if (!this.allJobLinks.includes(link)) {
                    this.allJobLinks.push(link);
                }
            }

            console.log(`📄 Page ${pageIndex}: Total job links so far: ${this.allJobLinks.length}`);

            // Get all visible page numbers
            const pageNumbers = await this.page.$$eval('ul.pagination li a', links =>
                links
                    .map(a => ({
                        text: a.textContent.trim(),
                        href: a.getAttribute('href'),
                    }))
                    .filter(a => /^\d+$/.test(a.text)) // Only page numbers
            );

            // Find the one with text == pageIndex + 1
            const nextPage = pageNumbers.find(p => Number(p.text) === pageIndex + 1);

            if (!nextPage) {
                console.log('✅ No more pages left. Done.');
                break;
            }

            // Click the next page
            console.log(`➡️ Clicking page ${pageIndex + 1}`);
            await Promise.all([
                this.page.click(`ul.pagination li a[title="Page ${pageIndex + 1}"]`),
                this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
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
            //await jobPage.waitForSelector('div.job__description.body', { timeout: 10000 });

            const job = await jobPage.evaluate(() => {
                const getText = sel => document.querySelector(sel)?.innerText.trim() || '';
                return {
                    title: getText('h1 span[itemprop="title"]'),
                    company: 'Wipro',
                    location: getText('span[data-careersite-propertyid="city"]'),
                    description: getText('span[itemprop="description"]'),
                    url: window.location.href
                };
            });

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
        console.log(`💾 Saved ${this.allJobs.length} jobs to wiproJobs.json`);
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
        company: 'Wipro'
    };
};

// ✅ Exportable runner function
const runWiproScraper = async ({ headless = true } = {}) => {
    const scraper = new wiproJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runWiproScraper;

// ✅ CLI support: node phonepe.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await runWiproScraper({ headless: headlessArg });
    })();
}
