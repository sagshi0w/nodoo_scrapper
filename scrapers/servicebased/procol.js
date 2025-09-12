import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class ProcolJobsScraper {
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
        console.log('🌐 Navigating to Procol Careers...');
        await this.page.goto('https://www.procol.ai/careers/#find-job', {
            waitUntil: 'networkidle2'
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];
        const existingLinks = new Set();

        while (true) {
            // Collect job links on current page
            const jobLinks = await this.page.$$eval(`a.apply-now-btn`, anchors =>
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

                // Extract and clean job title
                let rawTitle = getText('h1.brxe-heading');
                let title = rawTitle.trim();

                return {
                    title,
                    company: 'Procol',
                    location: getText('.brxe-text-basic'),
                    experience: getText('#brxe-atercm .content > p'),
                    description: getText('#brxe-rexvny.text-job'),
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
                // Ignore jobs with title "Open Roles"
                if (jobData.title.toLowerCase() === "open roles") {
                    console.log(`⛔ Skipping ${jobData.title}`);
                } else {
                    const enrichedJob = extractWiproData(jobData);
                    console.log("After enriching job=", enrichedJob);
                    this.allJobs.push(enrichedJob);
                    console.log(`✅ ${jobData.title}`);
                }
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

    // Step 1: Clean description
    if (cleanedDescription) {
        // Extract location value
        const locationMatch = cleanedDescription.match(/Location:\s*(.*)/i);
        const location = locationMatch ? locationMatch[1].trim() : 'India';

        cleanedDescription = cleanedDescription
            // Remove "Job Title:", "Location:", "Type:", "About Neysa:", and "Position Overview:"
            // Remove exact "Job Description" word followed by newline
            .replace(/Job Description\s*\n/gi, '')
            .replace(/Job\s+Title:\s*.*\n?/gi, '')
            .replace(/Location:\s*.*\n?/gi, '')
            .replace(/Type:\s*.*\n?/gi, '')
            .replace(/About Neysa:[\s\S]*?Position Overview:/gi, '')  // Removes "About Neysa" section up to "Position Overview:"
            .replace(/Position Overview:\s*/gi, '')


            // Remove "Job\nExperience:About Neysa:" block and long company info paragraph
            .replace(/Job\s*\n\s*Experience:\s*About\s+Neysa:[\s\S]*?\.\s+/gi, '')

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

        console.log('Location:', location);
    } else {
        cleanedDescription = 'Description not available\n';
        console.log('Location:', 'Location not available');
    }



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

    if (typeof job.experience === 'number' || /^\d+$/.test(job.experience)) {
        const minExp = parseInt(job.experience, 10);
        const maxExp = minExp + 2;
        experience = `${minExp} - ${maxExp} yrs`;
    } else if (typeof job.experience === 'string') {
        for (const pattern of expPatterns) {
            const match = job.experience.match(pattern);
            if (match) {
                const minExp = parseInt(match[1], 10);
                const maxExp = match[2] ? parseInt(match[2], 10) : minExp + 2;
                experience = `${minExp} - ${maxExp} yrs`;
                break;
            }
        }
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


    if (job.title && cleanedDescription.startsWith(job.title)) {
        const match = cleanedDescription.match(/Primary Skills\s*[:\-–]?\s*/i);
        if (match) {
            const index = match.index;
            if (index > 0) {
                cleanedDescription = cleanedDescription.slice(index).trimStart();
            }
        }
    }

    // Step 3: Extract city from location string
    if (job.location || location) {
        const cityMatch = job.location.match(/^([^,\n]+)/);
        if (cityMatch) {
            location = cityMatch[1].trim();
        }
    }

    // Fallback: extract from description if location is still empty
    if (!location && job.description) {
        const descLocationMatch = job.description.match(/Location:\s*(.+)/i);
        if (descLocationMatch) {
            location = descLocationMatch[1].split('\n')[0].trim();
        }
    }

    // Optional: fallback default
    if (!location) {
        location = 'India';
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
const Procol = async ({ headless = true } = {}) => {
    const scraper = new ProcolJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};


export default Procol;

// ✅ CLI support: node phonepe.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await Procol({ headless: headlessArg });
    })();
}
