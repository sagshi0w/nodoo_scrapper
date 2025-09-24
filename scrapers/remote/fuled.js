import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class FuledJobsScraper {
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
        console.log('🌐 Navigating to Fuled Careers...');
        await this.page.goto('https://10up.com/careers/', {
            waitUntil: 'networkidle2'
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];
        const existingLinks = new Set();

        while (true) {
            // Collect job links on current page
            const jobLinks = await this.page.$$eval(`a.tu-card.tu-card--promo-block.tu-card--link[href*="/careers/"]`, anchors =>
                anchors.map(a => a.href)
            );

            for (const link of jobLinks) {
                if (!existingLinks.has(link)) {
                    existingLinks.add(link);
                    this.allJobLinks.push(link);
                }
            }

            console.log(`📄 Collected ${this.allJobLinks.length} unique job links so far...`);

            // Check if "Load more jobs" button exists and click it (commented out for testing)
            const prevCount = await this.page.$$eval('a.tu-card.tu-card--promo-block.tu-card--link[href*="/careers/"]', els => els.length).catch(() => 0);
            const loadMoreBtn = await this.page.$('button[aria-label="Load more jobs"]');
            if (!loadMoreBtn) {
                console.log("✅ No more pages found. Pagination finished.");
                break;
            }

            await loadMoreBtn.click();

            // ⏳ Manually poll for new jobs or button disappearance to avoid timeouts
            let retries = 0;
            const maxRetries = 40; // ~20s at 500ms intervals
            while (retries < maxRetries) {
                const [currentCount, btnStillThere] = await Promise.all([
                    this.page.$$eval('a.tu-card.tu-card--promo-block.tu-card--link[href*="/careers/"]', els => els.length).catch(() => 0),
                    this.page.$('button[aria-label="Load more jobs"]').then(b => !!b).catch(() => false),
                ]);
                if (currentCount > prevCount || !btnStillThere) break;
                await delay(500);
                retries++;
            }
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
                const getRichText = (selList) => {
                    for (const sel of selList) {
                        const el = document.querySelector(sel);
                        if (el) return el.innerText.trim();
                    }
                    return '';
                };

                // Extract and clean job title
                let rawTitle = getText('h1.wp-block-post-title.has-text-align-center.is-typography-preset-h1, h1.wp-block-post-title, div.job-title-container h1.job-title, h1.job-title');
                let title = rawTitle.trim();

                return {
                    title,
                    company: 'Fuled',
                    location: 'Remote',
                    description: getRichText([
                        'div.entry-content.wp-block-post-content',
                        '#jobDescription .jd',
                        '#jobDescription',
                        'span.jobdescription',
                        '.jobdescription',
                        'div.WordSection1'
                    ]),
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
                    const enrichedJob = extractCumminsData(jobData);
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
        console.log(`💾 Saved ${this.allJobs.length} jobs to Fuled.json`);
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

const extractExperience = (description) => {
    const expPatterns = [
        /\bminimum\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i,
        /\bmin(?:imum)?\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i,
        /\b(\d{1,2})\s*(?:to|–|-|–)\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i,
        /\b(?:at least|over)\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i,
        /\b(\d{1,2})\s*(?:years|yrs|yr)\s+experience\b/i,
        /\bexperience\s*(?:of)?\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i,
        /\bexperience\s*(?:required)?\s*[:\-]?\s*(\d{1,2})\s*(?:[-to]+)?\s*(\d{1,2})?\s*(?:years|yrs|yr)?/i,
        /\b(\d{1,2})\s*\+\s*(?:years|yrs|yr)\b/i,
        /\b(\d{1,2})-(\d{1,2})\s*(?:years|yrs|yr)\s+experience\b/i,
    ];

    for (const pattern of expPatterns) {
        const match = description.match(pattern);
        if (match) {
            const minExp = parseInt(match[1], 10);
            const maxExp = match[2] ? parseInt(match[2], 10) : minExp + 2;
            return `${minExp} - ${maxExp} yrs`;
        }
    }

    return '';
};

// Minimal removal of SKF boilerplate sections only
const removeFuledBoilerplate = (text) => {
    if (!text) return text;
    let t = text;
    // Remove any leading "Location:" lines
    t = t.replace(/(^|\n)\s*Location:\s*.*(?=\n|$)/gi, '$1');
    // Collapse excess blank lines
    t = t.replace(/[ \t]+$/gm, '').replace(/\n\s*\n+/g, '\n\n').trim();
    return t;
};

const extractCumminsData = (job) => {
    if (!job) return job;

    let cleanedDescription = (job.description || '').trim();
    let experience = null;
    let location = null;

    // Extract experience
    experience = extractExperience(cleanedDescription);

    // Remove only explicit boilerplate sections requested
    cleanedDescription = removeFuledBoilerplate(cleanedDescription);

    // Extract city from location string
    if (job.location) {
        const cityMatch = job.location.match(/^([^,\n]+)/);
        if (cityMatch) {
            location = cityMatch[1].trim();
        }
    }

    // Fallback: extract from description if location is still empty
    if (!location && job.description) {
        const descLocationMatch = job.description.match(/Job Location:\s*(.+)/i);
        if (descLocationMatch) {
            location = descLocationMatch[1].split('\n')[0].trim();
        }
    }

    // Optional: fallback default
    if (!location) {
        location = 'Pune';
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
const Fuled = async ({ headless = true } = {}) => {
    const scraper = new FuledJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};


export default Fuled;

// ✅ CLI support: node phonepe.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await Fuled({ headless: headlessArg });
    })();
}
