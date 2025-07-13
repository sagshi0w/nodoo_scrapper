import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class MeeshoJobsScraper {
    constructor() {
        this.browser = null;
        this.page = null;
        this.allJobs = [];
        this.jobLinks = [];
    }

    async initialize() {
        this.browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--start-maximized'],
            defaultViewport: null
        });
        this.page = await this.browser.newPage();
        await this.page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        );
    }

    async navigateToJobsPage() {
        console.log('🌐 Navigating to Meesho Careers page...');
        await this.page.goto('https://www.meesho.io/jobs', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        console.log('📋 Collecting job links...');

        while (true) {
            const loadMoreSelector = 'button.bg-green-600';

            const loadMoreBtn = await this.page.$(loadMoreSelector);
            if (!loadMoreBtn) break;

            try {
                console.log('🔄 Clicking "Load more"...');
                await this.page.evaluate(selector => {
                    const btn = document.querySelector(selector);
                    if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, loadMoreSelector);

                await this.page.waitForSelector(loadMoreSelector, { visible: true });
                await loadMoreBtn.click();
                //await this.page.waitForTimeout(2000); // Wait for new jobs to load
            } catch (err) {
                console.warn(`⚠️ Skipping click due to: ${err.message}`);
                break; // Avoid infinite loop
            }
        }

        console.log('✅ All jobs loaded! Extracting links...');

        const jobUrls = await this.page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href^="/jobs/"]'))
                .map(a => a.href.startsWith('http') ? a.href : `https://www.meesho.io${a.getAttribute('href')}`);
        });

        this.jobLinks.push(...jobUrls);

        console.log(`🔗 Total jobs found: ${this.jobLinks.length}`);
    }

    async extractJobDetailsFromLink(url) {
        const jobPage = await this.browser.newPage();
        try {
            await jobPage.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            //await jobPage.waitForSelector('div.text-3xl.font-bold.tracking-tight', { timeout: 10000 });

            const jobData = await jobPage.evaluate(() => {
                const getText = (sel) => document.querySelector(sel)?.innerText.trim() || '';

                const title = getText('h1.text-3xl.text-tertiary');
                const location = getText('span.align-middle.inline-block.text-tertiary');
                const description = getText('section.job-description.lg\\:w-4\\/5');

                return {
                    title,
                    company: 'Meesho',
                    location,
                    description,
                    url: window.location.href
                };
            });

            await jobPage.close();
            return { ...jobData };
        } catch (err) {
            await jobPage.close();
            console.warn(`⚠️ Failed to extract from ${url}:`, err.message);
            return { title: '', location: '', description: '', url };
        }
    }

    async processAllJobs() {
        for (let i = 0; i < this.jobLinks.length; i++) {
            console.log(`📝 Processing job ${i + 1}/${this.jobLinks.length}`);
            const jobData = await this.extractJobDetailsFromLink(this.jobLinks[i]);

            if (jobData.title) {
                const enrichedJob = extractMeeshoData(jobData);
                this.allJobs.push(enrichedJob);

                console.log(`✅ ${jobData.title}`);
            }
        }
    }

    async saveResults() {
        //fs.writeFileSync('./scrappedJobs/meeshoJobs.json', JSON.stringify(this.allJobs, null, 2));
        console.log(`💾 Saved ${this.allJobs.length} jobs to meeshoJobs.json`);
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

// Custom data extraction function for Meesho jobs
const extractMeeshoData = (job) => {
    if (!job) return job;

    let cleanedDescription = job.description || '';

    if (cleanedDescription) {
        // Step 1: Truncate content if unwanted sections are detected
        const patterns = [
            /about\s+us/i,
            /our\s+mission/i
        ];

        let minIdx = cleanedDescription.length;
        for (const pattern of patterns) {
            const match = cleanedDescription.match(pattern);
            if (match && match.index < minIdx) {
                minIdx = match.index;
            }
        }

        if (minIdx !== cleanedDescription.length) {
            cleanedDescription = cleanedDescription.substring(0, minIdx).trim();
        }

        // Step 2: Remove specific phrases (case-insensitive)
        cleanedDescription = cleanedDescription
            .replace(/what you will do:?/gi, '')
            .replace(/about\s+the\s+team\s*[:\-]?/gi, '')
            .replace(/about\s+the\s+role\s*[:\-]?/gi, '');

        // Step 3: Remove trailing spaces and excessive newlines
        cleanedDescription = cleanedDescription
            .replace(/[ \t]+$/gm, '')     // Trailing spaces
            .replace(/\n{2,}/g, '\n')     // Excessive blank lines
            .trim();
    }

    const cleanedTitle = job.title?.trim() || '';
    const cleanedLocation = job.location?.trim() || '';

    return {
        ...job,
        title: cleanedTitle,
        location: cleanedLocation,
        description: cleanedDescription,
        company: 'Meesho',
        scrapedAt: new Date().toISOString()
    };
};


const runMeeshoScraper = async () => {
    const scraper = new MeeshoJobsScraper();
    await scraper.run();
    return scraper.allJobs;
};

export default runMeeshoScraper;

if (import.meta.url === `file://${process.argv[1]}`) {
    (async () => {
        await runMeeshoScraper();
    })();
}
