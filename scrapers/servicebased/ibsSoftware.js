import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class ibsSoftwareJobsScraper {
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
        console.log('🌐 Navigating to IBS Software Careers...');
        await this.page.goto('https://fa-etbm-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs?location=India&locationId=300000000434308&locationLevel=country&mode=location&sortBy=POSTING_DATES_DESC', {
            waitUntil: 'networkidle2'
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];
        let pageIndex = 1;
        const seenLinks = new Set();

        while (true) {
            // Wait for job links to load
            //await this.page.waitForSelector('div.op-job-apply-bt', { timeout: 10000 });

            // Collect new links
            const jobLinks = await this.page.$$eval(
                'a.job-list-item__link',
                anchors => anchors.map(a => a.href)
            );

            for (const link of jobLinks) {
                if (!seenLinks.has(link)) {
                    seenLinks.add(link);
                    this.allJobLinks.push(link);
                }
            }

            console.log(`📄 Collected ${this.allJobLinks.length} unique job links so far...`);

            const pageNumbers = await this.page.$$eval('ul.pagination li a', links =>
                links
                    .map(a => ({
                        text: a.textContent.trim(),
                        href: a.getAttribute('href'),
                    }))
                    .filter(a => /^\d+$/.test(a.text))
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

                function removeUntilAfterJobSummary(text) {
                    const lines = text.split('\n');

                    // Find index of the line that contains "Job Summary:"
                    const summaryIndex = lines.findIndex(line =>
                        line.trim().toLowerCase().startsWith('job summary:')
                    );

                    // If not found, return original
                    if (summaryIndex === -1) return text;

                    // Return lines AFTER the "Job Summary:" line
                    return lines.slice(summaryIndex + 1).join('\n').trim();
                }

                return {
                    title: getText('.job-details__title'),
                    company: 'IBS Software',
                    description: getText('.job-details__description-content'),
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
        console.log(`💾 Saved ${this.allJobs.length} jobs to InfiniteComputerSolutions.json`);
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
    let extractedLocation = job.location || '';
    let extractedExperience = job.experience || '';

    if (cleanedDescription) {
        // Check for unwanted map/footer block — common keywords or phrases
        const unwantedFooterDetected = cleanedDescription.includes('© MapTiler') ||
            cleanedDescription.includes('OpenStreetMap contributors') ||
            cleanedDescription.includes('Use two fingers to move the map') ||
            cleanedDescription.includes('Copy to Clipboard');

        if (unwantedFooterDetected) {
            cleanedDescription = 'Description not available\n';
        } else {
            // Extract 'Location:'
            const locationMatch = cleanedDescription.match(/^.*Location:\s*(.*)$/im);
            if (locationMatch) {
                extractedLocation = locationMatch[1].trim();
            }

            // Extract 'Experience:' or 'Years of Experience:'
            const experienceMatch = cleanedDescription.match(/^.*(?:Years of\s+)?Experience:\s*(.*)$/im);
            if (experienceMatch) {
                extractedExperience = experienceMatch[1].trim();
            }

            // Remove heading lines
            cleanedDescription = cleanedDescription
                .replace(/^.*Job\s*Title:.*\n?/im, '')
                .replace(/^.*Location:.*\n?/im, '')
                .replace(/^.*(?:Years of\s+)?Experience:.*\n?/im, '')
                .replace(/^.*Job\s*Description.*\n?/im, '');

            // Collapse multiple blank lines
            cleanedDescription = cleanedDescription.replace(/\n{3,}/g, '\n\n').trim();

            // Add final newline if needed
            if (cleanedDescription && !cleanedDescription.endsWith('\n')) {
                cleanedDescription += '\n';
            }

            // Fallback if empty
            if (!cleanedDescription.trim()) {
                cleanedDescription = 'Description not available\n';
            }
        }
    } else {
        cleanedDescription = 'Description not available\n';
    }

    return {
        ...job,
        title: job.title?.trim() || '',
        location: extractedLocation,
        experience: extractedExperience,
        description: cleanedDescription,
    };
};




// ✅ Exportable runner function
const runIBSSoftwareJobsScraper = async ({ headless = true } = {}) => {
    const scraper = new ibsSoftwareJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runIBSSoftwareJobsScraper;

// ✅ CLI support: node phonepe.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await runIBSSoftwareJobsScraper({ headless: headlessArg });
    })();
}
