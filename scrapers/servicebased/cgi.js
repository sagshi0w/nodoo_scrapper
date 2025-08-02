import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class CGIIndiaJobsScraper {
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
        console.log('🌐 Navigating to CGI India Careers...');
        await this.page.goto('https://cgi.njoyn.com/corp/xweb/xweb.asp?CLID=21001&page=joblisting&CountryID=IN&lang=1', {
            waitUntil: 'networkidle2'
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];
        let pageIndex = 1;

        while (true) {
            // Wait for job links to load
            //await this.page.waitForSelector('div.op-job-apply-bt', { timeout: 10000 });

            // Collect new links
            const jobLinks = await this.page.$$eval(
                'td > a[href*="JobDetails"]',
                anchors => anchors.map(a => a.href)
            );

            for (const link of jobLinks) {
                this.allJobLinks.push(link);
            }

            console.log(`📄 Collected ${this.allJobLinks.length} unique job links so far...`);

            const pageNumbers = await this.page.$$eval('ul.pagination li a', links =>
                links
                    .map(a => ({
                        text: a.textContent.trim(),
                        href: a.getAttribute('href'),
                    }))
                    .filter(a => /^\d+$/.test(a.text)) // Only page numbers
            );

            // Try to click "See more results" button
            // Check if "Show More Results" button exists and is visible
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
                    title: getText('section.job-desc header h1'),
                    company: 'CGI India',
                    description: getText('div.job-posting-content'),
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
        console.log(`💾 Saved ${this.allJobs.length} jobs to MindgateSolutions.json`);
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
    let experience = null;
    let location = null;

    if (cleanedDescription) {
        // Extract experience in years
        const expMatch = cleanedDescription.match(
            /(?:minimum|at least|over)?\s*(\d{1,2})\s*(?:\+)?\s*(?:years|yrs)[^a-z]/i
        );
        if (expMatch) {
            experience = parseInt(expMatch[1], 10);
        }

        // Extract location (basic guess: look for "Location: ...")
        const locationMatch = cleanedDescription.match(/location\s*[:\-]\s*(.+?)(?:[\n\r]|$)/i);
        if (locationMatch) {
            location = locationMatch[1].trim();
        }

        // Clean formatting
        cleanedDescription = cleanedDescription
            .replace(/(\n\s*)(\d+\.\s+)(.*?)(\n)/gi, '\n\n$1$2$3$4\n\n')
            .replace(/(\n\s*)([•\-]\s+)(.*?)(\n)/gi, '\n\n$1$2$3$4\n\n')
            .replace(/([.!?])\s+/g, '$1  ')
            .replace(/[ \t]+$/gm, '')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/(\S)\n(\S)/g, '$1\n\n$2')
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
        description: cleanedDescription,
        experience: experience || 'Not specified'
    };
};



// ✅ Exportable runner function
const runCGIIndiaJobsScraper = async ({ headless = true } = {}) => {
    const scraper = new CGIIndiaJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runCGIIndiaJobsScraper;

// ✅ CLI support: node phonepe.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await runCGIIndiaJobsScraper({ headless: headlessArg });
    })();
}
