import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class AckoJobsScraper {
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
        console.log('🌐 Navigating to Acko Careers...');
        await this.page.goto('https://www.acko.com/careers/jobs/', {
            waitUntil: 'networkidle2'
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];
        let pageIndex = 1;
        const existingLinks = new Set();

        while (true) {
            // Wait for job cards to load - try multiple selectors
            let jobCardsFound = false;
            const selectors = [
                'div.chakra-card',
                'a.chakra-link[href*="/acko/"]',
                'a[href*="/acko/"]',
                '[class*="chakra-card"]',
                '[class*="job"]'
            ];

            for (const selector of selectors) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 5000 });
                    jobCardsFound = true;
                    console.log(`✅ Found elements with selector: ${selector}`);
                    break;
                } catch (err) {
                    // Try next selector
                    continue;
                }
            }

            if (!jobCardsFound) {
                // Debug: log what's actually on the page
                const pageContent = await this.page.evaluate(() => {
                    return {
                        title: document.title,
                        bodyClasses: document.body?.className || '',
                        links: Array.from(document.querySelectorAll('a')).slice(0, 10).map(a => ({
                            href: a.getAttribute('href'),
                            text: a.textContent.trim().substring(0, 50),
                            classes: a.className
                        })),
                        divs: Array.from(document.querySelectorAll('div')).slice(0, 5).map(d => ({
                            classes: d.className,
                            id: d.id
                        }))
                    };
                });
                console.log('🔍 Page debug info:', JSON.stringify(pageContent, null, 2));
                throw new Error('Could not find job cards on the page. Page may have changed structure.');
            }

            // Collect new links using div.chakra-card a[href] selector
            let jobLinks = [];
            try {
                jobLinks = await this.page.$$eval(
                    'div.chakra-card a[href]',
                    anchors => anchors.map(a => {
                        const href = a.getAttribute('href');
                        // Convert relative URLs to absolute
                        if (href && href.startsWith('/')) {
                            return `https://www.acko.com${href}`;
                        }
                        return href;
                    }).filter(Boolean)
                );
            } catch (err) {
                console.warn('⚠️ Could not extract job links:', err.message);
                jobLinks = [];
            }

            for (const link of jobLinks) {
                if (!existingLinks.has(link)) {
                    existingLinks.add(link);
                    this.allJobLinks.push(link);
                }
            }

            console.log(`📄 Collected ${this.allJobLinks.length} unique job links so far...`);

            // Check for pagination - try multiple possible selectors
            let pageNumbers = [];
            let hasLoadMore = false;
            try {
                pageNumbers = await this.page.$$eval('ul.pagination li a, button[aria-label*="page"], a[href*="page"]', links =>
                    links
                        .map(a => ({
                            text: a.textContent.trim(),
                            href: a.getAttribute('href') || a.getAttribute('aria-label') || '',
                        }))
                        .filter(a => /^\d+$/.test(a.text) || /page\s*\d+/i.test(a.text)) // Page numbers
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
            
            // Wait for job content to load - try multiple possible selectors
            await jobPage.waitForSelector('div.chakra-card, div[class*="job"], h1, h2', { timeout: 10000 });

            const job = await jobPage.evaluate(() => {
                const getText = sel => {
                    const el = document.querySelector(sel);
                    return el?.innerText?.trim() || el?.textContent?.trim() || '';
                };
                
                // Try multiple selectors for each field
                const title = getText('h1') || getText('h2') || getText('h3') || 
                             getText('p.chakra-text.css-f8zk62') || 
                             getText('[class*="title"], [class*="job-title"]');
                
                // Location - look for text with location icon or location-related classes
                const location = getText('p.chakra-text.css-7pftiu') || 
                                getText('[class*="location"]') ||
                                Array.from(document.querySelectorAll('p, span, div'))
                                    .find(el => el.textContent.includes('Mumbai') || 
                                                el.textContent.includes('Bangalore') ||
                                                el.textContent.includes('Delhi') ||
                                                el.textContent.includes('Hyderabad'))?.textContent?.trim() || '';
                
                // Description - try multiple selectors
                const description = getText('div[class*="description"]') ||
                                   getText('div[class*="detail"]') ||
                                   getText('div[class*="content"]') ||
                                   getText('div._detail-content') ||
                                   getText('div.job__description') ||
                                   Array.from(document.querySelectorAll('div'))
                                       .find(el => el.textContent.length > 200)?.textContent?.trim() || '';
                
                return {
                    title,
                    company: 'Acko',
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
const runAckoJobsScraper = async ({ headless = true } = {}) => {
    const scraper = new AckoJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runAckoJobsScraper;

// ✅ CLI support: node acko.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await runAckoJobsScraper({ headless: headlessArg });
    })();
}
