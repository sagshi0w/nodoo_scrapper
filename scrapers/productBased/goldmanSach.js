import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class Selectors {
    // List page selectors
    static jobCards = 'div.gs-uitk-mb-2';
    static jobLinks = 'a.text-decoration-none';
    static nextPageButton = 'a[data-cy="gs-uitk-pagination__nav-link-next"]';

    // Job detail page selectors
    static jobTitle = '#__next > main > div > div:nth-child(1) > div > div > div > div.gs-uitk-c-172iff2--col-root.text-left.gs-layout-col > div > span.gs-uitk-c-lzsmqw--text-root.gs-uitk-mb-2.gs-text';
    static jobLocation = 'div[aria-label="Location On"]';
    static jobDescription = '#__next > main > div > div.gs-uitk-c-8uookc--container-root.gs-uitk-py-4.gs-layout-container > div > div.gs-uitk-c-5yagy2--col-root.gs-uitk-pr-5.gs-layout-col > div > span > div > p:nth-child(2)';
    static jobResponsibilities = '#__next > main > div > div.gs-uitk-c-8uookc--container-root.gs-uitk-py-4.gs-layout-container > div > div.gs-uitk-c-5yagy2--col-root.gs-uitk-pr-5.gs-layout-col > div > span > div > ul:nth-child(6)';
    static jobQualifications = '#__next > main > div > div.gs-uitk-c-8uookc--container-root.gs-uitk-py-4.gs-layout-container > div > div.gs-uitk-c-5yagy2--col-root.gs-uitk-pr-5.gs-layout-col > div > span > div > ul:nth-child(7)';
}

class GoldmanSachsScraper {
    constructor(headless = false) {
        this.browser = null;
        this.page = null;
        this.allJobs = [];
        this.allJobLinks = new Set();
        this.headless = headless;
    }

    async initialize() {
        this.browser = await puppeteer.launch({
            headless: this.headless, // Must be false for goldmanSach.
            args: ['--no-sandbox'],
            defaultViewport: null
        });
        this.page = await this.browser.newPage();
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    }

    async navigateToJobsPage() {
        console.log('🌐 Navigating to GoldmanSach Careers page...');
        await this.page.goto('https://higher.gs.com/results?LOCATION=Hyderabad|Mumbai&page=1&sort=POSTED_DATE', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
    }

    async collectJobLinks() {
        console.log('⏳ Collecting all job links...');
        let pageCount = 0;
        let hasNext = true;

        while (hasNext) {
            try {
                await this.page.waitForSelector(Selectors.jobCards, {
                    timeout: 30000,
                    visible: true
                });

                await this.autoScroll();

                const currentPageLinks = await this.page.$$eval(Selectors.jobLinks, links =>
                    links.map(link => {
                        const href = link.getAttribute('href');
                        return href.startsWith('http') ? href : `https://higher.gs.com${href}`;
                    })
                );

                currentPageLinks.forEach(link => this.allJobLinks.add(link));
                console.log(`📄 Page ${pageCount}: Collected ${currentPageLinks.length} job links`);

                hasNext = await this.goToNextPage(pageCount);
                pageCount++;
            } catch (err) {
                console.warn('⚠️ Error during pagination:', err.message);
                hasNext = false;
            }
        }
        console.log(`✅ Collected ${this.allJobLinks.size} total job links`);
    }

    async autoScroll() {
        await this.page.evaluate(async () => {
            await new Promise(resolve => {
                let totalHeight = 0;
                const distance = 500;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 200);
            });
        });
    }

    async goToNextPage(currentPage) {
        const nextButton = await this.page.$(Selectors.nextPageButton);
        if (!nextButton) {
            console.log('🚫 No more pages found');
            return false;
        }

        await nextButton.click();
        await delay(3000);
        return true;
    }

