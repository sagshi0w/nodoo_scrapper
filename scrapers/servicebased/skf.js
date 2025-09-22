import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class SKFJobsScraper {
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
        console.log('🌐 Navigating to SKF Careers...');
        await this.page.goto('https://career.skf.com/search/?createNewAlert=false&q=&optionsFacetsDD_country=IN&optionsFacetsDD_location=&optionsFacetsDD_customfield2=&optionsFacetsDD_department=Engineering+%26+Technology', {
            waitUntil: 'networkidle2'
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];
        const existingLinks = new Set();

        while (true) {
            // Collect job links on current page
            const jobLinks = await this.page.$$eval(`a.jobTitle-link[href^="/job/"]`, anchors =>
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
                let rawTitle = getText('h1 span[itemprop="title"], span[itemprop="title"]');
                let title = rawTitle.trim();

                return {
                    title,
                    company: 'SKF',
                    location: getText('span[data-careersite-propertyid="location"] .jobGeoLocation, .jobGeoLocation, #job-location'),
                    description: getText('span.jobdescription, .jobdescription, div.WordSection1'),
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
                    const enrichedJob = extractSKFData(jobData);
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
const removeSKFBoilerplate = (text) => {
    if (!text) return text;
    let t = text;
    // About SKF block up to the next blank line (includes the www.skf.com/in line)
    t = t.replace(/About\s+SKF[\s\S]*?(?:\n\s*\n|$)/gi, '');
    // Explicit SKF intro paragraphs
    t = t.replace(/SKF\s+started\s+its\s+operations\s+in\s+India\s+in\s+1923\.[\s\S]*?business\s+excellence\./gi, '');
    t = t.replace(/SKF's\s+solutions\s+provide\s+sustainable\s+ways[\s\S]*?five\s+technology\s+platforms\./gi, '');
    // About Technology Development block
    t = t.replace(/About\s+Technology\s+Development[\s\S]*?(?:\n\s*\n|$)/gi, '');
    // Explicit TD intro line
    t = t.replace(/The\s+TD\s+team\s+for\s+ISEA\s+is\s+focused[\s\S]*?Portfolio\s+Management\s+etc\./gi, '');
    // TD Competencies block
    t = t.replace(/TD\s+Competencies[\s\S]*?(?:\n\s*\n|$)/gi, '');
    // Explicit bullet/lines under TD Competencies
    t = t.replace(/^\s*·\s*Engineering\s*&\s*Research\s*Centre\s*$/gim, '');
    t = t.replace(/^\s*Engineering\s*&\s*Research\s*Centre\s*$/gim, '');
    t = t.replace(/Product\s+Development\s*&\s+Engineering[\s\S]*?higher\s+performance\s+products\./gi, '');
    t = t.replace(/^\s*·\s*Testing:[\s\S]*?requirements\.?$/gim, '');
    t = t.replace(/^\s*Testing:[\s\S]*?requirements\.?$/gim, '');
    t = t.replace(/^\s*·\s*Global\s+Metallurgy\s*&\s+Chemistry\s+Laboratory\s*\(GMC\)\s*$/gim, '');
    t = t.replace(/^\s*Global\s+Metallurgy\s*&\s+Chemistry\s+Laboratory\s*\(GMC\)\s*$/gim, '');
    t = t.replace(/^\s*·\s*Future\s+Factory\s*\(Manufacturing\s*4\.0\)[\s\S]*?Digital\.?$/gim, '');
    t = t.replace(/^\s*Future\s+Factory\s*\(Manufacturing\s*4\.0\)[\s\S]*?Digital\.?$/gim, '');
    t = t.replace(/^\s*·\s*Manufacturing\s+Process\s*&\s+Development[\s\S]*?automation\.?$/gim, '');
    t = t.replace(/^\s*Manufacturing\s+Process\s*&\s+Development[\s\S]*?automation\.?$/gim, '');
    t = t.replace(/^\s*·\s*Connected\s+Technologies[\s\S]*?assets\.?$/gim, '');
    t = t.replace(/^\s*Connected\s+Technologies[\s\S]*?assets\.?$/gim, '');
    // SKF Purpose Statement block
    t = t.replace(/SKF\s+Purpose\s+Statement[\s\S]*?(?:\n\s*\n|$)/gi, '');
    t = t.replace(/Together,\s*we\s*re-imagine\s*rotation\s*for\s*a\s*better\s*tomorrow\.?/gi, '');
    t = t.replace(/By\s*creating\s*intelligent\s*and\s*clean\s*solutions\s*for\s*people\s*and\s*the\s*planet\.?/gi, '');
    // Also drop plain www.skf.com mentions on their own lines
    t = t.replace(/^.*www\.skf\.com.*$/gim, '');
    // Remove label lines like Job Title:, Reports To:, Role Type:, Location:
    t = t.replace(/^\s*(?:Job\s*Title|Reports\s*To|Role\s*Type|Location)\s*:\s*.*$/gim, '');
    // Remove 'JOB DESCRIPTION' heading lines
    t = t.replace(/^\s*JOB\s*DESCRIPTION\s*$/gim, '');
    // Trim trailing spaces and collapse multiple blank lines to a single blank line
    t = t.replace(/[ \t]+$/gm, '');
    t = t.replace(/\n\s*\n+/g, '\n\n');
    t = t.trim();
    return t;
};

const extractSKFData = (job) => {
    if (!job) return job;

    let cleanedDescription = (job.description || '').trim();
    let experience = null;
    let location = null;

    // Extract experience
    experience = extractExperience(cleanedDescription);

    // Remove only explicit boilerplate sections requested
    cleanedDescription = removeSKFBoilerplate(cleanedDescription);

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
const SKF = async ({ headless = true } = {}) => {
    const scraper = new SKFJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};


export default SKF;

// ✅ CLI support: node phonepe.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await SKF({ headless: headlessArg });
    })();
}
