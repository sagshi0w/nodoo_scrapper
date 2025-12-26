import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class GlobalLogicJobsScraper {
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
        console.log('🌐 Navigating to GlobalLogic Careers...');
        await this.page.goto('https://www.globallogic.com/careers/open-positions', {
            waitUntil: 'networkidle2'
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];
        const existingLinks = new Set();

        while (true) {
            // Wait for job links to load (with longer timeout and error handling)
            try {
                await this.page.waitForSelector('a.job_box', { timeout: 15000 });
            } catch (err) {
                console.log('⚠️ Job links selector not found, checking if page loaded...');
                await delay(3000);
            }

            // Collect current links before clicking
            const linksBeforeClick = this.allJobLinks.length;

            // Collect new links
            const jobLinks = await this.page.$$eval(
                'a.job_box',
                anchors => anchors.map(a => a.href)
            ).catch(() => []);

            if (jobLinks.length === 0) {
                console.log('⚠️ No job links found on this page.');
                // If we haven't collected any links yet, the selector might be wrong
                if (this.allJobLinks.length === 0) {
                    console.log('❌ No links collected. Selector might be incorrect or page structure changed.');
                    break;
                }
                // If we have links but this page has none, check pagination
                const hasPagination = await this.page.$('.pagination');
                if (!hasPagination) {
                    console.log('✅ No pagination found. Done.');
                    break;
                }
            }

            for (const link of jobLinks) {
                if (!existingLinks.has(link)) {
                    existingLinks.add(link);
                    this.allJobLinks.push(link);
                }
            }

            console.log(`📄 Collected ${this.allJobLinks.length} unique job links so far...`);

            // Find next page link
            const paginationInfo = await this.page.evaluate(() => {
                const currentPage = document.querySelector('.page-numbers.current');
                const currentPageNum = currentPage ? parseInt(currentPage.textContent.trim()) : null;
                
                // Try to find "Next" button first
                const nextButton = document.querySelector('.pagination a.next.page-numbers');
                if (nextButton) {
                    return {
                        currentPage: currentPageNum,
                        nextPageUrl: nextButton.href,
                        hasNext: true
                    };
                }
                
                // If no "Next" button, find the next page number
                const allPageLinks = Array.from(document.querySelectorAll('.pagination a.page-numbers'));
                const nextPageLink = allPageLinks.find(link => {
                    const pageNum = parseInt(link.textContent.trim());
                    return !isNaN(pageNum) && pageNum === currentPageNum + 1;
                });
                
                if (nextPageLink) {
                    return {
                        currentPage: currentPageNum,
                        nextPageUrl: nextPageLink.href,
                        hasNext: true
                    };
                }
                
                return {
                    currentPage: currentPageNum,
                    nextPageUrl: null,
                    hasNext: false
                };
            });

            if (!paginationInfo.hasNext || !paginationInfo.nextPageUrl) {
                console.log('✅ No more pages. Done.');
                break;
            }

            // Navigate to the next page
            console.log(`➡️ Navigating to page ${paginationInfo.currentPage + 1}...`);
            await this.page.goto(paginationInfo.nextPageUrl, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            await delay(5000); // Give extra time for content to load
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
                
                // Helper function to find value by label in career_banner_details
                const getDetailValue = (label) => {
                    const details = document.querySelectorAll('.career_banner_details');
                    for (const detail of details) {
                        const span = detail.querySelector('span');
                        if (span && span.textContent.trim() === label) {
                            const p = detail.querySelector('p');
                            return p ? p.innerText.trim() : '';
                        }
                    }
                    return '';
                };
                
                // Extract description excluding "About GlobalLogic" section
                let description = '';
                const careerDetailArea = document.querySelector('div.career_detail_area');
                if (careerDetailArea) {
                    const h4s = careerDetailArea.querySelectorAll('h4');
                    const sections = [];
                    
                    for (let i = 0; i < h4s.length; i++) {
                        const h4 = h4s[i];
                        const headingText = h4.textContent.trim();
                        
                        // Skip "About GlobalLogic" section
                        if (headingText.includes('About GlobalLogic')) {
                            continue;
                        }
                        
                        // Get content from this h4 to the next h4 (or end)
                        let sectionContent = headingText + '\n';
                        let nextElement = h4.nextElementSibling;
                        
                        while (nextElement) {
                            if (nextElement.tagName === 'H4') {
                                break;
                            }
                            sectionContent += nextElement.textContent.trim() + '\n';
                            nextElement = nextElement.nextElementSibling;
                        }
                        
                        sections.push(sectionContent.trim());
                    }
                    
                    description = sections.join('\n\n');
                }
                
                return {
                    title: getText('.career_detail_banner_right h1'),
                    company: 'GlobalLogic',
                    location: getDetailValue('Location'),
                    experience: getDetailValue('Experience'),
                    skills: getDetailValue('Skills'),
                    description: description || getText('div.career_detail_area'),
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
        console.log(`💾 Saved ${this.allJobs.length} jobs.`);
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

    const expPatterns = [
        /\b(\d{1,2})\s*\+\s*(?:years|yrs|yr)\b/i,
        /\bminimum\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i,
        /\bmin(?:imum)?\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i,
        /\b(\d{1,2})\s*(?:to|–|-|–)\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i,
        /\b(?:at least|over)\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i,
        /\b(\d{1,2})\s*(?:years|yrs|yr)\s+experience\b/i,
        /\bexperience\s*(?:of)?\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i,
        /\bexperience\s*(?:required)?\s*[:\-]?\s*(\d{1,2})\s*(?:[-to]+)?\s*(\d{1,2})?\s*(?:years|yrs|yr)?/i,
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
        cleanedDescription = cleanedDescription.replace(
            /(Current Openings|Job Summary)[\s\S]*?(?:Apply\.?\s*)?(?=\n{2,}|$)/gi,
            ''
        );

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
const runGlobalLogicJobsScraper = async ({ headless = true } = {}) => {
    const scraper = new GlobalLogicJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runGlobalLogicJobsScraper;

// ✅ CLI support: node phonepe.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await runGlobalLogicJobsScraper({ headless: headlessArg });
    })();
}