    async processJobDetails() {
        console.log('⏳ Processing job details...');
        const jobArray = Array.from(this.allJobLinks);

        for (let i = 0; i < jobArray.length; i++) {
            const jobUrl = jobArray[i];
            console.log(`Processing job ${i + 1}/${jobArray.length}: ${jobUrl}`);

            const jobPage = await this.browser.newPage();
            try {
                await jobPage.goto(jobUrl, {
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });
                await delay(2000);

                // Debug: Save page HTML for inspection
                const content = await jobPage.content();
                //fs.writeFileSync(`debug_job_${i+1}.html`, content);

                const job = await this.extractJobData(jobPage);
                const enrichedJob = extractGoldmanData(job, job);
                if (enrichedJob.title) {
                    this.allJobs.push(enrichedJob);
                    console.log(`✅ [${i + 1}/${jobArray.length}] ${enrichedJob.title} - ${enrichedJob.location}`);
                } else {
                    console.log(`⚠️ [${i + 1}/${jobArray.length}] No job title found at ${jobUrl}`);
                    fs.appendFileSync('failed_jobs.txt', `${jobUrl}\n`);
                }
            } catch (err) {
                console.error(`❌ Error scraping job ${i + 1}:`, err.message);
                fs.appendFileSync('failed_jobs.txt', `${jobUrl} | Error: ${err.message}\n`);
            } finally {
                await jobPage.close();
                await delay(1000);
            }
        }
    }

    async extractJobData(jobPage) {
        try {
            return await jobPage.evaluate(() => {
                const getText = (sel) => {
                    const el = document.querySelector(sel);
                    return el ? el.textContent.trim() : '';
                };
                return {
                    title: getText('#__next > main > div > div:nth-child(1) > div > div > div > div.gs-uitk-c-172iff2--col-root.text-left.gs-layout-col > div > span.gs-uitk-c-lzsmqw--text-root.gs-uitk-mb-2.gs-text'),
                    location: getText('#opportunity-overview > div:nth-child(2) > div:nth-child(2) > div:nth-child(2) > span.gs-uitk-c-vh52gn--text-root.gs-text'),
                    description: getText('div.job-description'),
                    responsibilities: getText('ul.gs-uitk-c-1w6t8kz--list-root'),
                    skills: getText('ul.gs-uitk-c-1w6t8kz--list-root.skills'),
                    qualifications: getText('ul.gs-uitk-c-1w6t8kz--list-root.qualifications'),
                    url: window.location.href,
                    company: 'Goldman Sachs'
                };
            });
        } catch (error) {
            return { error: error.message, applyUrl: jobPage.url() };
        }
    }

    async saveResults() {
        //fs.writeFileSync('./scrappedJobs/goldmanSachsJobs.json', JSON.stringify(this.allJobs, null, 2));
        console.log(`💾 Saved ${this.allJobs.length} jobs to goldmanSachsJobs.json`);

        if (fs.existsSync('failed_jobs.txt')) {
            console.log('⚠️ Some jobs failed to scrape - see failed_jobs.txt');
        }
    }

    async close() {
        await this.browser.close();
    }

    async run() {
        try {
            await this.initialize();
            await this.navigateToJobsPage();
            await this.collectJobLinks();
            await this.processJobDetails();
            await this.saveResults();
        } catch (error) {
            console.error('❌ Scraping failed:', error);
        } finally {
            await this.close();
        }
    }
}

// Custom data extraction function for Goldman Sachs jobs
const extractGoldmanData = (job, jobPage) => {
    if (!job) return job;
    // Compose a new description from the relevant sections
    let summary = job.description || '';
    // Remove introductory phrases at the very beginning
    if (summary) {
        summary = summary.replace(/^(\s)*(What we are|What we do|Who we are|Who we do|Who we be|Who we work with|Who we serve|Who we help|Who we support|Who we represent|Who we|What we|About us|About Goldman Sachs)\s*[:\-–]?\s*/i, '');
    }
    let responsibilities = '';
    let skills = '';
    let qualifications = '';
    if (jobPage) {
        responsibilities = jobPage.responsibilities || '';
        skills = jobPage.skills || '';
        qualifications = jobPage.qualifications || '';
    }
    let combinedDescription = '';
    if (summary) combinedDescription += `\n${summary}\n\n`;
    if (responsibilities) combinedDescription += `Responsibilities:\n${responsibilities}\n\n`;
    if (skills) combinedDescription += `Skills:\n${skills}\n\n`;
    if (qualifications) combinedDescription += `Qualifications:\n${qualifications}`;
    combinedDescription = combinedDescription.trim();
    return {
        ...job,
        description: combinedDescription,
        company: 'Goldman Sachs',
        //scrapedAt: new Date().toISOString()
    };
};

// ✅ Exportable scraper function
const runGoldmanScraper = async ({ headless = true } = {}) => {
    const scraper = new GoldmanSachsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runGoldmanScraper;

// ✅ CLI support: `node goldman.js --headless=false`
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await runGoldmanScraper({ headless: headlessArg });
    })();
}