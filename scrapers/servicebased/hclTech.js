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
            // Collect job data from table rows (link, location, experience)
            const jobData = await this.page.$$eval(
                'tr',
                rows => {
                    const jobs = [];
                    const seenLinks = new Set();
                    
                    rows.forEach(row => {
                        const linkElement = row.querySelector('td.views-field-title a[href]');
                        if (!linkElement) return;
                        
                        const href = linkElement.getAttribute('href');
                        if (!href || seenLinks.has(href)) return;
                        
                        const fullUrl = href.startsWith('http')
                            ? href
                            : `https://hcltech.com${href}`;
                        
                        // Extract location
                        const locationCell = row.querySelector('td.views-field-field-job-location');
                        const location = locationCell ? locationCell.innerText.trim() : '';
                        
                        // Extract experience
                        const experienceCell = row.querySelector('td.views-field-field-years-of-experience');
                        const experience = experienceCell ? experienceCell.innerText.trim() : '';
                        
                        jobs.push({
                            url: fullUrl,
                            location: location,
                            experience: experience
                        });
                        
                        seenLinks.add(href);
                    });
                    
                    return jobs;
                }
            );

            // Add new jobs
            let newJobsCount = 0;
            for (const job of jobData) {
                if (!existingLinks.has(job.url)) {
                    existingLinks.add(job.url);
                    this.allJobLinks.push(job);
                    newJobsCount++;
                }
            }

            console.log(`📄 Collected ${this.allJobLinks.length} unique job links (${newJobsCount} new)...`);

            // Check if "Load More" button exists and is visible
            // Updated selector to match the actual HTML structure: ul.js-pager__items.pager > li > a with title="Load more items"
            const loadMoreButton = await this.page.$('ul.js-pager__items.pager a[title="Load more items"], ul.pager a[rel="next"][title*="Load more"], a.button.btn[title*="Load more"]');
            
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


    async extractJobDetailsFromLink(url, jobLinkData = null) {
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
                await jobPage.waitForSelector('h2 span.field--name-title, span.box-tag, div.field--name-body', { timeout: 15000 });
                // Additional wait to ensure content is fully loaded
                await delay(2000);
            } catch (err) {
                console.log('⚠️ Job page elements not immediately available, continuing anyway...');
                // Still wait a bit even if selector not found
                await delay(2000);
            }

            const job = await jobPage.evaluate(() => {
                const getText = sel => document.querySelector(sel)?.innerText.trim() || '';

                // Extract description - prioritize the field--name-body selector
                let description = '';

                // Helper function to check if description looks valid (not navigation/search)
                const isValidDescription = (text) => {
                    if (!text || text.length < 20) return false;
                    // Filter out common navigation/search text
                    const invalidPatterns = [
                        /^search\s*$/i,
                        /search\s+close/i,
                        /^menu\s*$/i,
                        /^navigation\s*$/i,
                        /^skip\s+to\s+content/i
                    ];
                    for (const pattern of invalidPatterns) {
                        if (pattern.test(text.trim())) return false;
                    }
                    // Should contain job-related keywords
                    const jobKeywords = ['responsibilities', 'qualifications', 'requirements', 'experience', 'skills', 'role', 'position'];
                    const hasJobContent = jobKeywords.some(keyword => text.toLowerCase().includes(keyword));
                    return hasJobContent;
                };

                // Primary: Look for the job description in the field--name-body div
                // Try multiple selector variations and methods, but validate content
                const descSelectors = [
                    'div.field--name-body.field__item',
                    'div.field--name-body',
                    'div[class*="field--name-body"][class*="field__item"]',
                    'div[class*="field--name-body"]',
                    '.field--name-body.field__item',
                    '.field--name-body'
                ];
                
                for (const selector of descSelectors) {
                    const elements = document.querySelectorAll(selector);
                    for (const element of elements) {
                        // Skip if element is in header, nav, or search areas
                        const isInNavigation = element.closest('header, nav, .search, [role="search"], [class*="search"], [class*="navigation"]');
                        if (isInNavigation) continue;
                        
                        // Try innerText first, then textContent
                        const text = element.innerText?.trim() || element.textContent?.trim() || '';
                        if (isValidDescription(text)) {
                            description = text;
                            break;
                        }
                    }
                    if (description) break;
                }
                
                // Alternative: Find by class name directly, but validate
                if (!description || !isValidDescription(description)) {
                    const allDivs = document.querySelectorAll('div');
                    for (const div of allDivs) {
                        if (div.classList.contains('field--name-body') && div.classList.contains('field__item')) {
                            // Skip navigation elements
                            const isInNavigation = div.closest('header, nav, .search, [role="search"], [class*="search"]');
                            if (isInNavigation) continue;
                            
                            const text = div.innerText?.trim() || div.textContent?.trim() || '';
                            if (isValidDescription(text)) {
                                description = text;
                                break;
                            }
                        }
                    }
                }

                // Alternative approach: Look for elements containing "Responsibilities" or "Qualifications"
                if (!description || !isValidDescription(description)) {
                    // Find elements containing job description keywords
                    const allElements = document.querySelectorAll('div, section, article');
                    for (const el of allElements) {
                        const text = el.innerText || el.textContent || '';
                        if (text.includes('Responsibilities') || text.includes('Qualifications') || text.includes('Requirements')) {
                            // Make sure it's not in navigation
                            const isInNavigation = el.closest('header, nav, .search, [role="search"], [class*="search"]');
                            if (!isInNavigation && isValidDescription(text)) {
                                description = text.trim();
                                break;
                            }
                        }
                    }
                }

                // Fallback: Find the parent container that holds all description sections
                // Look for divs containing sections with h2 headings like "Your role", "Your profile", etc.
                if (!description || !isValidDescription(description)) {
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
                    title: getText('h2 span.field--name-title') || getText('h1.box-title'),
                    company: 'HclTech',
                    location: getText('span.box-tag') || '',
                    description: description || '',
                    url: window.location.href,
                    // Store raw experience if available from table row
                    _rawExperience: ''
                };
            });

            // Merge location and experience from table row if available
            if (jobLinkData && typeof jobLinkData === 'object') {
                if (jobLinkData.location && !job.location) {
                    job.location = jobLinkData.location;
                }
                if (jobLinkData.experience) {
                    job._rawExperience = jobLinkData.experience;
                }
            }

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
            const jobLink = this.allJobLinks[i];
            const url = typeof jobLink === 'string' ? jobLink : jobLink.url;
            console.log(`📝 [${i + 1}/${this.allJobLinks.length}] Processing: ${url}`);
            const jobData = await this.extractJobDetailsFromLink(url, jobLink);
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

    // Step 1.5: Use experience from table row if available (e.g., "4-12 Years")
    if (!experience && job._rawExperience) {
        const rawExp = job._rawExperience.trim();
        // Try to parse formats like "4-12 Years", "4-12 yrs", "4 - 12 Years", etc.
        const rangeMatch = rawExp.match(/(\d+)\s*[-–—]\s*(\d+)\s*(?:years?|yrs?)?/i);
        if (rangeMatch) {
            experience = `${rangeMatch[1]} - ${rangeMatch[2]} yrs`;
        } else {
            // Try single number format
            const singleMatch = rawExp.match(/(\d+)\s*(?:years?|yrs?)?/i);
            if (singleMatch) {
                const minExp = parseInt(singleMatch[1], 10);
                const maxExp = minExp + 2;
                experience = `${minExp} - ${maxExp} yrs`;
            } else {
                // Use as-is if it doesn't match patterns
                experience = rawExp;
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
    // Use location from table row if available, otherwise parse from job.location
    if (job.location) {
        // If location is already a simple city name (from table row), use it directly
        if (!job.location.includes(',') && !job.location.includes('\n')) {
            location = job.location.trim();
        } else {
            // Parse location string to extract city
            const cityMatch = job.location.match(/^([^,\n]+)/);
            if (cityMatch) {
                location = cityMatch[1].trim();
            }
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
