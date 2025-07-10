import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

// Custom data extraction function for Atlassian jobs
const extractAtlassianData = (job) => {
    if (!job) return null;
    
    // Pre-compiled regex patterns for better performance
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

    // Clean description with fallback logic
    const cleanDescription = (rawDescription = '') => {
        // Initial cleaning
        let cleaned = rawDescription
            .replace(patterns.descriptionPrefix, '')
            .replace(patterns.nonWordChars, '')
            .replace(patterns.excessNewlines, '\n\n')
            .replace(patterns.trailingSpaces, '')
            .replace(patterns.duplicateNewlines, '\n')
            .trim();

        // Handle About Atlassian cases
        if (patterns.aboutAtlassian.standalone.test(cleaned)) {
            // Instead of returning empty, fall back to original minus "About Atlassian"
            cleaned = rawDescription.replace(patterns.aboutAtlassian.standalone, '').trim();
        }

        // Remove About Atlassian section but preserve content before it
        const aboutMatch = cleaned.match(patterns.aboutAtlassian.section);
        if (aboutMatch) {
            cleaned = cleaned.substring(0, aboutMatch.index).trim();
        }

        // Final fallback - if empty after all cleaning, return original (trimmed)
        return cleaned || rawDescription.trim();
    };

    // Clean text fields with null check
    const cleanText = (text = '') => text.trim();

    // Ensure we always have some description
    const finalDescription = cleanDescription(job.description);
    const guaranteedDescription = finalDescription || 
                                 job.description.trim() || 
                                 '[No description provided]';

    return {
        ...job,
        title: cleanText(job.title),
        location: cleanText(job.location),
        description: guaranteedDescription,
        company: 'Atlassian'
    };
};

class AtlassianJobsScraper {
    constructor() {
        this.browser = null;
        this.page = null;
        this.allJobs = [];
        this.jobLinks = [];
        this.baseURL = 'https://www.atlassian.com';
    }

    async initialize() {
        this.browser = await puppeteer.launch({
            headless: true,
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

            // Get all anchor tags with job links
            const linksOnPage = await this.page.$$eval('a[href^="/company/careers/details/"]', anchors =>
                anchors.map(anchor => anchor.getAttribute('href'))
            );

            // Convert to full URLs
            const fullLinks = linksOnPage.map(path => `https://www.atlassian.com${path}`);
            this.jobLinks.push(...fullLinks);

            // Try to find and click the next button
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
                const getText = sel => {
                    const el = document.querySelector(sel);
                    return el ? el.innerText.trim() : '';
                };

                const meta = getText('p.job-posting-detail--highlight');

                const [team, location, remote, jobType] = meta.split('|').map(part => part.trim());

                return {
                    title: getText('h1'),
                    company: 'Atlassian',
                    location,
                    //jobType: remote,
                    description: getText('div.column.colspan-10.text-left.push.push-1')
                };
            });

            await jobPage.close();
            return { ...jobDetails, url };
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
            //jobData.scrapedAt = new Date().toISOString();
            const enrichedJob = extractAtlassianData(jobData);
            this.allJobs.push(enrichedJob);
        }
    }

    async saveResults() {
        //fs.writeFileSync('./scrappedJobs/atlassianJobs.json', JSON.stringify(this.allJobs, null, 2));
        console.log(`💾 Saved ${this.allJobs.length} jobs to atlassianJobs.json`);
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

const runAtlassianScraper = async () => {
    const scraper = new AtlassianJobsScraper();
    await scraper.initialize();
    await scraper.navigateToJobsPage();
    await scraper.collectAllJobCardLinks();
    await scraper.processAllJobs();
    await scraper.saveResults();
    await scraper.close();
    return scraper.allJobs;
};

export default runAtlassianScraper;

if (import.meta.url === `file://${process.argv[1]}`) {
    (async () => {
        await runAtlassianScraper();
    })();
}
