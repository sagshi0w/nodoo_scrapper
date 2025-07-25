import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
dotenv.config();

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const extractGoogleData = (job) => {
  if (!job) return job;

  let cleanedDescription = job.description || '';
  cleanedDescription = cleanedDescription
    .replace(/^(about(\s+(this|the))?\s+(job|role)\s*[:\-]?)\s*/i, '')
    .replace(/^(description|job\s+descriptions?)\s*[:\-]?\s*/i, '')
    .replace(/^[^a-zA-Z0-9\n\r]+/, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    ...job,
    title: (job.title || '').trim(),
    location: (job.location || '').trim(),
    description: cleanedDescription,
    company: 'Google',
    scrapedAt: new Date().toISOString()
  };
};

class GoogleJobsScraper {
  constructor(headless = true) {
    this.headless = headless;
    this.browser = null;
    this.page = null;
    this.jobs = new Set();
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: this.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        ...(this.headless ? [] : ['--start-maximized'])
      ],
      defaultViewport: this.headless ? { width: 1920, height: 1080 } : null
    });

    this.page = await this.browser.newPage();
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );
  }

  async scrapeJobs() {
    let pageCount = 1;
    let hasMore = true;

    console.log('🌐 Navigating to Google Careers page...');

    while (hasMore) {
      const url = `https://www.google.com/about/careers/applications/jobs/results?location=India&page=${pageCount}`;
      console.log(`🌐 Navigating to Page ${pageCount}...`);
      await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await delay(2000);

      const jobLinks = await this.page.$$eval('a[aria-label^="Learn more about"]', anchors =>
        anchors.map(a => a.href)
      );

      if (!jobLinks.length) {
        console.log('🚫 No more jobs found.');
        hasMore = false;
        break;
      }

      console.log(`🔗 Found ${jobLinks.length} job links on page ${pageCount}`);

      for (let i = 0; i < jobLinks.length; i++) {
        const jobUrl = jobLinks[i];
        try {
          await this.page.goto(jobUrl, { waitUntil: 'networkidle2', timeout: 60000 });
          await delay(1500);

          const job = await this.page.evaluate(() => {
            const getText = sel => document.querySelector(sel)?.textContent.trim() || '';

            const jobDescription = getText('div.aG5W3');
            const qualifications = getText('div.KwJkGe');
            const responsibilities = getText('div.BDNOWe');

            const fullDescription = `
                ${jobDescription}

                **Qualifications:**
                ${qualifications}

                **Responsibilities:**
                ${responsibilities}
                            `.trim();

            return {
              title: getText('h2.p1N2lc'),
              location: getText('span.r0wTof'),
              description: fullDescription,
              url: window.location.href
            };
          });

          if (job?.title) {
            const enrichedJob = extractGoogleData(job);
            this.jobs.add(JSON.stringify(enrichedJob));
            console.log(`✅ Saved: ${enrichedJob.title}`);
          }
        } catch (err) {
          console.warn(`⚠️ Failed to process job ${i + 1}:`, err.message);
        }
      }

      pageCount++;
    }
  }

  async close() {
    if (this.browser) await this.browser.close();
  }

  async run() {
    try {
      await this.initialize();
      await this.scrapeJobs();
    } catch (err) {
      console.error('❌ Google scraper failed:', err);
    } finally {
      await this.close();
    }

    const finalJobs = [...this.jobs].map(j => JSON.parse(j));
    console.log(`\n💾 Scraped ${finalJobs.length} Google jobs`);
    return finalJobs;
  }
}

const runGoogleScraper = async ({ headless = true } = {}) => {
  const scraper = new GoogleJobsScraper(headless);
  return await scraper.run();
};

export default runGoogleScraper;

// CLI usage: node google.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
  const headlessArg = process.argv.includes('--headless=false') ? false : true;
  (async () => {
    await runGoogleScraper({ headless: headlessArg });
  })();
}
