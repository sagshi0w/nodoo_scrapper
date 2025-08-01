import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class zensarJobsScraper {
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
        console.log('🌐 Navigating to Zensar Careers...');
        await this.page.goto('https://fa-etvl-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs', {
            waitUntil: 'networkidle2'
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];

        while (true) {
            // Wait for job links to load
            await this.page.waitForSelector('a.job-grid-item__link', { timeout: 10000 });

            // Collect new links
            const newLinks = await this.page.$$eval(
                'a.job-grid-item__link',
                anchors => anchors.map(a => a.href)
            );

            for (const link of newLinks) {
                this.allJobLinks.push(link);
            }
            console.log(`📄 Collected ${this.allJobLinks.length} unique job links so far...`);

            // Try to click "See more results" button
            // Check if "Show More Results" button exists and is visible
            const showMoreButton = await this.page.$('span.button__label');

            if (!showMoreButton) {
                console.log('✅ No more "Show More Results" button. Finished collecting.');
                break;
            } else {
                await delay(5000);

                // Scroll the element into view
                await showMoreButton.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));

                // Wait for a short moment after scroll (optional)
                await delay(5000);

                // Ensure it's still visible and attached
                const isVisible = await showMoreButton.evaluate(el => {
                    const rect = el.getBoundingClientRect();
                    return (
                        el.offsetParent !== null &&
                        rect.width > 0 &&
                        rect.height > 0
                    );
                });

                if (isVisible) {
                    await showMoreButton.click();
                } else {
                    console.log('⚠️ "Show More Results" button not visible or not clickable.');
                    break;
                }
            }

        }

        return this.allJobLinks;;
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
                    title: getText('h1.heading.job-details__title'),
                    company: 'Zensar',
                    location: getText('div.job-details__subtitle.text-color-secondary'),
                    description: getText('.job-details__description-content'),
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
        console.log(`💾 Saved ${this.allJobs.length} jobs to zensarJobs.json`);
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
            // Remove "Job Title:" or similar headers
            .replace(/^.*job\s*title\s*:\s*/gim, '')

            // Remove specific single-line phrases
            .replace(/^\s*(TRENDING|BE THE FIRST TO APPLY)\s*$/gim, '')

            // Format numbered and bullet lists
            .replace(/(\n\s*)(\d+\.\s*)(.*?)(\n)/gi, '\n\n$1$2$3$4\n')
            .replace(/(\n\s*)(•|–|-|\*)\s*(.*?)(\n)/gi, '\n\n$1• $3$4\n')

            // Remove redundant spaces and trim lines
            .replace(/[ \t]+$/gm, '')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n[ \t]+/g, '\n')
            .trim();

        // Fallback if cleaned content is empty
        if (!cleanedDescription) {
            cleanedDescription = 'Description not available';
        }
    } else {
        cleanedDescription = 'Description not available';
    }

    return {
        ...job,
        title: job.title?.trim() || '',
        location: job.location?.trim() || '',
        description: cleanedDescription,
        company: 'Zensar'
    };
};


// ✅ Exportable runner function
const runZensarJobsScraper = async ({ headless = true } = {}) => {
    const scraper = new zensarJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runZensarJobsScraper;

// ✅ CLI support: node phonepe.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await runZensarJobsScraper({ headless: headlessArg });
    })();
}
