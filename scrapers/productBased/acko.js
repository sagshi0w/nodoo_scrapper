import { launch } from 'puppeteer';
import { writeFileSync } from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class AckoJobsScraper {
    constructor(headless = true) {
        this.headless = headless;
        this.browser = null;
        this.page = null;
        this.allJobs = [];
        this.jobLinks = [];
    }

    async initialize() {
        this.browser = await launch({
            headless: this.headless ? true : false,
            args: ['--no-sandbox', ...(this.headless ? [] : ['--start-maximized'])],
            defaultViewport: this.headless ? { width: 1920, height: 1080 } : null
        });

        this.page = await this.browser.newPage();
        await this.page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        );
    }

    async navigateToJobsPage() {
        console.log('🌐 Navigating to Acko Careers page...');
        await this.page.goto('https://www.acko.com/careers/jobs/', {
            waitUntil: 'networkidle2',
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        console.log('📋 Collecting job links...');
        const existingLinks = new Set();

        while (true) {
            await delay(2000);
            const newJobUrls = await this.page.evaluate(() => {
                return Array.from(document.querySelectorAll('a[href]'))
                    .map(a => a.getAttribute('href'))
                    .filter(href => /^\d+$/.test(href))
                    .map(id => `https://www.acko.com/careers/jobs/${id}`);
            });

            for (const link of newJobUrls) {
                if (!existingLinks.has(link)) {
                    existingLinks.add(link);
                    this.jobLinks.push(link);
                }
            }

            console.log(`🔗 Found ${this.jobLinks.length} unique job links so far...`);

            const loadMoreSelector = 'button.iconNext';
            const loadMoreBtn = await this.page.$(loadMoreSelector);
            if (!loadMoreBtn) {
                console.log('❌ No more "Load more" button — all jobs loaded.');
                break;
            }

            try {
                console.log('🔄 Clicking "Load more"...');
                await this.page.evaluate(selector => {
                    const btn = document.querySelector(selector);
                    if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, loadMoreSelector);

                await this.page.waitForSelector(loadMoreSelector, { visible: true, timeout: 5000 });
                //await loadMoreBtn.click();
                await delay(2000);
            } catch (err) {
                console.warn(`⚠️ Skipping click due to error: ${err.message}`);
                break;
            }
        }

        console.log(`✅ Total unique jobs collected: ${this.jobLinks.length}`);
    }

    async extractJobDetailsFromLink(url) {
        const jobPage = await this.browser.newPage();
        try {
            await jobPage.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            const jobData = await jobPage.evaluate(() => {
                const getText = (sel) => document.querySelector(sel)?.innerText.trim() || '';
                const title = getText('h1');
                const locationFull = getText('div.jobsInfo_subHeadings__vFC5M');
                const location = locationFull.split(/\s+/).pop();
                const description = getText('div.jobsInfo_jobDescriptionContainer__Dwm6V');

                return {
                    title,
                    location,
                    company: 'Acko',
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
        const seen = new Set();

        for (let i = 0; i < this.jobLinks.length; i++) {
            console.log(`📝 Processing job ${i + 1}/${this.jobLinks.length}`);
            const jobData = await this.extractJobDetailsFromLink(this.jobLinks[i]);

            if (jobData.title && !seen.has(jobData.title)) {
                seen.add(jobData.title);
                const enrichedJob = extractAckoData(jobData);
                this.allJobs.push(enrichedJob);
                console.log(`✅ ${jobData.title}`);
            }
        }
    }

    async saveResults() {
        //writeFileSync('./scrappedJobs/ackoJobs.json', JSON.stringify(this.allJobs, null, 2));
        console.log(`💾 Saved ${this.allJobs.length} jobs to ackoJobs.json`);
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

const extractAckoData = (job) => {
    if (!job) return job;
    let cleanedDescription = job.description || '';
    if (cleanedDescription) {
        cleanedDescription = cleanedDescription
            .replace(/about the role\s*[:\-]?/gi, '')
            .replace(/role overview\s*[:\-]?/gi, '')
            .replace(/responsibilities\s*[:\-]?/gi, '')
            .replace(/job title\s*[:\-]?/gi, '')
            .replace(/location\s*[:\-]?/gi, '')
            .replace(/the role\s*[:\-]?/gi, '')
            .replace(/(Responsibilities:|Requirements:|Skills:|Qualifications:)/gi, '\n$1\n')
            .replace(/[ \t]+$/gm, '')
            .replace(/\n{2,}/g, '\n')
            .trim();
    }
    let cleanedTitle = job.title ? job.title.trim() : '';
    let cleanedLocation = job.location ? job.location.trim() : '';
    return {
        ...job,
        title: cleanedTitle,
        location: cleanedLocation || 'India',
        description: cleanedDescription,
        company: 'Acko',
        scrapedAt: new Date().toISOString()
    };
};

const runAckoScraper = async ({ headless = true } = {}) => {
    const scraper = new AckoJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runAckoScraper;

// CLI execution support
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        const scraper = new AckoJobsScraper(headlessArg);
        await scraper.run();
    })();
}
