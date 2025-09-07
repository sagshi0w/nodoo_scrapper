import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class DRCSystemsJobsScraper {
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
        console.log('🌐 Navigating to DRC Systems  Careers...');
        await this.page.goto('https://www.drcsystems.com/careers/', {
            waitUntil: 'networkidle2'
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];
        const existingLinks = new Set();

        while (true) {
            // Collect job links on current page
            const jobLinks = await this.page.$$eval("a.apply-btn", anchors =>
                anchors.map(a => a.href)
            );

            for (const link of jobLinks) {
                if (!existingLinks.has(link)) {
                    existingLinks.add(link);
                    this.allJobLinks.push(link);
                }
            }

            console.log(`📄 Collected ${this.allJobLinks.length} unique job links so far...`);

            // Check if "Load More" button exists (fresh query every loop)
            const loadMoreExists = await this.page.$('#load_more_jobs2');
            if (!loadMoreExists) {
                console.log("✅ No more pages found. Pagination finished.");
                break;
            }

            // console.log("➡️ Clicking Load More...");
            // await this.page.click('#load_more_jobs');

            // ⏳ Wait for new jobs to load
            // await this.page.waitForFunction(
            //     (prevCount) => {
            //         return document.querySelectorAll("h5 > a").length > prevCount;
            //     },
            //     {},
            //     jobLinks.length
            // );

            // // Optional: small delay to stabilize
            // await delay(5000);
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
                return {
                    title: getText('h1'),
                    company: 'DRC Systems',
                    location: getText('.jobs-detail li:nth-child(1) p'),
                    experience: getText('.jobs-detail li:nth-child(2) p'),
                    description: getText('div.left-content'),
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
    let experience = job.experience || '';
    let location = null;

    const expPatterns = [
        /\bminimum\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i,
        /\bmin(?:imum)?\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i,
        /\b(\d{1,2})\s*(?:to|–|-|–)\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i,
        /\b(?:at least|over)\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i,
        /\b(\d{1,2})\s*(?:years|yrs|yr)\s+experience\b/i,
        /\bexperience\s*(?:of)?\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i,
        /\bexperience\s*(?:required)?\s*[:\-]?\s*(\d{1,2})\s*(?:[-to]+)?\s*(\d{1,2})?\s*(?:years|yrs|yr)?/i,
        /\b(\d{1,2})\s*\+\s*(?:years|yrs|yr)\b/i,
    ];

    // Step 1: Try job.experience field
    if (typeof job.experience === 'number' || /^\d+$/.test(job.experience)) {
        
        const minExp = parseInt(job.experience, 10);
        const maxExp = minExp + 2;
        experience = `${minExp} - ${maxExp} yrs`;
    }

    // Step 2: Parse experience from description
    if (!experience && cleanedDescription) {
        for (const pattern of expPatterns) {
            const match = cleanedDescription.match(pattern);
            if (match) {
                const min = match[1];
                const max = match[2];

                if (min && max) {
                    experience = `${min} - ${max} yrs`;
                } else if (min && !max) {
                    const estMax = parseInt(min) + 2;
                    experience = `${min} - ${estMax} yrs`;
                }
                break;
            }
        }
    }

    // Step 3: Clean description
    if (cleanedDescription) {
        cleanedDescription = cleanedDescription
            // Remove unwanted headers/sections
            .replace(
                /(Current Openings|Job Summary|About\s+RateGain)[\s\S]*?(?:Apply\.?\s*)?(?=\n{2,}|$)/gi,
                ''
            )
            // Remove "Job Description" phrase (case-insensitive)
            .replace(/\bJob\s+Description\b[:\-]?\s*/gi, '')
            // Add spacing for numbered lists
            .replace(/(\n\s*)(\d+\.\s+)(.*?)(\n)/gi, '\n\n$1$2$3$4\n\n')
            // Add spacing for bullets
            .replace(/(\n\s*)([•\-]\s+)(.*?)(\n)/gi, '\n\n$1$2$3$4\n\n')
            // Fix spacing after punctuation
            .replace(/([.!?])\s+/g, '$1  ')
            // Trim trailing spaces/tabs
            .replace(/[ \t]+$/gm, '')
            // Limit multiple newlines
            .replace(/\n{3,}/g, '\n\n')
            // Ensure spacing between lines
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



    if (job.title && cleanedDescription.startsWith(job.title)) {
        const match = cleanedDescription.match(/Primary Skills\s*[:\-–]?\s*/i);
        if (match) {
            const index = match.index;
            if (index > 0) {
                cleanedDescription = cleanedDescription.slice(index).trimStart();
            }
        }
    }

    // Step 4: Extract city from location string
    if (job.location) {
        const cityMatch = job.location.match(/^([^,\n]+)/);
        if (cityMatch) {
            location = cityMatch[1].trim();
        }
    }

    return {
        ...job,
        title: job.title?.trim(),
        experience,
        location,
        description: cleanedDescription,
    };
};


// ✅ Exportable runner function
const runDRCSystemsJobsScraper = async ({ headless = true } = {}) => {
    const scraper = new DRCSystemsJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runDRCSystemsJobsScraper;

// ✅ CLI support: node phonepe.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await runDRCSystemsJobsScraper({ headless: headlessArg });
    })();
}
