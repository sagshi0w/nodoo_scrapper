import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class PwCIndiaJobsScraper {
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
        console.log('🌐 Navigating to PwC India Careers...');
        await this.page.goto('https://www.pwc.in/careers/experienced-jobs/results.html?wdcountry=IND|BGD&wdjobsite=Global_Experienced_Careers&flds=jobreqid,title,location,jobsite,iso', {
            waitUntil: 'networkidle2'
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];
        let pageIndex = 1;
        const existingLinks = new Set();

        while (true) {
            // Wait for job links to load
            //await this.page.waitForSelector('div.op-job-apply-bt', { timeout: 10000 });

            // Collect new links
            const jobLinks = await this.page.$$eval(
                'td a',
                anchors => anchors.map(a => a.href)
            );

            for (const link of jobLinks) {
                if (!existingLinks.has(link)) {
                    existingLinks.add(link);
                    this.allJobLinks.push(link);
                }
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
                //this.page.click(`ul.pagination li a[title="Page ${pageIndex + 1}"]`),
                //this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
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
                    title: getText('h1.title-strip__heading'),
                    location: getText('div.col-xs-12.fontalign-left span[data-careersite-propertyid="city"]'),
                    company: 'PwC India',
                    description: getText('div.wd-jobdescr'),
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
        console.log(`💾 Saved ${this.allJobs.length} jobs to YashTechnologies.json`);
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
    let miniExperience = null;
    let maxExperience = null;
    let location = null;

    // --- Regex patterns for experience ---
    const expPatterns = [
        /\b(\d{1,2})\s*\+\s*(?:years|yrs|yr)\b/i, // e.g. "10+ years"
        /\bminimum\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i,
        /\bmin(?:imum)?\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i,
        /\b(\d{1,2})\s*(?:to|–|-)\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i, // e.g. "3-5 years"
        /\b(?:at least|over)\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i,
        /\b(\d{1,2})\s*(?:years|yrs|yr)\s+experience\b/i,
        /\bexperience\s*(?:of)?\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i,
        /\bexperience\s*(?:required)?\s*[:\-]?\s*(\d{1,2})\s*(?:[-to]+)?\s*(\d{1,2})?\s*(?:years|yrs|yr)?/i,
    ];

    // --- Regex patterns for city/location ---
    const cityPatterns = [
        /Location\s*(?:City)?:\s*([A-Za-z .]+)/i,   // captures only city name after "Location City:"
        /\b(Bangalore|Bengaluru|Hyderabad|Chennai|Pune|Mumbai|Delhi|Gurgaon|Noida|Kolkata|Trivandrum|Cochin|Jaipur|Ahmedabad|Indore|Nagpur)\b/i
    ];

    // Step 1: If job.experience is numeric
    if (typeof job.experience === 'number' || /^\d+$/.test(job.experience)) {
        miniExperience = parseInt(job.experience, 10);
        maxExperience = miniExperience + 2;
        experience = `${miniExperience} - ${maxExperience} yrs`;
    }

    // Step 2: Parse experience from description
    if (!experience && cleanedDescription) {
        for (const pattern of expPatterns) {
            const match = cleanedDescription.match(pattern);
            if (match) {
                const min = match[1] ? parseInt(match[1], 10) : null;
                const max = match[2] ? parseInt(match[2], 10) : null;

                if (min && max) {
                    miniExperience = min;
                    maxExperience = max;
                    experience = `${min} - ${max} yrs`;
                } else if (min && !max) {
                    miniExperience = min;
                    maxExperience = min + 2;
                    experience = `${min} - ${maxExperience} yrs`;
                }
                break;
            }
        }
    }

    // Step 3: Extract city from job.location field
    if (job.location) {
        const cityMatch = job.location.match(/^([^,\n]+)/);
        if (cityMatch) {
            location = cityMatch[1].trim();
        }
    }

    // Step 4: If location still not found, parse from description
    if (!location && cleanedDescription) {
        for (const pattern of cityPatterns) {
            const match = cleanedDescription.match(pattern);
            if (match) {
                location = match[1].trim();
                break;
            }
        }
    }

    // Step 5: Clean description
    if (cleanedDescription) {
        cleanedDescription = cleanedDescription
            .replace(/(\n\s*)(\d+\.\s+)(.*?)(\n)/gi, '\n\n$1$2$3$4\n\n')
            .replace(/(\n\s*)([•\-]\s+)(.*?)(\n)/gi, '\n\n$1$2$3$4\n\n')
            .replace(/([.!?])\s+/g, '$1  ')
            .replace(/[ \t]+$/gm, '')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/(\S)\n(\S)/g, '$1\n\n$2')
            .trim();

        if (!cleanedDescription) {
            cleanedDescription = 'Description not available\n';
        }
    }

    return {
        ...job,
        title: job.title?.trim(),
        experience,
        miniExperience,
        maxExperience,
        location,
        description: cleanedDescription,
    };
};



// ✅ Exportable runner function
const runPwCIndiaJobsScraper = async ({ headless = true } = {}) => {
    const scraper = new PwCIndiaJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runPwCIndiaJobsScraper;

// ✅ CLI support: node phonepe.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await runPwCIndiaJobsScraper({ headless: headlessArg });
    })();
}
