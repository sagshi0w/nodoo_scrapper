import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class ClearTaxJobsScraper {
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
        console.log('🌐 Navigating to ClearTax Careers...');
        try {
            await this.page.goto('https://clear.darwinbox.in/ms/candidate/careers', {
                waitUntil: 'networkidle2',
                timeout: 30000
            });
            
            // Wait for page to fully render
            await delay(8000);
            
            // Scroll to trigger lazy loading
            for (let i = 0; i < 3; i++) {
                await this.page.evaluate(() => {
                    window.scrollTo(0, document.body.scrollHeight);
                });
                await delay(2000);
            }
            
            // Scroll back to top
            await this.page.evaluate(() => {
                window.scrollTo(0, 0);
            });
            await delay(2000);
            
            // Wait for job links to appear
            await this.page.waitForFunction(
                () => {
                    return document.querySelectorAll('a.clickable.color-blue.custom-theme-color, a[href*="/careers/"]').length > 0 ||
                           document.body.innerText.includes('Software Engineer') ||
                           document.body.innerText.includes('Engineer');
                },
                { timeout: 15000 }
            ).catch(() => {
                console.warn('⚠️ Timeout waiting for dynamic content, continuing anyway...');
            });
            
        } catch (err) {
            console.warn('⚠️ Navigation warning:', err.message);
            // Continue anyway, might still work
        }
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];
        let pageIndex = 1;
        const existingLinks = new Set();

        while (true) {
            // Wait for job links to load
            try {
                await this.page.waitForSelector('a.clickable.color-blue.custom-theme-color, a.clickable[href*="/careers/"]', { timeout: 15000 });
            } catch (err) {
                console.warn('⚠️ Could not find job links, trying alternative selectors...');
                // Try alternative selectors
                const altSelectors = [
                    'a[href*="/careers/"]',
                    'a.clickable',
                    '.job-list-wrap.job_list > a'
                ];
                let found = false;
                for (const selector of altSelectors) {
                    try {
                        await this.page.waitForSelector(selector, { timeout: 5000 });
                        found = true;
                        break;
                    } catch (e) {
                        continue;
                    }
                }
                if (!found) {
                    console.log('✅ No more job links found. Done.');
                    break;
                }
            }

            // Collect new links using a.clickable.color-blue.custom-theme-color selector
            let jobLinks = [];
            try {
                jobLinks = await this.page.$$eval(
                    'a.clickable.color-blue.custom-theme-color[href*="/careers/"], a.clickable[href*="/careers/"]',
                    anchors => anchors.map(a => a.href).filter(Boolean)
                );
            } catch (err) {
                // Fallback to alternative selectors
                try {
                    jobLinks = await this.page.$$eval(
                        'a[href*="/careers/"]',
                        anchors => anchors.map(a => a.href).filter(Boolean)
                    );
                } catch (err2) {
                    console.warn('⚠️ Could not extract job links:', err2.message);
                    jobLinks = [];
                }
            }

            for (const link of jobLinks) {
                if (!existingLinks.has(link)) {
                    existingLinks.add(link);
                    this.allJobLinks.push(link);
                }
            }

            console.log(`📄 Collected ${this.allJobLinks.length} unique job links so far (${jobLinks.length} new on this page)...`);

            // If no job links found on this iteration and we're on the first page, something is wrong
            if (jobLinks.length === 0 && pageIndex === 1) {
                console.warn('⚠️ No job links found on the first page. Page structure may have changed.');
                break;
            }

            // If no new links found and we have some links already, we're done
            if (jobLinks.length === 0 && this.allJobLinks.length > 0) {
                console.log('✅ No more job links found. Done.');
                break;
            }

            // Check for pagination
            let pageNumbers = [];
            let hasLoadMore = false;
            try {
                pageNumbers = await this.page.$$eval('ul.pagination li a, button[aria-label*="page"], a[href*="page"]', links =>
                    links
                        .map(a => ({
                            text: a.textContent.trim(),
                            href: a.getAttribute('href') || a.getAttribute('aria-label') || '',
                        }))
                        .filter(a => /^\d+$/.test(a.text) || /page\s*\d+/i.test(a.text))
                );
                
                // Check for "Load More" or "Show More" buttons
                const loadMoreButtons = await this.page.$$eval('button', buttons =>
                    buttons
                        .map(b => b.textContent.trim().toLowerCase())
                        .filter(text => text.includes('load more') || text.includes('show more') || text.includes('more'))
                );
                hasLoadMore = loadMoreButtons.length > 0;
            } catch (err) {
                // No pagination found
            }

            // Try to find next page button or link
            const nextPage = pageNumbers.find(p => {
                const pageNum = p.text.match(/\d+/)?.[0];
                return pageNum && Number(pageNum) === pageIndex + 1;
            });

            // If no pagination and no load more, we're done
            if (!nextPage && pageNumbers.length === 0 && !hasLoadMore) {
                console.log('✅ No more pages left. Done.');
                break;
            }

            // If there's a load more button, click it
            if (hasLoadMore && !nextPage) {
                console.log(`➡️ Clicking "Load More" button...`);
                try {
                    await this.page.evaluate(() => {
                        const buttons = Array.from(document.querySelectorAll('button'));
                        const loadMoreBtn = buttons.find(b => {
                            const text = b.textContent.trim().toLowerCase();
                            return text.includes('load more') || text.includes('show more');
                        });
                        if (loadMoreBtn) loadMoreBtn.click();
                    });
                    await delay(3000);
                    pageIndex++;
                    continue;
                } catch (err) {
                    console.warn(`⚠️ Could not click load more: ${err.message}`);
                    break;
                }
            }

            if (!nextPage) {
                console.log('✅ No more pages left. Done.');
                break;
            }

            // Click the next page
            console.log(`➡️ Clicking page ${pageIndex + 1}`);
            try {
                await this.page.evaluate((pageNum) => {
                    const links = Array.from(document.querySelectorAll('ul.pagination li a, a[href*="page"]'));
                    const nextLink = links.find(a => {
                        const text = a.textContent.trim();
                        return text === String(pageNum) || text.includes(`Page ${pageNum}`);
                    });
                    if (nextLink) {
                        nextLink.click();
                        return true;
                    }
                    return false;
                }, pageIndex + 1);
                await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
            } catch (err) {
                console.warn(`⚠️ Could not navigate to page ${pageIndex + 1}: ${err.message}`);
                break;
            }

            pageIndex++;
            await delay(2000);
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
                return {
                    title: getText('h2.white-header'),
                    company: 'ClearTax',
                    location: getText('p.green'),
                    description: getText('div._detail-content'),
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
        console.log(`💾 Saved ${this.allJobs.length} jobs to ClearTax.json`);
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
const runClearTaxJobsScraper = async ({ headless = true } = {}) => {
    const scraper = new ClearTaxJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runClearTaxJobsScraper;

// ✅ CLI support: node phonepe.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await runClearTaxJobsScraper({ headless: headlessArg });
    })();
}
