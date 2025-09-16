import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class JhanaJobsScraper {
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
        console.log('🌐 Navigating to Jhana Careers...');
        await this.page.goto('https://jhana.ai/careers/', {
            waitUntil: 'networkidle2'
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];
        const existingLinks = new Set();

        while (true) {
            // Collect job links on current page
            const jobLinks = await this.page.$$eval(`a.MuiButtonBase-root.MuiButton-containedPrimary.css-1jpytnf[href^="/careers/"]`, anchors =>
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

                // Extract job title
                let rawTitle = getText('h2.MuiTypography-root.MuiTypography-h2');
                let title = rawTitle.trim();

                let rawLocation = getText('div.MuiGrid-container > div.MuiGrid-item:nth-child(3) span.MuiChip-label');
                let location = rawLocation.trim();

                // let rawExperience = getText('div.MuiTypography-root.MuiTypography-body1');
                // let experience = rawExperience.trim();

                // Extract About the Role and About You sections from the main job content area
                // Look for sections within the main job page content, not from other job cards
                const mainContent = document.querySelector('div.MuiBox-root > div.MuiGrid-container');
                let aboutRoleContent = '';
                let aboutYouContent = '';
                
                if (mainContent) {
                    const sections = mainContent.querySelectorAll('div.MuiPaper-root');
                    sections.forEach(section => {
                        const heading = section.querySelector('h4');
                        if (heading) {
                            const headingText = heading.textContent.trim().toLowerCase();
                            if (headingText.includes('about the role')) {
                                aboutRoleContent = section.textContent.trim();
                            } else if (headingText.includes('about you')) {
                                aboutYouContent = section.textContent.trim();
                            }
                        }
                    });
                }
                
                // Combine both sections as description
                let description = '';
                let gotTargetSections = false;
                if (aboutRoleContent) {
                    description += aboutRoleContent + '\n\n';
                    gotTargetSections = true;
                }
                if (aboutYouContent) {
                    description += aboutYouContent;
                    gotTargetSections = true;
                }
                
                // Fallback to main content area if specific sections not found
                if (!description.trim()) {
                    const mainContentArea = document.querySelector('div.MuiBox-root > div.MuiGrid-container');
                    if (mainContentArea) {
                        description = mainContentArea.textContent.trim();
                    } else {
                        description = getText('div.MuiBox-root');
                    }
                }
                
                // Clean up description - avoid removing valid content
                if (description) {
                    const originalDescription = description;
                    if (gotTargetSections) {
                        // Minimal cleanup when we have exact sections
                        description = description
                            .replace(/\n{3,}/g, '\n\n')
                            .trim();
                    } else {
                        // Conservative removals for page-wide noise: truncate tail after first footer marker
                        const original = description;
                        const lower = description.toLowerCase();
                        const markers = [
                            'apply using this form',
                            'company\n',
                            'resources\n',
                            'founded at harvard in 2022',
                            'privacy policy',
                            'terms & conditions',
                            'service status'
                        ];
                        let cutIndex = -1;
                        for (const m of markers) {
                            const idx = lower.indexOf(m);
                            if (idx !== -1) {
                                cutIndex = cutIndex === -1 ? idx : Math.min(cutIndex, idx);
                            }
                        }
                        if (cutIndex !== -1) {
                            description = description.slice(0, cutIndex);
                        }
                        description = description
                            .replace(/\n{3,}/g, '\n\n')
                            .trim();
                        if (description.length < 80) {
                            description = original.trim();
                        }
                    }
                    // Safeguard: if we accidentally wiped it, revert to original
                    if (!description.trim()) {
                        description = originalDescription.trim();
                    }
                }

                return {
                    title,
                    company: 'Jhana',
                    description,
                    // experience,
                    location,
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
        console.log(`💾 Saved ${this.allJobs.length} jobs to Jhana.json`);
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

    if (cleanedDescription) {
        // Remove sections like Job Title, Location, Type, Experience, About Us intro
        cleanedDescription = cleanedDescription
            .replace(/Job\s+Title:\s*.*\n?/i, '')
            .replace(/Location:\s*.*\n?/i, '')
            .replace(/Type:\s*.*\n?/i, '')
            .replace(/Experience:\s*.*\n?/i, '')
            .replace(/About Us\s*\n+[\s\S]*?(?=\n{2,}[A-Z])/i, '') // Remove About Us intro until next section
            .replace(
                /About Us\s*\n+[\s\S]*?We’re building a powerful natural language query engine \+ spreadsheet interface to help finance teams model, analyze, and automate reporting like never before\./,
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
const Jhana = async ({ headless = true } = {}) => {
    const scraper = new JhanaJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};


export default Jhana;

// ✅ CLI support: node phonepe.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await Jhana({ headless: headlessArg });
    })();
}
