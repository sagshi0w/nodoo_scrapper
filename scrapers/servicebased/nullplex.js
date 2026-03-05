import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class NullplexJobsScraper {
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
        console.log('🌐 Navigating to Nullplex Careers...');
        await this.page.goto('https://www.nullplex.com/career/', {
            waitUntil: 'networkidle2'
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];
        let pageIndex = 1;
        const existingLinks = new Set();

        while (true) {
            // Wait for job links to load (View links inside job cards)
            try {
                await this.page.waitForSelector('a[href*="/career/"]', { timeout: 15000 });
            } catch (err) {
                console.log('✅ No more job links found. Done.');
                break;
            }

            // Collect new links: links inside job cards (div.border-b) or any /career/ link
            let jobLinks = [];
            try {
                jobLinks = await this.page.$$eval(
                    'div.border-b a[href*="/career/"], a[href*="/career/"][class*="font-semibold"]',
                    anchors => [...new Set(anchors.map(a => a.href).filter(href => href && href.includes('/career/') && href.split('/career/')[1]))]
                );
            } catch (err) {
                try {
                    jobLinks = await this.page.$$eval(
                        'a[href*="/career/"]',
                        anchors => anchors.map(a => a.href).filter(href => href && href !== 'https://www.nullplex.com/career/' && !href.endsWith('/career'))
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

            if (jobLinks.length === 0 && this.allJobLinks.length > 0) {
                console.log('✅ No more job links found. Done.');
                break;
            }
            if (jobLinks.length === 0 && pageIndex === 1) {
                console.warn('⚠️ No job links found on the first page.');
                break;
            }

            const pageNumbers = await this.page.$$eval('ul.pagination li a', links =>
                links
                    .map(a => ({
                        text: a.textContent.trim(),
                        href: a.getAttribute('href'),
                    }))
                    .filter(a => /^\d+$/.test(a.text)) // Only page numbers
            );

            const nextPage = pageNumbers.find(p => Number(p.text) === pageIndex + 1);

            if (!nextPage) {
                console.log('✅ No more pages left. Done.');
                break;
            }

            // Click the next page
            console.log(`➡️ Clicking page ${pageIndex + 1}`);
            try {
                await this.page.evaluate((num) => {
                    const links = Array.from(document.querySelectorAll('ul.pagination li a'));
                    const next = links.find(a => a.textContent.trim() === String(num));
                    if (next) next.click();
                }, pageIndex + 1);
                await delay(2000);
            } catch (err) {
                console.warn(`⚠️ Could not go to page ${pageIndex + 1}: ${err.message}`);
                break;
            }

            pageIndex++;
        }

        return this.allJobLinks;;
    }


    async extractJobDetailsFromLink(url) {
        const jobPage = await this.browser.newPage();
        try {
            await jobPage.goto(url, { waitUntil: 'networkidle2' });
            await delay(5000);
            await jobPage.waitForSelector('h3.font-bold, div.bg-white', { timeout: 10000 });

            const job = await jobPage.evaluate(() => {
                const getText = sel => {
                    const el = document.querySelector(sel);
                    return el?.innerText?.trim() || el?.textContent?.trim() || '';
                };
                // Title: h3 with font-bold (e.g. "WordPress Developer Intern")
                const title = getText('h3.font-bold') || getText('div[class*="bg-white"] h3') || getText('h3');
                // Location: span containing "Location:" (e.g. "Location: Nashik")
                let location = '';
                const locationSpans = Array.from(document.querySelectorAll('span.text-lg'));
                const locationSpan = locationSpans.find(s => s.textContent.includes('Location:'));
                if (locationSpan) {
                    const raw = locationSpan.textContent.trim();
                    location = raw.replace(/^Location:\s*/i, '').trim();
                }
                // Description: div.mt-6 that contains Responsibilities / Must Have Skills / Preferred Skills
                let description = '';
                const card = document.querySelector('div[class*="bg-white"][class*="rounded"]');
                const descBlock = card ? card.querySelector('div.mt-6') : document.querySelector('div.mt-6');
                if (descBlock) {
                    description = descBlock.innerText?.trim() || descBlock.textContent?.trim() || '';
                }
                if (!description) {
                    description = getText('div.flex.flex-col.gap-9 div.mt-6') || getText('div.mt-6') || getText('div[class*="description"]') || '';
                }
                return {
                    title,
                    company: 'Nullplex',
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
        console.log(`💾 Saved ${this.allJobs.length} jobs to Nullplex.json`);
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
const runNullplexJobsScraper = async ({ headless = true } = {}) => {
    const scraper = new NullplexJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runNullplexJobsScraper;

// ✅ CLI support: node phonepe.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await runNullplexJobsScraper({ headless: headlessArg });
    })();
}
