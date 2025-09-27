import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class DelaplexJobsScraper {
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
        console.log('🌐 Navigating to Delaplex Careers...');
        await this.page.goto('https://delaplex.com/careers/ats-portal/', {
            waitUntil: 'networkidle2'
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];
        const existingLinks = new Set();

        while (true) {
            // Debug: Check what elements are available
            const debugInfo = await this.page.evaluate(() => {
                const jobCards = document.querySelectorAll('.job-card-container');
                const allBtns = document.querySelectorAll('a.btn');
                const careerBtns = document.querySelectorAll('a.btn[href*="/careers"]');
                const jobCardBtns = document.querySelectorAll('.job-card-container a.btn');
                
                return {
                    jobCards: jobCards.length,
                    allBtns: allBtns.length,
                    careerBtns: careerBtns.length,
                    jobCardBtns: jobCardBtns.length,
                    sampleHrefs: Array.from(careerBtns).slice(0, 3).map(a => a.href)
                };
            });
            
            console.log('🔍 Debug info:', debugInfo);
            
            // Collect job links from job card containers
            const jobLinks = await this.page.$$eval(`.job-card-container a.btn[href*="/careers"]`, anchors =>
                anchors.map(a => {
                    // Convert relative URLs to absolute URLs
                    const href = a.href;
                    if (href.startsWith('/')) {
                        return `https://delaplex.com${href}`;
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

            // Click "Load More" button if it exists
            try {
                console.log("➡️ Clicking Load More...");
                await this.page.click('#load_more_jobs2');
                
                // Wait for new jobs to load
                await this.page.waitForFunction(
                    (prevCount) => {
                        return document.querySelectorAll('.job-card-container a.btn[href*="/careers"]').length > prevCount;
                    },
                    {},
                    jobLinks.length
                );

                // Small delay to stabilize
                await delay(3000);
            } catch (error) {
                console.log("⚠️ Load More button not found or failed to click:", error.message);
                break;
            }
        }

        return this.allJobLinks;
    }




    async extractJobDetailsFromLink(url) {
        const jobPage = await this.browser.newPage();
        try {
            await jobPage.goto(url, { waitUntil: 'networkidle2' });
            await delay(5000);
            
            const job = await jobPage.evaluate(() => {
                const getText = sel => document.querySelector(sel)?.innerText.trim() || '';

                // Extract job title - try multiple selectors
                let title = getText('.c-title.font-primary.h4.text-capitalize.d-inline-block') || 
                           getText('.c-title') || 
                           getText('h1') || 
                           getText('h2') || 
                           getText('.job-title') || 
                           getText('[class*="title"]') ||
                           getText('title');

                // Extract company name
                let company = getText('.company-name') || 
                             getText('[class*="company"]') || 
                             'Delaplex';

                // Extract location from job details section
                let location = '';
                const locationSpan = document.querySelector('.more-job-details .fa-map-marker-alt')?.parentElement;
                if (locationSpan) {
                    const locationText = locationSpan.querySelector('p')?.innerText.trim();
                    if (locationText) {
                        location = locationText;
                    }
                }
                
                // Fallback location selectors
                if (!location) {
                    location = getText('.location') || 
                              getText('[class*="location"]') || 
                              getText('.job-location') ||
                              'Remote';
                }

                // Extract experience from job details section
                let experience = '';
                const experienceSpan = document.querySelector('.more-job-details .fa-briefcase')?.parentElement;
                if (experienceSpan) {
                    const experienceText = experienceSpan.querySelector('p')?.innerText.trim();
                    if (experienceText) {
                        experience = experienceText;
                    }
                }
                
                // Fallback experience selectors
                if (!experience) {
                    experience = getText('.experience') || 
                                getText('[class*="experience"]') || 
                                getText('.work-experience') ||
                                '';
                }

                // Extract job description from the specific Delaplex section
                let description = '';
                const jobDescriptionElement = document.querySelector('.content-left.jd-description[data-testid="careers-job-description"]');
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
                    company: company || 'Delaplex',
                    description: description || 'Description not available',
                    location: location || 'Pune',
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
                    const enrichedJob = extractDelaplexData(jobData);
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

const extractDelaplexData = (job) => {
    if (!job) return job;

    let cleanedDescription = job.description || '';
    let experience = job.experience || '';

    if (cleanedDescription) {
        // Remove "About Company" section
        cleanedDescription = cleanedDescription
            .replace(/About Company:\s*At Delaplex, we believe true organizational distinction comes from exceptional products and services\. Founded in 2008 by a team of like-minded business enthusiasts, we have grown into a trusted name in technology consulting and supply chain solutions\. Our reputation is built on trust, innovation, and the dedication of our people who go the extra mile for our clients\. Guided by our core values, we don't just deliver solutions, we create meaningful impact\.\s*/gi, '')
            // Remove any remaining "About Company:" headers
            .replace(/About Company:\s*/gi, '')
            // Remove Location:, Experience:, and Role: lines
            .replace(/^Location:\s*.*$/gim, '')
            .replace(/^Experience:\s*.*$/gim, '')
            .replace(/^Role:\s*.*$/gim, '')
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
const Delaplex = async ({ headless = true } = {}) => {
    const scraper = new DelaplexJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};


export default Delaplex;

// ✅ CLI support: node delaplex.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await Delaplex({ headless: headlessArg });
    })();
}
