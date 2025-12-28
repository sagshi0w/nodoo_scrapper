import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class MindFireSolutionsJobsScraper {
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
        console.log('🌐 Navigating to Mindfire solutions Careers...');
        await this.page.goto('https://apply.mindfiresolutions.com/', {
            waitUntil: 'networkidle2'
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];
        let pageIndex = 1;

        while (true) {
            // Wait for job links to load
            //await this.page.waitForSelector('div.op-job-apply-bt', { timeout: 10000 });

            // Collect new links
            const jobLinks = await this.page.$$eval(
                'a.JobOpenings_openings_row__3Q1dw',
                anchors => anchors.map(a => {
                    // Convert relative URLs to absolute URLs
                    const href = a.getAttribute('href');
                    return href.startsWith('http') ? href : `https://apply.mindfiresolutions.com${href}`;
                })
            );

            for (const link of jobLinks) {
                this.allJobLinks.push(link);
            }

            console.log(`📄 Collected ${this.allJobLinks.length} unique job links so far...`);

            const pageNumbers = await this.page.$$eval('ul.pagination li a', links =>
                links
                    .map(a => ({
                        text: a.textContent.trim(),
                        href: a.getAttribute('href'),
                    }))
                    .filter(a => /^\d+$/.test(a.text)) // Only page numbers
            );

            // Try to click "See more results" button
            // Check if "Show More Results" button exists and is visible
            const nextPage = pageNumbers.find(p => Number(p.text) === pageIndex + 1);

            if (!nextPage) {
                console.log('✅ No more pages left. Done.');
                break;
            }

            // Click the next page
            console.log(`➡️ Clicking page ${pageIndex + 1}`);
            await Promise.all([
                this.page.click(`ul.pagination li a[title="Page ${pageIndex + 1}"]`),
                this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
            ]);

            pageIndex++;

        }

        return this.allJobLinks;;
    }


    async extractJobDetailsFromLink(url) {
        const jobPage = await this.browser.newPage();
        try {
            await jobPage.goto(url, { waitUntil: 'networkidle2' });
            await delay(5000);
            //await jobPage.waitForSelector('div.job__description.body', { timeout: 10000 });

            const job = await jobPage.evaluate(() => {
                const getText = sel => document.querySelector(sel)?.innerText.trim() || '';
                
                // Extract description from all card sections
                let description = '';
                const cards = document.querySelectorAll('div.JobDetails_card_style__2LZPg');
                cards.forEach(card => {
                    const header = card.querySelector('div.JobDetails_card_header__1SFfJ');
                    const body = card.querySelector('div.JobDetails_card_body__3b-1y');
                    
                    if (header && body) {
                        const headerText = header.textContent.trim();
                        const bodyText = body.textContent.trim();
                        
                        // Skip "Featured" badge text if present
                        const headerClean = headerText.replace(/Featured/i, '').trim();
                        
                        if (headerClean && bodyText) {
                            if (description) description += '\n\n';
                            description += `${headerClean}\n${bodyText}`;
                        }
                    }
                });
                
                return {
                    title: getText('p.JobDetails_job_title__2Y9u1'),
                    company: 'Mindfire Solutions',
                    location: getText('p.JobDetails_text_muted__1uToa'),
                    experience: getText('p.JobDetails_jobExp__9IWTZ'),
                    description: description || getText('div.JobDetails_subcontainer__1oVbA'),
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
        console.log(`💾 Saved ${this.allJobs.length} jobs to MindFireSolutions.json`);
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

    // Extract experience from job.experience field
    if (job.experience) {
        // Handle format like "Experience : 2 - 6 years"
        const expMatch = job.experience.match(/(\d+)\s*[-–]\s*(\d+)\s*(?:years|yrs)/i);
        if (expMatch) {
            const minExp = parseInt(expMatch[1], 10);
            const maxExp = parseInt(expMatch[2], 10);
            experience = `${minExp} - ${maxExp} yrs`;
        } else if (typeof job.experience === 'number' || /^\d+$/.test(job.experience)) {
            const minExp = parseInt(job.experience, 10);
            const maxExp = minExp + 2;
            experience = `${minExp} - ${maxExp} yrs`;
        } else {
            // Try to extract any number range from the string
            const singleExpMatch = job.experience.match(/(\d+)\s*(?:years|yrs)/i);
            if (singleExpMatch) {
                const minExp = parseInt(singleExpMatch[1], 10);
                const maxExp = minExp + 2;
                experience = `${minExp} - ${maxExp} yrs`;
            }
        }
    }

    if (cleanedDescription) {
        // Remove block starting from "Current Openings" up to and including "Apply"
        cleanedDescription = cleanedDescription.replace(
            /Current Openings[\s\S]*?(?:Apply\.?\s*)?(?=\n{2,}|$)/gi,
            ''
        );

        // Remove lines or blocks with "Experience"
        cleanedDescription = cleanedDescription.replace(
            /^.*\bexperience\b\s*[:\-]?\s*\d+\s*[-–]?\s*\d*\s*(?:years|yrs)?\.?.*$/gim,
            ''
        );

        // Remove any leftover inline experience mentions
        cleanedDescription = cleanedDescription.replace(
            /\bexperience\s*[:\-]?\s*\d+\s*[-–]?\s*\d*\s*(?:years|yrs)?\.?/gi,
            ''
        );

        // Remove "Apply" lines or links
        cleanedDescription = cleanedDescription.replace(/^\s*Apply\.?\s*$/gim, '');
        cleanedDescription = cleanedDescription.replace(/\bApply\b[:\-]?.*/gi, '');

        // Note: "About the Job" is now kept as a structured section header
        // Only remove if it's standalone without proper structure
        if (!cleanedDescription.includes('Core Responsibilities') && !cleanedDescription.includes('Required Skills')) {
            cleanedDescription = cleanedDescription.replace(
                /About the Job[\s\S]*?(?=(\n{2,}|Responsibilities|Skills|Qualifications|Requirements|$))/i,
                ''
            );
        }

        // Extract location from description if still not present
        const locationMatch = cleanedDescription.match(/location\s*[:\-]\s*(.+?)(?:[\n\r]|$)/i);
        if (locationMatch) {
            location = locationMatch[1].trim();
        }

        // Clean formatting
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

    return {
        ...job,
        title: job.title?.trim() || '',
        location: location || job.location?.trim() || '',
        description: cleanedDescription,
        experience: experience || 'Not specified',
    };
};


// ✅ Exportable runner function
const runMindFireSolutionsJobsScraper = async ({ headless = true } = {}) => {
    const scraper = new MindFireSolutionsJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runMindFireSolutionsJobsScraper;

// ✅ CLI support: node phonepe.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await runMindFireSolutionsJobsScraper({ headless: headlessArg });
    })();
}
