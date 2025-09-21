import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class DoqfyJobsScraper {
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
        console.log('🌐 Navigating to Doqfy Careers...');
        await this.page.goto('https://doqfy.in/careers', {
            waitUntil: 'networkidle2'
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];
        const existingLinks = new Set();

        while (true) {
            // Collect job links on current page
            const jobLinks = await this.page.$$eval(`.job-link`, anchors =>
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

                // Extract job title - try multiple selectors
                let title = getText('.doqfy-service-para-1') || 
                           getText('h2.css-10i6wsd-H2Element') ||
                           getText('h1, h2, h3').trim();

                // Extract Location - try multiple selectors
                let location = 'Bangalore'; // default fallback
                
                // Try the specific Doqfy selector first
                const doqfyLocation = document.querySelector('.doqfy-service-title');
                if (doqfyLocation) {
                    location = doqfyLocation.innerText.trim();
                } else {
                    // Try to find location near the location icon
                    const locationIcon = document.querySelector('span[data-icon="LOCATION_OUTLINE"]');
                    if (locationIcon) {
                        // Look for text in parent or sibling elements
                        const parent = locationIcon.parentElement;
                        if (parent) {
                            const locationText = parent.innerText.trim();
                            if (locationText && locationText !== locationIcon.innerText) {
                                location = locationText;
                            } else {
                                // Try next sibling
                                const nextSibling = locationIcon.nextElementSibling;
                                if (nextSibling && nextSibling.innerText) {
                                    location = nextSibling.innerText.trim();
                                }
                            }
                        }
                    }
                    
                    // Fallback to other selectors
                    if (location === 'Bangalore') {
                        location = getText('.job-location') || 
                                  getText('.css-zx00c9-StyledIcon') ||
                                  'Bangalore';
                    }
                }
                
                let experience = '';
                
                // Try to extract experience from description or other elements
                const summaryList = document.querySelector('.cw-summary-list');
                if (summaryList) {
                    const listItems = summaryList.querySelectorAll('li');
                    for (const li of listItems) {
                        const spans = li.querySelectorAll('span');
                        if (spans.length >= 2) {
                            const label = spans[0].innerText.trim();
                            const value = spans[1].innerText.trim();
                            
                            if (label === 'Work Experience') {
                                experience = value;
                            }
                        }
                    }
                }

                // Extract job description and responsibilities - combine them
                let description = '';
                
                // Get job description
                const jobDesc = getText('.job-description');
                if (jobDesc) {
                    description += jobDesc + '\n\n';
                }
                
                // Get responsibilities section
                const responsibilitiesTitle = getText('.responsibilities-title');
                if (responsibilitiesTitle) {
                    description += responsibilitiesTitle + '\n';
                }
                
                // Get responsibilities list items
                const responsibilitiesList = document.querySelectorAll('.responsibilities-list li');
                if (responsibilitiesList.length > 0) {
                    responsibilitiesList.forEach((li, index) => {
                        const text = li.innerText.trim();
                        if (text) {
                            description += `• ${text}\n`;
                        }
                    });
                }
                
                // Fallback to other description selectors if no specific content found
                if (!description.trim()) {
                    description = getText('div.ATS_htmlPreview') || getText('div#cw-rich-description') || '';
                }

                return {
                    title,
                    company: 'Doqfy',
                    description,
                    location,
                    experience,
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
                    const enrichedJob = extractDoqfyData(jobData);
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

const extractDoqfyData = (job) => {
    if (!job) return job;

    let cleanedDescription = job.description || '';
    let experience = job.experience || '';

    if (cleanedDescription) {
        // Remove sections like Job Title, Location, Type, Experience, About Us intro, Why Join Us, About RevenueHero, About Fello
        cleanedDescription = cleanedDescription// Remove About Us intro until next section
            .replace(
                /About Us\s*\n+[\s\S]*?We're building a powerful natural language query engine \+ spreadsheet interface to help finance teams model, analyze, and automate reporting like never before\./,
                ''
            )
            .replace(
                /Why Join Us\s*\n+This is a unique opportunity to join a category-defining company at a pivotal stage\. You'll get to build impactful products, work alongside high-performing teams, and help shape the future of how businesses manage procurement\.\s*\n+\s*If you're excited by complex challenges, want to own meaningful product surfaces, and are ready to modernise the procurement industry, we'd love to talk to you\./i,
                ''
            )
            .replace(
                /About RevenueHero\s*\n+RevenueHero is one of the fastest-growing tech startups that helps marketing teams turn more of the website visitors into sales meetings instantly\.\s*\n+\s*Ready to design experiences that make people say "wow"\?\s*\n+\s*We're hunting for a Product Designer who doesn't just push pixels around – someone who crafts digital magic that users actually love to interact with\. If you dream in user flows and wake up thinking about micro-interactions, this might be your new creative playground\./i,
                ''
            )
            .replace(
                /About Fello:\s*\n+\s*Fello is a profitable, hyper-growth, VC-backed B2B SaaS startup on a mission to empower businesses with data-driven intelligence\. Our AI-powered marketing automation platform helps businesses optimize engagement, make smarter decisions, and stay ahead in a competitive market\.\s*\n+\s*With massive growth potential and a track record of success, we're just getting started\. If you're passionate about innovation and want to be part of an industry-defining team, Fello is the place to be\.\s*\n+\s*About You:\s*\n+\s*/i,
                ''
            )

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
const Doqfy = async ({ headless = true } = {}) => {
    const scraper = new DoqfyJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};


export default Doqfy;

// ✅ CLI support: node phonepe.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await Doqfy({ headless: headlessArg });
    })();
}
