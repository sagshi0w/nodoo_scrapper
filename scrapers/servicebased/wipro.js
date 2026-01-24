import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class WiproJobsScraper {
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
        console.log('🌐 Navigating to Wipro Careers...');
        try {
            await this.page.goto('https://careers.wipro.com/search/?q=&locationsearch=&searchResultView=LIST&markerViewed=&carouselIndex=&facetFilters=%7B%7D&pageNumber=0', {
                waitUntil: 'networkidle2',
                timeout: 60000
            });
            
            // Wait for page to fully render
            await delay(5000);
            
            // Wait for job cards and pagination to appear
            await this.page.waitForFunction(
                () => {
                    return document.querySelectorAll('li[data-testid="jobCard"]').length > 0 ||
                           document.querySelectorAll('nav[data-testid="paginatorWrapper"]').length > 0;
                },
                { timeout: 15000 }
            ).catch(() => {
                console.warn('⚠️ Timeout waiting for job cards, continuing anyway...');
            });
            
        } catch (err) {
            console.warn('⚠️ Navigation warning:', err.message);
        }
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];
        let pageIndex = 1;
        const existingLinks = new Set();

        while (true) {
            // Wait for job cards to load
            try {
                await this.page.waitForSelector('li[data-testid="jobCard"]', { timeout: 15000 });
            } catch (err) {
                console.log('✅ No more job cards found. Done.');
                break;
            }

            // Collect new links
            let jobLinks = [];
            try {
                jobLinks = await this.page.$$eval(
                    'li[data-testid="jobCard"] a[href^="/job/"]',
                    anchors => anchors.map(a => a.href).filter(Boolean)
                );
            } catch (err) {
                console.warn('⚠️ Could not extract job links:', err.message);
                jobLinks = [];
            }

            const newLinksCount = jobLinks.filter(link => !existingLinks.has(link)).length;
            for (const link of jobLinks) {
                if (!existingLinks.has(link)) {
                    existingLinks.add(link);
                    this.allJobLinks.push(link);
                }
            }

            console.log(`📄 Page ${pageIndex}: Collected ${this.allJobLinks.length} unique job links so far (${newLinksCount} new on this page)...`);

            // Check for "Next" button using data-testid="goToNextPageBtn"
            let hasNextButton = false;
            try {
                const nextButton = await this.page.$('button[data-testid="goToNextPageBtn"]');
                if (nextButton) {
                    // Check if button is disabled
                    const isDisabled = await this.page.evaluate(btn => {
                        return btn.disabled || btn.getAttribute('aria-disabled') === 'true' || btn.classList.contains('disabled');
                    }, nextButton);
                    hasNextButton = !isDisabled;
                }
            } catch (err) {
                // No next button found
            }

            // If no next button or it's disabled, we're done
            if (!hasNextButton) {
                console.log('✅ No more pages left. Done.');
                break;
            }

            // Click the "Next" button
            console.log(`➡️ Clicking "Next" to go to page ${pageIndex + 1}...`);
            try {
                // Get current page number for comparison after click
                const currentPageNum = pageIndex;
                
                await this.page.click('button[data-testid="goToNextPageBtn"]');
                
                // Wait for page to update - wait for the new page button to become current
                await this.page.waitForFunction(
                    (expectedPage) => {
                        const currentBtn = document.querySelector(`button[data-testid="goToPage${expectedPage}"]`);
                        return currentBtn && (currentBtn.disabled || currentBtn.classList.contains('Paginator_currentBtn__6vdxQ'));
                    },
                    { timeout: 10000 },
                    pageIndex + 1
                ).catch(() => {
                    // If the specific wait fails, just wait a bit
                });
                
                await delay(2000); // Additional wait for content to load
            } catch (err) {
                console.warn(`⚠️ Could not click next button: ${err.message}`);
                break;
            }

            pageIndex++;
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
                
                // Get title
                const title = getText('span[itemprop="title"]');
                
                // Find location by looking for "City" label and getting the next span
                let location = '';
                const labels = Array.from(document.querySelectorAll('span.joblayouttoken-label'));
                for (const label of labels) {
                    if (label.textContent.trim().toLowerCase() === 'city') {
                        const nextSpan = label.nextElementSibling;
                        if (nextSpan && nextSpan.tagName === 'SPAN') {
                            location = nextSpan.innerText?.trim() || nextSpan.textContent?.trim() || '';
                        }
                        break;
                    }
                }
                
                // If no city found, try other location-related labels
                if (!location) {
                    for (const label of labels) {
                        const labelText = label.textContent.trim().toLowerCase();
                        if (labelText.includes('location') || labelText.includes('country')) {
                            const nextSpan = label.nextElementSibling;
                            if (nextSpan && nextSpan.tagName === 'SPAN') {
                                location = nextSpan.innerText?.trim() || nextSpan.textContent?.trim() || '';
                            }
                            break;
                        }
                    }
                }
                
                // Get description - collect all span.rtltextaligneligible content
                let description = '';
                const descSpans = document.querySelectorAll('span.rtltextaligneligible');
                if (descSpans.length > 0) {
                    description = Array.from(descSpans)
                        .map(span => span.innerText?.trim() || '')
                        .filter(Boolean)
                        .join('\n\n');
                }
                
                // Fallback for description
                if (!description) {
                    description = getText('div[data-automation-id="jobPostingDescription"]') ||
                                  getText('div.job-description') ||
                                  getText('div[class*="description"]') ||
                                  '';
                }
                
                return {
                    title,
                    company: 'Wipro',
                    location,
                    description,
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
        console.log(`💾 Saved ${this.allJobs.length} jobs to Wipro.json`);
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
const runWiproJobsScraper = async ({ headless = true } = {}) => {
    const scraper = new WiproJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runWiproJobsScraper;

// ✅ CLI support: node phonepe.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await runWiproJobsScraper({ headless: headlessArg });
    })();
}
