import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class zensarJobsScraper {
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
        console.log('🌐 Navigating to Zensar Careers...');
        await this.page.goto('https://fa-etvl-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs', {
            waitUntil: 'networkidle2'
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];

        while (true) {
            // Wait for job links to load
            await this.page.waitForSelector('a.job-grid-item__link', { timeout: 10000 });

            // Collect new links
            const newLinks = await this.page.$$eval(
                'a.job-grid-item__link',
                anchors => anchors.map(a => a.href)
            );

            for (const link of newLinks) {
                this.allJobLinks.push(link);
            }
            console.log(`📄 Collected ${this.allJobLinks.length} unique job links so far...`);

            // Try to click "See more results" button
            // Check if "Show More Results" button exists and is visible
            const showMoreButton = await this.page.$('button.button.text-color-primary[data-bind*="loadMore"]');
            if (!showMoreButton) {
                console.log('✅ No more "Show More Results" button. Finished collecting.');
                break;
            } else {
                await delay(5000),
                showMoreButton.click();
            }
        }

        return this.allJobLinks;;
    }


    async extractJobDetailsFromLink(url) {
        const jobPage = await this.browser.newPage();
        try {
            await jobPage.goto(url, { waitUntil: 'networkidle2' });
            await delay(5000);

            // ✅ Extract job summary using jobPage
            const jobDetails = await jobPage.evaluate(() => {
                const descriptionContainer = document.querySelector('.job-details__description-content');
                if (!descriptionContainer) return {};

                const rawHTML = descriptionContainer.innerHTML;

                // Extract job title
                const titleMatch = rawHTML.match(/<strong>Job Title:\s*(.*?)<\/strong>/i);
                const title = titleMatch ? titleMatch[1].trim() : '';

                // Extract location
                const locationMatch = rawHTML.match(/<strong>Location:<\/strong>\s*(.*?)<\/span>/i);
                const location = locationMatch ? locationMatch[1].trim() : '';

                // Extract years of experience
                const expMatch = rawHTML.match(/Years of Exp\s*:\s*(.*?)<\/span>/i);
                const experience = expMatch ? expMatch[1].trim() : '';

                // Extract skills
                const skillMatch = rawHTML.match(/Skills\s*:\s*(.*?)<\/span>/i);
                const skills = skillMatch ? skillMatch[1].trim() : '';

                // Extract all text for description (including responsibilities and qualifications)
                const textContent = descriptionContainer.innerText.trim();

                // Construct full description
                const fullDescription = [
                    experience ? `Experience: ${experience}` : '',
                    skills ? `Skills: ${skills}` : '',
                    '',
                    textContent
                ].filter(Boolean).join('\n\n');

                return {
                    title,
                    location,
                    description: fullDescription
                };
            });

            // Get the job URL
            const jobUrl = jobPage.url();

            // Add company
            const company = "Zensar";

            // Final combined object
            const finalJob = {
                title: jobDetails.title,
                location: jobDetails.location,
                description: jobDetails.description,
                url: jobUrl,
                company: company
            };

            return finalJob;

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
        console.log(`💾 Saved ${this.allJobs.length} jobs to zensarJobs.json`);
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
        company: 'Zensar'
    };
};

// ✅ Exportable runner function
const runZensarJobsScraper = async ({ headless = true } = {}) => {
    const scraper = new zensarJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runZensarJobsScraper;

// ✅ CLI support: node phonepe.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await runZensarJobsScraper({ headless: headlessArg });
    })();
}
