import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class OnePasswordJobsScraper {
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
        console.log('🌐 Navigating to OnePassword Careers...');
        await this.page.goto('https://jobs.ashbyhq.com/1password', {
            waitUntil: 'networkidle2'
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];
        const existingLinks = new Set();

        while (true) {
            // Collect job links from job card containers
            const jobLinks = await this.page.$$eval(`a._container_j2da7_1[href*="/1password/"]`, anchors =>
                anchors.map(a => {
                    // Convert relative URLs to absolute URLs
                    const href = a.href;
                    if (href.startsWith('/')) {
                        return `https://jobs.ashbyhq.com${href}`;
                    }
                    return href;
                })
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

                // Extract job title - try multiple selectors
                let title = getText('h1._title_ud4nd_34._large_ud4nd_67.ashby-job-posting-heading') || 
                           getText('h1._title_ud4nd_34') || 
                           getText('h1.ashby-job-posting-heading') || 
                           getText('h1') || 
                           getText('h2') || 
                           getText('.job-title') || 
                           getText('[class*="title"]') ||
                           getText('title');

                // Extract company name
                let company = getText('.company-name') || 
                             getText('[class*="company"]') || 
                             '1Password';

                // Extract location - try multiple selectors
                let location = getText('.location') || 
                              getText('[class*="location"]') || 
                              getText('.job-location') ||
                              'Remote';

                // Extract experience - try multiple selectors
                let experience = getText('.experience') || 
                                getText('[class*="experience"]') || 
                                getText('.work-experience') ||
                                '';

                // Extract job description from the specific 1Password section
                let description = '';
                const jobDescriptionElement = document.querySelector('div._description_oj0x8_198._container_101oc_29[data-highlight="none"] ._descriptionText_oj0x8_198');
                if (jobDescriptionElement) {
                    description = jobDescriptionElement.innerText.trim();
                }
                
                // Fallback description selectors
                if (!description || description.length < 100) {
                    description = getText('.job-description') || 
                                 getText('.description') || 
                                 getText('[class*="description"]') ||
                                 getText('.job-details') ||
                                 getText('.content') ||
                                 getText('main') ||
                                 getText('body');
                }

                // If description is still too short, try to get more content
                if (description.length < 100) {
                    const allText = document.body.innerText;
                    if (allText.length > description.length) {
                        description = allText;
                    }
                }

                return {
                    title: title || 'Job Title Not Found',
                    company: company || '1Password',
                    description: description || 'Description not available',
                    location: location || 'Remote',
                    experience: experience || '',
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
                    const enrichedJob = extractOnePasswordData(jobData);
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

const extractOnePasswordData = (job) => {
    if (!job) return job;

    let cleanedDescription = job.description || '';
    let experience = job.experience || '';

    if (cleanedDescription) {
        // Remove "About 1Password" section
        cleanedDescription = cleanedDescription
            .replace(/About 1Password\s*At 1Password, we're building the foundation for a safe, productive digital future\. Our mission is to unleash employee productivity without compromising security by ensuring every identity is authentic, every application sign-in is secure, and every device is trusted\. We innovated the market-leading enterprise password manager and pioneered Extended Access Management, a new cybersecurity category built for the way people and AI agents work today\. As one of the most loved brands in cybersecurity, we take a human-centric approach in everything from product strategy to user experience\. Over 165,000 businesses and millions of people trust us to provide seamless, secure access to their most critical information\.\s*If you're excited about the opportunity to contribute to the digital safety of millions, to work alongside a team of curious, driven individuals, and to solve hard problems in a fast-paced, dynamic environment, then we want to hear from you\. Come join us and help shape a safer, simpler digital future\.\s*/gi, '')
            // Remove any remaining "About 1Password:" headers
            .replace(/About 1Password:\s*/gi, '')
            // Existing formatting steps
            .replace(/(\n\s*)(\d+\.\s+)(.*?)(\n)/gi, '\n\n$1$2$3$4')
            .replace(/(\n\s*)([•\-]\s+)(.*?)(\n)/gi, '\n\n$1$2$3$4')
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


    return {
        ...job,
        title: job.title?.trim(),
        experience,
        description: cleanedDescription,
    };
};


// ✅ Exportable runner function
const OnePassword = async ({ headless = true } = {}) => {
    const scraper = new OnePasswordJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};


export default OnePassword;

// ✅ CLI support: node onePassword.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await OnePassword({ headless: headlessArg });
    })();
}
