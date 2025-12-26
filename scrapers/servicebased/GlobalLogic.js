import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class GlobalLogicJobsScraper {
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
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: this.headless ? { width: 1920, height: 1080 } : null
        });
        this.page = await this.browser.newPage();
    }

    async navigateToJobsPage() {
        console.log('🌐 Navigating to GlobalLogic Careers...');
        await this.page.goto(
            'https://www.globallogic.com/careers/open-positions',
            { waitUntil: 'domcontentloaded', timeout: 60000 }
        );
    }

    // ✅ FIXED: AJAX-safe job link collection
    async collectAllJobCardLinks() {
        console.log('🔍 Waiting for job cards (AJAX)...');

        try {
            // Wait for the container first
            await this.page.waitForSelector('.career_filter_result', { timeout: 20000 });
            
            // Then wait for job links to appear
            await this.page.waitForFunction(
                () => document.querySelectorAll('.career_filter_result a.job_box').length > 0,
                { timeout: 20000 }
            );

            await delay(3000); // allow full render

            const jobLinks = await this.page.$$eval(
                '.career_filter_result a.job_box',
                anchors => anchors.map(a => a.href)
            );

            this.allJobLinks = [...new Set(jobLinks)];

            console.log(`✅ Collected ${this.allJobLinks.length} job links`);
        } catch (err) {
            console.warn(`⚠️ Error collecting links: ${err.message}`);
            // Try fallback selector
            try {
                const jobLinks = await this.page.$$eval(
                    'a.job_box',
                    anchors => anchors.map(a => a.href)
                );
                this.allJobLinks = [...new Set(jobLinks)];
                console.log(`✅ Collected ${this.allJobLinks.length} job links (fallback)`);
            } catch (fallbackErr) {
                console.error(`❌ Failed to collect links: ${fallbackErr.message}`);
                this.allJobLinks = [];
            }
        }

        return this.allJobLinks;
    }

    async extractJobDetailsFromLink(url) {
        const jobPage = await this.browser.newPage();
        try {
            await jobPage.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });

            await jobPage.waitForSelector('.career_detail_area', {
                timeout: 15000
            });

            const job = await jobPage.evaluate(() => {
                const getText = sel =>
                    document.querySelector(sel)?.innerText.trim() || '';

                const getDetailValue = (label) => {
                    const blocks = document.querySelectorAll('.career_banner_details');
                    for (const block of blocks) {
                        const span = block.querySelector('span');
                        if (span?.textContent.trim() === label) {
                            return block.querySelector('p')?.innerText.trim() || '';
                        }
                    }
                    return '';
                };

                let description = '';
                const area = document.querySelector('.career_detail_area');

                if (area) {
                    const sections = [];
                    const headers = area.querySelectorAll('h4');

                    headers.forEach(h4 => {
                        if (h4.innerText.includes('About GlobalLogic')) return;

                        let content = h4.innerText + '\n';
                        let el = h4.nextElementSibling;

                        while (el && el.tagName !== 'H4') {
                            content += el.innerText + '\n';
                            el = el.nextElementSibling;
                        }

                        sections.push(content.trim());
                    });

                    description = sections.join('\n\n');
                }

                return {
                    title: getText('.career_detail_banner_right h1'),
                    company: 'GlobalLogic',
                    location: getDetailValue('Location'),
                    experience: getDetailValue('Experience'),
                    skills: getDetailValue('Skills'),
                    description: description || getText('.career_detail_area'),
                    url: window.location.href
                };
            });

            await jobPage.close();
            return job;
        } catch (err) {
            await jobPage.close();
            console.warn(`❌ Failed job page: ${url}`);
            return null;
        }
    }

    async processAllJobs() {
        for (let i = 0; i < this.allJobLinks.length; i++) {
            const url = this.allJobLinks[i];
            console.log(`📝 [${i + 1}/${this.allJobLinks.length}] ${url}`);

            const jobData = await this.extractJobDetailsFromLink(url);
            if (!jobData || !jobData.title) continue;

            const enrichedJob = extractWiproData(jobData);
            this.allJobs.push(enrichedJob);

            console.log(`✅ ${jobData.title}`);
            await delay(800);
        }
    }

    async saveResults() {
        fs.writeFileSync(
            './globallogicJobs.json',
            JSON.stringify(this.allJobs, null, 2)
        );
        console.log(`💾 Saved ${this.allJobs.length} jobs`);
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
        } catch (err) {
            console.error('❌ Scraper failed:', err);
        } finally {
            await this.close();
        }
    }
}

/* =======================
   EXPERIENCE ENRICHMENT
   ======================= */

const extractWiproData = (job) => {
    if (!job) return job;

    let cleanedDescription = job.description || '';
    let experience = null;
    let location = null;

    const patterns = [
        /\b(\d{1,2})\s*\+\s*(?:years|yrs)\b/i,
        /\b(\d{1,2})\s*(?:to|-|–)\s*(\d{1,2})\s*(?:years|yrs)\b/i
    ];

    for (const p of patterns) {
        const m = cleanedDescription.match(p);
        if (m) {
            experience = m[2]
                ? `${m[1]} - ${m[2]} yrs`
                : `${m[1]} - ${+m[1] + 2} yrs`;
            break;
        }
    }

    if (job.location) {
        location = job.location.split(',')[0].trim();
    }

    cleanedDescription = cleanedDescription
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    return {
        ...job,
        title: job.title.trim(),
        experience,
        location,
        description: cleanedDescription
    };
};

/* =======================
   EXPORT + CLI SUPPORT
   ======================= */

const runGlobalLogicJobsScraper = async ({ headless = true } = {}) => {
    const scraper = new GlobalLogicJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runGlobalLogicJobsScraper;

if (import.meta.url === `file://${process.argv[1]}`) {
    const headless = !process.argv.includes('--headless=false');
    runGlobalLogicJobsScraper({ headless });
}
