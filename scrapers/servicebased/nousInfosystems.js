import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class nousInfosystemsScraper {
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
        console.log('🌐 Navigating to Nous Infosystems Careers...');
        await this.page.goto('https://www.nousinfosystems.com/careers/job-openings?paged=1', {
            waitUntil: 'networkidle2'
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];
        const seenLinks = new Set();

        while (true) {
            // Wait for job links to load
            await this.page.waitForSelector('a[href*="/careers/job-openings/"]', { timeout: 20000 });

            // Collect links
            const jobLinks = await this.page.$$eval(
                'a[href*="/careers/job-openings/"]',
                anchors => anchors.map(a => a.href)
            );

            for (const link of jobLinks) {
                if (!seenLinks.has(link)) {
                    seenLinks.add(link);
                    this.allJobLinks.push(link);
                }
            }

            console.log(`📄 Collected ${this.allJobLinks.length} unique job links so far...`);

            break;
        }

        return this.allJobLinks;
    }



    async extractJobDetailsFromLink(url) {
        const jobPage = await this.browser.newPage();
        try {
            await jobPage.goto(url, { waitUntil: 'networkidle2' });
            await delay(5000);
            //await jobPage.waitForSelector('div.job__description.body', { timeout: 10000 });

            const job = await jobPage.evaluate(() => {
                const getText = sel => document.querySelector(sel)?.innerText.trim() || '';

                function removeUntilAfterJobSummary(text) {
                    const lines = text.split('\n');

                    // Find index of the line that contains "Job Summary:"
                    const summaryIndex = lines.findIndex(line =>
                        line.trim().toLowerCase().startsWith('job summary:')
                    );

                    // If not found, return original
                    if (summaryIndex === -1) return text;

                    // Return lines AFTER the "Job Summary:" line
                    return lines.slice(summaryIndex + 1).join('\n').trim();
                }

                return {
                    title: getText('.page-content > h2'),
                    company: 'Nous Infosystems',
                    description: getText('div.awsm-job-content'),
                    url: window.location.href
                };
            });

            console.log("Before enriching job=", job);

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
                console.log("After enriching job=", enrichedJob);
                this.allJobs.push(enrichedJob);
                console.log(`✅ ${jobData.title}`);
            }
            await delay(1000);
        }
    }

    async saveResults() {
        // fs.writeFileSync('./scrappedJobs/phonepeJobs.json', JSON.stringify(this.allJobs, null, 2));
        console.log(`💾 Saved ${this.allJobs.length} jobs to USTGlobal.json`);
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
    let location = '';
    let experience = '';

    if (cleanedDescription) {
        // Extract metadata
        const locationMatch = cleanedDescription.match(/Location:\s*(.*)/i);
        const experienceMatch = cleanedDescription.match(/Experience:\s*(.*)/i);

        if (locationMatch) location = locationMatch[1].trim();

        if (experienceMatch) {
            experience = experienceMatch[1].trim().replace(/years?/gi, 'yrs');
        }

        // Remove metadata from description
        cleanedDescription = cleanedDescription
            .replace(/Location:.*\n?/i, '')
            .replace(/Experience:.*\n?/i, '')
            .replace(/Opening:\s*\n?.*/i, '')
            .replace(/Published\s*Date:\s*\n?.*/i, '')
            .replace(/Job Description:\s*/i, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        if (cleanedDescription && !cleanedDescription.endsWith('\n')) {
            cleanedDescription += '\n';
        }

        if (!cleanedDescription.trim()) {
            cleanedDescription = 'Description not available\n';
        }
    } else {
        cleanedDescription = 'Description not available\n';
    }

    return {
        ...job,
        title: job.title?.trim() || '',
        location: location || job.location?.trim() || '',
        experience,
        description: cleanedDescription,
    };
};


// ✅ Exportable runner function
const runNousInfosystemsJobScraper = async ({ headless = true } = {}) => {
    const scraper = new nousInfosystemsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runNousInfosystemsJobScraper;

// ✅ CLI support: node phonepe.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await runNousInfosystemsJobScraper({ headless: headlessArg });
    })();
}
