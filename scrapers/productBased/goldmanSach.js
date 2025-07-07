const puppeteer = require('puppeteer');
const fs = require('fs');

const delay = ms => new Promise(res => setTimeout(res, ms));

class Selectors {
    // List page selectors
    static jobCards = 'div.gs-uitk-mb-2';
    static jobLinks = 'a.text-decoration-none';
    static nextPageButton = '#__next > main > div > div.gs-uitk-c-8uookc--container-root.rounded.gs-layout-container > div > div > div > div:nth-child(2) > div > div:nth-child(2) > div > div > div.d-sm-flex.justify-content-between > nav > ul > li:nth-child(9)';

    // Job detail page selectors
    static jobTitle = '#__next > main > div > div:nth-child(1) > div > div > div > div.gs-uitk-c-172iff2--col-root.text-left.gs-layout-col > div > span.gs-uitk-c-lzsmqw--text-root.gs-uitk-mb-2.gs-text';
    static jobLocation = 'div[aria-label="Location On"]';
    static jobDescription = '#__next > main > div > div.gs-uitk-c-8uookc--container-root.gs-uitk-py-4.gs-layout-container > div > div.gs-uitk-c-5yagy2--col-root.gs-uitk-pr-5.gs-layout-col > div > span > div > p:nth-child(2)';
    static jobResponsibilities = '#__next > main > div > div.gs-uitk-c-8uookc--container-root.gs-uitk-py-4.gs-layout-container > div > div.gs-uitk-c-5yagy2--col-root.gs-uitk-pr-5.gs-layout-col > div > span > div > ul:nth-child(6)';
    static jobQualifications = '#__next > main > div > div.gs-uitk-c-8uookc--container-root.gs-uitk-py-4.gs-layout-container > div > div.gs-uitk-c-5yagy2--col-root.gs-uitk-pr-5.gs-layout-col > div > span > div > ul:nth-child(7)';
}

class GoldmanSachsScraper {
    constructor() {
        this.browser = null;
        this.page = null;
        this.allJobs = [];
        this.allJobLinks = new Set();
    }

    async initialize() {
        this.browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox'],
            defaultViewport: null
        });
        this.page = await this.browser.newPage();
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    }

    async navigateToJobsPage() {
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
            console.log(`Processing job ${i+1}/${jobArray.length}: ${jobUrl}`);
            
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
                
                if (job.jobTitle) {
                    this.allJobs.push(job);
                    console.log(`✅ [${i+1}/${jobArray.length}] ${job.jobTitle} - ${job.jobLocation}`);
                } else {
                    console.log(`⚠️ [${i+1}/${jobArray.length}] No job title found at ${jobUrl}`);
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
                    jobTitle: getText('#__next > main > div > div:nth-child(1) > div > div > div > div.gs-uitk-c-172iff2--col-root.text-left.gs-layout-col > div > span.gs-uitk-c-lzsmqw--text-root.gs-uitk-mb-2.gs-text'),
                    jobLocation: getText('#opportunity-overview > div:nth-child(2) > div:nth-child(2) > div:nth-child(2) > span.gs-uitk-c-vh52gn--text-root.gs-text'),
                    jobDescription: getText('div.job-description'),
                    applyUrl: window.location.href
                };
            });
        } catch (error) {
            return { error: error.message, applyUrl: jobPage.url() };
        }
    }

    async saveResults() {
        fs.writeFileSync('goldmanSachsJobs.json', JSON.stringify(this.allJobs, null, 2));
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

// Run the scraper
(async () => {
    const scraper = new GoldmanSachsScraper();
    await scraper.run();
})();