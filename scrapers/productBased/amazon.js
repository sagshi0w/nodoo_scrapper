import { launch } from 'puppeteer';
import { writeFileSync } from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

// Custom data extraction function for Amazon jobs
const extractAmazonData = (job) => {
    if (!job) return job;

    let cleanedDescription = job.description || '';
    if (cleanedDescription) {
        cleanedDescription = cleanedDescription
            .replace(/^(description|job\s+descriptions?)\s*[:\-]?\s*/i, '')
            .replace(/^[^a-zA-Z0-9\n\r]+/, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    const cleanedTitle = job.title?.trim() || '';
    const cleanedLocation = job.location?.trim() || '';

    return {
        ...job,
        title: cleanedTitle,
        location: cleanedLocation,
        description: cleanedDescription,
        company: 'Amazon',
        scrapedAt: new Date().toISOString()
    };
};

const runAmazonScraper = async ({ headless = true } = {}) => {
    const browser = await launch({
        headless: headless ? true : false,
        args: ['--no-sandbox'],
        defaultViewport: null
    });

    const page = await browser.newPage();
    const allJobs = [];

    await page.goto('https://www.amazon.jobs/content/en/job-categories/software-development?country%5B%5D=IN#search', {
        waitUntil: 'networkidle2'
    });

    let pageCount = 1;
    let hasNext = true;

    while (hasNext) {
        console.log(`\n📄 Processing Page ${pageCount}`);

        try {
            await page.waitForSelector('a.header-module_title__9-W3R', { timeout: 15000 });
        } catch (err) {
            console.log('No job listings found, might be last page');
            break;
        }

        const jobLinks = await page.$$eval('a.header-module_title__9-W3R', links =>
            links.map(link => link.href.startsWith('http') ? link.href : `https://www.amazon.jobs${link.href}`)
        );

        console.log(`🃏 Found ${jobLinks.length} job links on page ${pageCount}`);

        for (let i = 0; i < jobLinks.length; i++) {
            const jobUrl = jobLinks[i];
            const jobPage = await browser.newPage();
            try {
                await jobPage.goto(jobUrl, { waitUntil: 'networkidle2' });
                await delay(1000);
                const job = await jobPage.evaluate(() => {
                    const tx = sel => document.querySelector(sel)?.innerText.trim() || '';
                    return {
                        title: tx('h1.title'),
                        company: 'Amazon',
                        location: tx('ul.association-content'),
                        description: tx('#job-detail-body > div > div.col-12.col-md-7.col-lg-8.col-xl-9 > div > div:nth-child(2)'),
                        url: window.location.href
                    };
                });
                if (job.title) {
                    const enrichedJob = extractAmazonData(job);
                    allJobs.push(enrichedJob);
                    console.log(`✅ [Page ${pageCount}] ${job.title}`);
                }
            } catch (err) {
                console.error(`❌ Error scraping job ${i + 1}:`, err.message);
            } finally {
                await jobPage.close();
            }
        }

        const prevTitles = await page.$$eval('a.header-module_title__9-W3R', links =>
            links.map(link => link.innerText.trim())
        );

        const nextBtn = await page.$('#search > div > div.search-body-module_root__76WXj.search-body-module_filtersCollapsed__PQzi8 > div.search-body-module_pagination__ATQrx > nav > button:nth-child(3) > div');
        if (nextBtn) {
            console.log('⏩ Clicking next page button...');
            await nextBtn.evaluate(btn => btn.scrollIntoView({ behavior: 'smooth', block: 'center' }));
            await delay(1000 + Math.random() * 2000);
            await nextBtn.click();

            try {
                await page.waitForFunction(
                    (selector, oldTitles) => {
                        const currentTitles = Array.from(document.querySelectorAll(selector)).map(a => a.innerText.trim());
                        return JSON.stringify(currentTitles) !== JSON.stringify(oldTitles);
                    },
                    { timeout: 15000 },
                    'a.header-module_title__9-W3R',
                    prevTitles
                );
                pageCount++;
                console.log(`🔄 Successfully navigated to page ${pageCount}`);
            } catch (err) {
                console.warn("⚠️ No new job listings detected or timeout occurred.");
                hasNext = false;
            }
        } else {
            console.log('🚫 No more pages. Next button not found.');
            hasNext = false;
        }
    }

    // Save results
    // writeFileSync('./scrappedJobs/amazonJobs.json', JSON.stringify(allJobs, null, 2));
    console.log(`💾 Scraped ${allJobs.length} jobs from Amazon.`);

    await browser.close();
    return allJobs;
};

export default runAmazonScraper;

// CLI support
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await runAmazonScraper({ headless: headlessArg });
    })();
}
