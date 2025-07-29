import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class techMahindraJobsScraper {
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
        console.log('🌐 Navigating to LTIMindtree Careers...');
        await this.page.goto('https://ltimindtree.ripplehire.com/candidate/?token=xviyQvbnyYZdGtozXoNm&lang=en&source=CAREERSITE#list/geo=India', {
            waitUntil: 'networkidle2'
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];
        let previousHeight = 0;
        let sameHeightCount = 0;

        while (true) {
            // Scroll to bottom
            await this.page.evaluate(() => {
                window.scrollBy(0, window.innerHeight);
            });

            await delay(5000);

            // Extract links after scroll
            const newLinks = await this.page.$$eval(
                'a.job-title[href^="#detail/job/"]',
                anchors => anchors.map(a => a.href)
            );

            // Add only unique links
            for (const link of newLinks) {
                if (!this.allJobLinks.includes(link)) {
                    this.allJobLinks.push(link);
                }
            }

            console.log(`📄 Found ${this.allJobLinks.length} job links so far...`);

            // Check scroll height to decide if we're done
            const currentHeight = await this.page.evaluate(() => document.body.scrollHeight);

            if (currentHeight === previousHeight) {
                sameHeightCount++;
            } else {
                sameHeightCount = 0;
            }

            if (sameHeightCount >= 2) {
                console.log(`✅ Finished scrolling. Total job links collected: ${this.allJobLinks.length}`);
                break;
            }

            previousHeight = currentHeight;
        }

        return this.allJobLinks;
    }

    async extractJobDetailsFromLink(url) {
        const jobPage = await this.browser.newPage();
        try {
            await jobPage.goto(url, { waitUntil: 'networkidle2' });
            await delay(5000);

            // ✅ Extract job summary using jobPage
            const jobDetails = await jobPage.evaluate(() => {
                const roleDescContainer = document.querySelector('.PD24');

                const descriptionText = roleDescContainer?.querySelector('.description')?.innerText.trim() || "";
                const skillsText = roleDescContainer?.querySelector('.skills')?.innerText.trim() || "";

                const combinedText = `${descriptionText}\n\n${skillsText}`;

                return {
                    combinedText
                };
            });

            // ✅ Extract other job details
            const job = await jobPage.evaluate((combinedText) => {
                const getText = sel => document.querySelector(sel)?.innerText.trim() || '';

                return {
                    title: getText('.section-title h2'),
                    company: 'LTIMindtree',
                    location: getText('.section-title .location-text'),
                    description: combinedText,
                    url: window.location.href
                };
            }, jobDetails.combinedText);

            await jobPage.close();

            console.log("job=",job);
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
                this.allJobs.push(enrichedJob);
                console.log(`✅ ${jobData.title}`);
            }
            await delay(1000);
        }
    }

    async saveResults() {
        // fs.writeFileSync('./scrappedJobs/phonepeJobs.json', JSON.stringify(this.allJobs, null, 2));
        console.log(`💾 Saved ${this.allJobs.length} jobs to ltiMindtreeJobs.json`);
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
    if (cleanedDescription) {
        cleanedDescription = cleanedDescription
            .replace(/about\s+phonepe\s+group\s*:/gi, '')
            .replace(/about\s+phonepe\s*:/gi, '')
            .replace(/culture/gi, '')
            .replace(/job summary:?/gi, '')
            .replace(/(\n\s*)(responsibilities|requirements|qualifications|skills|experience|education|benefits|what\s+we\s+offer|key\s+responsibilities|job\s+description|role\s+and\s+responsibilities|about\s+the\s+role|what\s+you'll\s+do|what\s+you\s+will\s+do)(\s*:?\s*\n)/gi, '\n\n$1$2$3\n\n')
            .replace(/(\n\s*)(\d+\.\s*)(.*?)(\n)/gi, '\n\n$1$2$3$4\n')
            .replace(/(\n\s*)(•\s*)(.*?)(\n)/gi, '\n\n$1$2$3$4\n')
            .replace(/[ \t]+$/gm, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    return {
        ...job,
        title: job.title?.trim() || '',
        location: job.location?.trim() || '',
        description: cleanedDescription,
        company: 'LTIMindtree'
    };
};

// ✅ Exportable runner function
const runTechMahindraScraper = async ({ headless = true } = {}) => {
    const scraper = new techMahindraJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runTechMahindraScraper;

// ✅ CLI support: node phonepe.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await runTechMahindraScraper({ headless: headlessArg });
    })();
}
