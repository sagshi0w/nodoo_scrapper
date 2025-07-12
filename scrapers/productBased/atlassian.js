import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

// Custom data extraction function for Atlassian jobs
const extractAtlassianData = (job) => {
    if (!job) return null;

    const patterns = {
        descriptionPrefix: /^(description|job\s+descriptions?)\s*[:\-]?\s*/i,
        nonWordChars: /^[^a-zA-Z0-9\n\r]+/,
        excessNewlines: /\n{3,}/g,
        trailingSpaces: /[ \t]+$/gm,
        duplicateNewlines: /\n{2,}/g,
        aboutAtlassian: {
            standalone: /^about\s+atlassian\s*[:.\-\s]*$/i,
            section: /(\n|^)about\s+atlassian\s*[:.\-\s]*(\n|$).*/i
        }
    };

    const cleanDescription = (raw = '') => {
        let cleaned = raw
            .replace(patterns.descriptionPrefix, '')
            .replace(patterns.nonWordChars, '')
            .replace(patterns.excessNewlines, '\n\n')
            .replace(patterns.trailingSpaces, '')
            .replace(patterns.duplicateNewlines, '\n')
            .trim();

        if (patterns.aboutAtlassian.standalone.test(cleaned)) {
            cleaned = raw.replace(patterns.aboutAtlassian.standalone, '').trim();
        }

        const aboutMatch = cleaned.match(patterns.aboutAtlassian.section);
        if (aboutMatch) {
            cleaned = cleaned.substring(0, aboutMatch.index).trim();
        }

        return cleaned || raw.trim() || '[No description provided]';
    };

    const cleanText = (text = '') => text.trim();

    return {
        ...job,
        title: cleanText(job.title),
        location: cleanText(job.location),
        description: cleanDescription(job.description),
        company: 'Atlassian',
        scrapedAt: new Date().toISOString()
    };
};

class AtlassianJobsScraper {
    constructor(headless = true) {
        this.browser = null;
        this.page = null;
        this.allJobs = [];
        this.jobLinks = [];
        this.baseURL = 'https://www.atlassian.com';
        this.headless = headless;
    }

    async initialize() {
        this.browser = await puppeteer.launch({
            headless: this.headless ? true : false,
            args: ['--no-sandbox', '--start-maximized'],
            defaultViewport: null
        });
        this.page = await this.browser.newPage();
        await this.page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        );
    }

    async navigateToJobsPage() {
        console.log('🌐 Navigating to Atlassian Careers page...');
        await this.page.goto('https://www.atlassian.com/company/careers/all-jobs?team=&location=India&search=', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        console.log('📋 Collecting job links from all pages...');
        let pageCount = 1;

        while (true) {
            console.log(`🔎 Scraping page ${pageCount}...`);

            const linksOnPage = await this.page.$$eval('a[href^="/company/careers/details/"]', anchors =>
                anchors.map(anchor => anchor.getAttribute('href'))
            );

            const fullLinks = linksOnPage.map(path => `https://www.atlassian.com${path}`);
            this.jobLinks.push(...fullLinks);

            const nextBtn = await this.page.$('a[aria-label="Next"]');
            if (!nextBtn) {
                console.log('🚫 No more pages. Pagination ended.');
                break;
            }

            await Promise.all([
                nextBtn.click(),
                this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 })
            ]);

            await delay(3000);
            pageCount++;
        }

        console.log(`✅ Total jobs found: ${this.jobLinks.length}`);
    }

    async extractJobDetailsFromLink(url) {
        const jobPage = await this.browser.newPage();
        try {
            await jobPage.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
            await jobPage.waitForSelector('h1', { timeout: 10000 });

            const jobDetails = await jobPage.evaluate(() => {
                const getText = sel => document.querySelector(sel)?.innerText.trim() || '';
                const meta = getText('p.job-posting-detail--highlight');
                const [team, location] = meta.split('|').map(part => part.trim());

                return {
                    title: getText('h1'),
                    location,
                    description: getText('div.column.colspan-10.text-left.push.push-1'),
                    url: window.location.href
                };
            });

            await jobPage.close();
            return jobDetails;
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
            const enrichedJob = extractAtlassianData(jobData);
            this.allJobs.push(enrichedJob);
        }
    }

    async saveResults() {
        // fs.writeFileSync('./scrappedJobs/atlassianJobs.json', JSON.stringify(this.allJobs, null, 2));
        console.log(`💾 Scraped ${this.allJobs.length} jobs from Atlassian`);
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

// Main runner
const runAtlassianScraper = async ({ headless = true } = {}) => {
    const scraper = new AtlassianJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runAtlassianScraper;

// CLI Support
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await runAtlassianScraper({ headless: headlessArg });
    })();
}
