import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class SecurdenJobsScraper {
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
        console.log('🌐 Navigating to Securden Careers...');
        try {
            await this.page.goto('https://www.securden.com/careers/index.html', {
                waitUntil: 'networkidle2',
                timeout: 30000
            });
            
            // Wait for page to fully render
            await delay(5000);
            
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
                    return document.querySelectorAll('.career-view-more a').length > 0;
                },
                { timeout: 15000 }
            ).catch(() => {
                console.warn('⚠️ Timeout waiting for job links, continuing anyway...');
            });
            
        } catch (err) {
            console.warn('⚠️ Navigation warning:', err.message);
        }
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];
        const existingLinks = new Set();

        while (true) {
            // Wait for job links to load
            try {
                await this.page.waitForSelector('.career-view-more a', { timeout: 15000 });
            } catch (err) {
                console.log('✅ No more job links found. Done.');
                break;
            }

            // Collect job links on current page using .career-view-more a selector
            const jobLinks = await this.page.$$eval('.career-view-more a', anchors => {
                const baseUrl = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
                return anchors.map(a => {
                    const href = a.getAttribute('href');
                    // Convert relative URLs to absolute
                    if (href && href.startsWith('/')) {
                        return window.location.origin + href;
                    } else if (href && !href.startsWith('http')) {
                        return baseUrl + href;
                    }
                    return href;
                }).filter(Boolean);
            });

            for (const link of jobLinks) {
                if (!existingLinks.has(link)) {
                    existingLinks.add(link);
                    this.allJobLinks.push(link);
                }
            }

            console.log(`📄 Collected ${this.allJobLinks.length} unique job links so far (${jobLinks.length} new on this page)...`);

            // If no job links found, we're done
            if (jobLinks.length === 0) {
                console.log('✅ No more job links found. Done.');
                break;
            }

            // Check if "Load More" button exists
            const loadMoreExists = await this.page.$('#load_more_jobs2, #load_more_jobs');
            if (!loadMoreExists) {
                console.log("✅ No more pages found. Pagination finished.");
                break;
            }

            // Click "Load More" button
            console.log("➡️ Clicking Load More...");
            try {
                await this.page.click('#load_more_jobs2, #load_more_jobs');
                await delay(3000); // Wait for new jobs to load
            } catch (err) {
                console.warn(`⚠️ Could not click load more: ${err.message}`);
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
            
            // Wait for job content to load
            await jobPage.waitForSelector('h1.main-content__title, .place-time-btn', { timeout: 10000 });
            
            const job = await jobPage.evaluate(() => {
                const getText = sel => {
                    const el = document.querySelector(sel);
                    if (!el) return '';
                    // Get text content and replace <br> tags with spaces
                    return el.innerText?.trim() || el.textContent?.trim() || '';
                };

                // Extract job title from h1.main-content__title
                // Handle <br> tags by getting textContent which converts them to text
                const titleElement = document.querySelector('h1.main-content__title');
                let title = '';
                if (titleElement) {
                    // Get text content which handles <br> tags properly
                    title = titleElement.textContent?.trim() || titleElement.innerText?.trim() || '';
                    // Replace multiple spaces/newlines with single space
                    title = title.replace(/\s+/g, ' ').trim();
                }

                // Extract Location from .sec-icon-map p
                const locationElement = document.querySelector('.sec-icon-map p');
                let location = '';
                if (locationElement) {
                    location = locationElement.textContent?.trim() || locationElement.innerText?.trim() || '';
                }

                // Extract description from div.car-det-wrap
                // Try multiple selectors to find the description
                let description = '';
                const descriptionElement = document.querySelector('div.car-det-wrap, div.car-det-1, section#about-feature .car-det-wrap');
                if (descriptionElement) {
                    description = descriptionElement.innerText?.trim() || descriptionElement.textContent?.trim() || '';
                }
                
                // Fallback: try to find any car-det-wrap div
                if (!description) {
                    const allCarDetWraps = Array.from(document.querySelectorAll('div.car-det-wrap'));
                    if (allCarDetWraps.length > 0) {
                        // Get the first visible one or the one with most content
                        const visibleWrap = allCarDetWraps.find(div => {
                            const style = window.getComputedStyle(div);
                            return style.display !== 'none' && style.visibility !== 'hidden';
                        }) || allCarDetWraps[0];
                        
                        description = visibleWrap.innerText?.trim() || visibleWrap.textContent?.trim() || '';
                    }
                }

                return {
                    title,
                    company: 'Securden',
                    description,
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
                    const enrichedJob = extractSecurdenData(jobData);
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

const extractSecurdenData = (job) => {
    if (!job) return job;

    let cleanedDescription = job.description || '';
    let experience = job.experience || '';

    if (cleanedDescription) {
        // Remove sections like Job Title, Location, Type, Experience, About Us intro, Why Join Us
        cleanedDescription = cleanedDescription// Remove About Us intro until next section
            .replace(
                /About Us\s*\n+[\s\S]*?We're building a powerful natural language query engine \+ spreadsheet interface to help finance teams model, analyze, and automate reporting like never before\./,
                ''
            )
            .replace(
                /Why Join Us\s*\n+This is a unique opportunity to join a category-defining company at a pivotal stage\. You'll get to build impactful products, work alongside high-performing teams, and help shape the future of how businesses manage procurement\.\s*\n+\s*If you're excited by complex challenges, want to own meaningful product surfaces, and are ready to modernise the procurement industry, we'd love to talk to you\./i,
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
const Securden = async ({ headless = true } = {}) => {
    const scraper = new SecurdenJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};


export default Securden;

// ✅ CLI support: node phonepe.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await Securden({ headless: headlessArg });
    })();
}
