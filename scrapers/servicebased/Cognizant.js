import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class BrillioJobsScraper {
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
        console.log('🌐 Navigating to Cognizant Careers...');
        try {
            await this.page.goto('https://careers.cognizant.com/india-en/jobs/?keyword=&location=India&radius=100&lat=&lng=&cname=India&ccode=IN&pagesize=10#results', {
                waitUntil: 'networkidle2',
                timeout: 100000
            });
            await delay(5000);
            
            // Scroll multiple times to trigger lazy loading
            await this.page.evaluate(async () => {
                const scrollStep = 500;
                const scrollDelay = 300;
                const maxScrolls = 10;
                let scrolls = 0;
                let lastHeight = document.body.scrollHeight;
                
                while (scrolls < maxScrolls) {
                    window.scrollBy(0, scrollStep);
                    await new Promise(resolve => setTimeout(resolve, scrollDelay));
                    scrolls++;
                    
                    const newHeight = document.body.scrollHeight;
                    if (newHeight === lastHeight) break;
                    lastHeight = newHeight;
                }
                
                // Scroll back to top
                window.scrollTo(0, 0);
            });
            await delay(3000);
            
            // Debug: Check page content
            const pageDebug = await this.page.evaluate(() => {
                return {
                    title: document.title,
                    url: window.location.href,
                    bodyText: document.body.innerText.substring(0, 500),
                    hasResults: document.querySelector('#results') !== null,
                    hasJobCards: document.querySelectorAll('.job-card, .job-item, [class*="job"]').length,
                    allLinks: Array.from(document.querySelectorAll('a')).length,
                    bodyHTML: document.body.innerHTML.substring(0, 1000)
                };
            });
            console.log('🔍 Page Debug:', JSON.stringify(pageDebug, null, 2));
            
            // Wait for job card titles (h2.card-title) which contain the job links
            try {
                await this.page.waitForSelector('h2.card-title a.js-view-job, h2.card-title a.stretched-link.js-view-job', { timeout: 20000 });
                console.log('✅ Job cards loaded');
            } catch (err) {
                console.log('⚠️ Job cards not immediately available, trying alternative selectors...');
                // Try waiting for card-title or any job link
                try {
                    await this.page.waitForSelector('h2.card-title, a.js-view-job, a[href*="/india-en/jobs/"]', { timeout: 15000 });
                    console.log('✅ Found job elements with alternative selector');
                } catch (err2) {
                    console.log('⚠️ Job elements not found, continuing anyway...');
                }
            }
        } catch (error) {
            console.error('❌ Navigation error:', error.message);
            throw error;
        }
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];
        const existingLinks = new Set();
        let loadMoreClicks = 0;
        const maxClicks = 100; // Safety limit to prevent infinite loops

        // Debug: Check what's on the page - more comprehensive
        const pageInfo = await this.page.evaluate(() => {
            const allLinks = Array.from(document.querySelectorAll('a'));
            const jobRelatedLinks = allLinks.filter(a => {
                const href = a.getAttribute('href') || '';
                return href.includes('/jobs/') || href.includes('job');
            });
            
            // Check for common job listing containers
            const containers = [
                { sel: '#results', count: document.querySelectorAll('#results').length },
                { sel: '.job-card', count: document.querySelectorAll('.job-card').length },
                { sel: '.job-listing', count: document.querySelectorAll('.job-listing').length },
                { sel: '[class*="job"]', count: document.querySelectorAll('[class*="job"]').length },
                { sel: 'article', count: document.querySelectorAll('article').length },
                { sel: '.js-view-job', count: document.querySelectorAll('.js-view-job').length },
                { sel: 'a[href*="/jobs/"]', count: document.querySelectorAll('a[href*="/jobs/"]').length }
            ];
            
            return {
                totalLinks: allLinks.length,
                jobRelatedLinks: jobRelatedLinks.map(a => ({
                    href: a.getAttribute('href'),
                    classes: a.className,
                    text: a.textContent.trim().substring(0, 50)
                })),
                containers: containers,
                bodyHTMLSample: document.body.innerHTML.substring(0, 2000)
            };
        });
        console.log(`🔍 Debug: Found ${pageInfo.totalLinks} total links, ${pageInfo.jobRelatedLinks.length} job-related links`);
        console.log('🔍 Container check:', pageInfo.containers);
        if (pageInfo.jobRelatedLinks.length > 0) {
            console.log('🔍 Sample job links:', pageInfo.jobRelatedLinks.slice(0, 3));
        } else {
            console.log('🔍 No job links found. HTML sample:', pageInfo.bodyHTMLSample.substring(0, 500));
        }

        while (true) {
            // Collect current links on the page - try multiple selectors
            let jobLinks = [];
            
            // Try the most specific selector first - h2.card-title a.js-view-job
            try {
                jobLinks = await this.page.$$eval(
                    'h2.card-title a.js-view-job, h2.card-title a.stretched-link.js-view-job',
                    anchors =>
                        [...new Set(
                            anchors
                                .map(a => a.getAttribute('href'))
                                .filter(Boolean)
                                .filter(href => href.includes('/jobs/'))
                                .map(href =>
                                    href.startsWith('http')
                                        ? href
                                        : `https://careers.cognizant.com${href}`
                                )
                        )]
                );
                if (jobLinks.length > 0) {
                    console.log(`✅ Found ${jobLinks.length} links with h2.card-title a.js-view-job`);
                }
            } catch (err) {
                // Continue to next selector
            }

            // If no links found, try just a.js-view-job
            if (jobLinks.length === 0) {
                try {
                    jobLinks = await this.page.$$eval(
                        'a.js-view-job',
                        anchors =>
                            [...new Set(
                                anchors
                                    .map(a => a.getAttribute('href'))
                                    .filter(Boolean)
                                    .filter(href => href.includes('/jobs/'))
                                    .map(href =>
                                        href.startsWith('http')
                                            ? href
                                            : `https://careers.cognizant.com${href}`
                                    )
                            )]
                    );
                    if (jobLinks.length > 0) {
                        console.log(`✅ Found ${jobLinks.length} links with a.js-view-job`);
                    }
                } catch (err) {
                    // Continue to next selector
                }
            }

            // If no links found, try with stretched-link class
            if (jobLinks.length === 0) {
                try {
                    jobLinks = await this.page.$$eval(
                        'a.stretched-link.js-view-job',
                        anchors =>
                            [...new Set(
                                anchors
                                    .map(a => a.getAttribute('href'))
                                    .filter(Boolean)
                                    .filter(href => href.includes('/jobs/'))
                                    .map(href =>
                                        href.startsWith('http')
                                            ? href
                                            : `https://careers.cognizant.com${href}`
                                    )
                            )]
                    );
                    if (jobLinks.length > 0) {
                        console.log(`✅ Found ${jobLinks.length} links with a.stretched-link.js-view-job`);
                    }
                } catch (err) {
                    // Continue to next selector
                }
            }

            // If still no links, try generic href pattern
            if (jobLinks.length === 0) {
                try {
                    jobLinks = await this.page.$$eval(
                        'a[href*="/india-en/jobs/"]',
                        anchors =>
                            [...new Set(
                                anchors
                                    .map(a => a.getAttribute('href'))
                                    .filter(Boolean)
                                    .filter(href => {
                                        const cleanHref = href.split('#')[0];
                                        return cleanHref.includes('/jobs/') && 
                                               cleanHref.match(/\/jobs\/\d+\//); // Must match pattern /jobs/numbers/
                                    })
                                    .map(href => {
                                        const cleanHref = href.split('#')[0];
                                        return cleanHref.startsWith('http')
                                            ? cleanHref
                                            : `https://careers.cognizant.com${cleanHref}`;
                                    })
                            )]
                    );
                    if (jobLinks.length > 0) {
                        console.log(`✅ Found ${jobLinks.length} links with a[href*="/india-en/jobs/"]`);
                    }
                } catch (err2) {
                    console.log('⚠️ Could not collect job links with generic selector:', err2.message);
                }
            }

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
            await jobPage.goto(url, { 
                waitUntil: 'domcontentloaded',
                timeout: 60000 
            });
            await delay(5000);
            
            // Wait for key elements to be available
            try {
                await jobPage.waitForSelector('h1.hero-heading', { timeout: 10000 });
            } catch (err) {
                console.log('⚠️ Job page elements not immediately available, continuing anyway...');
            }

            const job = await jobPage.evaluate(() => {
                const getText = sel => document.querySelector(sel)?.innerText.trim() || '';

                // Extract description from article.cms-content
                const descriptionElement = document.querySelector('article.cms-content');
                const description = descriptionElement ? descriptionElement.innerText.trim() : '';

                // Extract location from job details
                let location = '';
                const locationDt = Array.from(document.querySelectorAll('dt')).find(
                    dt => dt.textContent.trim() === 'Location:'
                );
                if (locationDt && locationDt.nextElementSibling) {
                    location = locationDt.nextElementSibling.textContent.trim();
                }

                return {
                    title: getText('h1.hero-heading'),
                    company: 'Cognizant',
                    location: location || '',
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
const runBrillioJobsScraper = async ({ headless = true } = {}) => {
    const scraper = new BrillioJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runBrillioJobsScraper;

// ✅ CLI support: node phonepe.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await runBrillioJobsScraper({ headless: headlessArg });
    })();
}
