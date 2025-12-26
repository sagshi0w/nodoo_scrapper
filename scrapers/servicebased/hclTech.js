import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class HclTechJobsScraper {
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
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                '--disable-features=IsolateOrigins,site-per-process',
                ...(this.headless ? [] : ['--start-maximized'])
            ],
            defaultViewport: this.headless ? { width: 1920, height: 1080 } : null
        });
        this.page = await this.browser.newPage();
        await this.page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );
    }

    async navigateToJobsPage() {
        console.log('🌐 Navigating to HclTech Careers...');
        const maxRetries = 3;
        let retryCount = 0;
        
        while (retryCount < maxRetries) {
            try {
                await this.page.goto('https://www.hcltech.com/engineering/job-opening#engineering-job-section', {
                    waitUntil: 'domcontentloaded',
                    timeout: 60000
                });
                await delay(5000);
                
                // Wait for job links to be available
                try {
                    await this.page.waitForSelector('td.views-field-title a[href]', { timeout: 10000 });
                    console.log('✅ Page loaded successfully');
                    return; // Success, exit retry loop
                } catch (err) {
                    console.log('⚠️ Job links not immediately available, continuing anyway...');
                    return; // Page loaded but selector not found, continue anyway
                }
            } catch (error) {
                retryCount++;
                if (retryCount >= maxRetries) {
                    console.error(`❌ Navigation error after ${maxRetries} attempts:`, error.message);
                    throw error;
                }
                console.log(`⚠️ Navigation attempt ${retryCount} failed, retrying... (${error.message})`);
                await delay(3000 * retryCount); // Exponential backoff
            }
        }
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];
        const existingLinks = new Set();
        let loadMoreClicks = 0;
        const maxClicks = 100; // Safety limit to prevent infinite loops

        while (true) {
            // Collect current links on the page
            const jobLinks = await this.page.$$eval(
                'td.views-field-title a[href]',
                anchors =>
                    [...new Set(
                        anchors
                            .map(a => a.getAttribute('href'))
                            .filter(Boolean)
                            .map(href =>
                                href.startsWith('http')
                                    ? href
                                    : `https://hcltech.com${href}`
                            )
                    )]
            );

            // Add new links
            let newLinksCount = 0;
            for (const link of jobLinks) {
                if (!existingLinks.has(link)) {
                    existingLinks.add(link);
                    this.allJobLinks.push(link);
                    newLinksCount++;
                }
            }

            console.log(`📄 Collected ${this.allJobLinks.length} unique job links (${newLinksCount} new)...`);

            // Check if "Load More" button exists and is visible
            const loadMoreButton = await this.page.$('a.filters-more[aria-label*="Load More"]');
            
            if (!loadMoreButton) {
                console.log('✅ No "Load More" button found. All jobs loaded.');
                break;
            }

            // Check if button is visible and enabled
            const isVisible = await loadMoreButton.evaluate(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && 
                       style.visibility !== 'hidden' && 
                       el.offsetParent !== null;
            });

            if (!isVisible) {
                console.log('✅ "Load More" button is not visible. All jobs loaded.');
                break;
            }

            // Safety check
            if (loadMoreClicks >= maxClicks) {
                console.log(`⚠️ Reached maximum clicks (${maxClicks}). Stopping.`);
                break;
            }

            // Click the "Load More" button
            loadMoreClicks++;
            console.log(`➡️ Clicking "Load More" button (click ${loadMoreClicks})...`);
            
            try {
                await loadMoreButton.click();
                // Wait for new content to load
                await delay(3000);
            } catch (err) {
                console.log('⚠️ Error clicking "Load More" button:', err.message);
                break;
            }
        }

        console.log(`✅ Finished collecting ${this.allJobLinks.length} unique job links.`);
        return this.allJobLinks;
    }


    async extractJobDetailsFromLink(url) {
        const jobPage = await this.browser.newPage();
        try {
            // Set user agent for job page as well
            await jobPage.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
                '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            );
            
            const maxRetries = 2;
            let retryCount = 0;
            let navigationSuccess = false;
            
            while (retryCount < maxRetries && !navigationSuccess) {
                try {
                    await jobPage.goto(url, { 
                        waitUntil: 'domcontentloaded',
                        timeout: 60000 
                    });
                    navigationSuccess = true;
                } catch (err) {
                    retryCount++;
                    if (retryCount >= maxRetries) {
                        throw err;
                    }
                    console.log(`⚠️ Retrying navigation to ${url} (attempt ${retryCount + 1})...`);
                    await delay(2000 * retryCount);
                }
            }
            
            await delay(5000);
            
            // Wait for key elements to be available
            try {
                await jobPage.waitForSelector('h1.box-title, span.box-tag', { timeout: 10000 });
            } catch (err) {
                console.log('⚠️ Job page elements not immediately available, continuing anyway...');
            }

            const job = await jobPage.evaluate(() => {
                const getText = sel => document.querySelector(sel)?.innerText.trim() || '';

                // Extract description - look for the container with job description sections
                let description = '';

                // Find the parent container that holds all description sections
                // Look for divs containing sections with h2 headings like "Your role", "Your profile", etc.
                const h2Sections = document.querySelectorAll('div h2');
                if (h2Sections.length > 0) {
                    // Get the common parent of all these sections
                    const firstSection = h2Sections[0];
                    let parentContainer = firstSection.parentElement;

                    // Walk up to find the container that holds all sections
                    while (parentContainer && parentContainer.tagName === 'DIV') {
                        const allH2InContainer = parentContainer.querySelectorAll('h2');
                        // If this container has multiple h2 sections, it's likely our description container
                        if (allH2InContainer.length >= 2) {
                            description = parentContainer.innerText.trim();
                            break;
                        }
                        parentContainer = parentContainer.parentElement;
                    }

                    // If we didn't find a good parent, just get content from the first section's parent
                    if (!description && firstSection.parentElement) {
                        description = firstSection.parentElement.closest('div')?.innerText.trim() || '';
                    }
                }

                // Alternative: Look for div with inline styles matching the description structure
                if (!description) {
                    const styledDivs = document.querySelectorAll('div[style*="padding:10.0px"]');
                    if (styledDivs.length > 0) {
                        // Find the parent that contains multiple such divs
                        const firstStyledDiv = styledDivs[0];
                        let container = firstStyledDiv.parentElement;
                        while (container && container.tagName === 'DIV') {
                            const childStyledDivs = container.querySelectorAll('div[style*="padding:10.0px"]');
                            if (childStyledDivs.length >= 2) {
                                description = container.innerText.trim();
                                break;
                            }
                            container = container.parentElement;
                        }
                    }
                }

                // Fallback to original selector
                if (!description) {
                    description = getText('div._detail-content');
                }

                // Last fallback - try common description selectors
                if (!description) {
                    description = getText('.job-description') ||
                        getText('[class*="detail"]') ||
                        getText('[class*="description"]') || '';
                }

                return {
                    title: getText('h1.box-title'),
                    company: 'HclTech',
                    location: getText('span.box-tag'),
                    description: description || '',
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
                const enrichedJob = extractHclTechData(jobData);
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

const extractHclTechData = (job) => {
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
const runHclTechJobsScraper = async ({ headless = true } = {}) => {
    const scraper = new HclTechJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runHclTechJobsScraper;

// ✅ CLI support: node phonepe.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await runHclTechJobsScraper({ headless: headlessArg });
    })();
}
