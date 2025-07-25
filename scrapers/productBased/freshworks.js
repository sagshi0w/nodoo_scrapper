import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

// 🧼 Clean and format job details
const extractFreshworksData = (job) => {
  if (!job) return job;

  let cleanedDescription = job.description || '';
  if (cleanedDescription) {
    cleanedDescription = cleanedDescription
      .replace(/^(description|job\s+descriptions?)\s*[:\-]?\s*/i, '')
      .replace(/^[^a-zA-Z0-9\n\r]+/, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+$/gm, '')
      .replace(/\n{2,}/g, '\n')
      .trim();

    const idx = cleanedDescription.toLowerCase().indexOf('company description');
    if (idx !== -1) {
      cleanedDescription = cleanedDescription.slice(0, idx).trim();
    }
  }

  return {
    ...job,
    title: (job.title || '').trim(),
    location: (job.location || '').trim(),
    description: cleanedDescription,
    company: 'Freshworks',
    scrapedAt: new Date().toISOString()
  };
};

class FreshworksJobsScraper {
  constructor(headless = true) {
    this.browser = null;
    this.page = null;
    this.allJobs = [];
    this.jobUrls = [];
    this.headless = headless;
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: this.headless,
      args: ['--start-maximized'],
      defaultViewport: null
    });
    this.page = await this.browser.newPage();
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );
  }

  async navigateToJobsPage() {
    console.log('🌐 Navigating to Freshworks Careers page...');
    await this.page.goto('https://careers.smartrecruiters.com/Freshworks', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    await delay(3000);
  }

  async loadAllJobs() {
    console.log('🔄 Loading all job listings...');
    while (true) {
      const showMoreButton = await this.page.$('a.js-more');
      if (!showMoreButton) break;

      await Promise.all([
        this.page.waitForResponse(res => res.url().includes('smartrecruiters.com') && res.status() === 200),
        showMoreButton.click()
      ]);

      await delay(2000);
    }
  }

  async collectAllJobCardLinks() {
    this.jobUrls = await this.page.evaluate(() => {
      return Array.from(document.querySelectorAll('a.link--block.details')).map(a => a.href);
    });
    console.log(`🔗 Found ${this.jobUrls.length} job URLs`);
  }

  async extractJobDetailsFromLink(url) {
    const jobPage = await this.browser.newPage();
    try {
      await jobPage.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await delay(2000);

      const jobData = await jobPage.evaluate(() => {
        const getText = (sel) => document.querySelector(sel)?.innerText.trim() || '';
        return {
          title: getText('h1.job-title'),
          description: getText('div.job-sections'),
          url: window.location.href
        };
      });

      const location = await jobPage.$eval('spl-job-location', el => el.getAttribute('formattedaddress')).catch(() => '');
      if (location && location.includes('India')) {
        jobData.location = location;
        const enriched = extractFreshworksData(jobData);
        this.allJobs.push(enriched);
        console.log(`✅ Done: ${jobData.title}`);
      }

    } catch (err) {
      console.warn(`⚠️ Failed to process ${url}: ${err.message}`);
    } finally {
      await jobPage.close();
    }
  }

  async processAllJobs() {
    for (let i = 0; i < this.jobUrls.length; i++) {
      console.log(`🔍 Processing job ${i + 1}/${this.jobUrls.length}`);
      await this.extractJobDetailsFromLink(this.jobUrls[i]);
      await delay(1000);
    }
  }

  async saveResults() {
    const path = './scrappedJobs/freshworksJobs.json';
    //fs.writeFileSync(path, JSON.stringify(this.allJobs, null, 2));
    console.log(`💾 Saved ${this.allJobs.length} jobs to ${path}`);
  }

  async close() {
    await this.browser.close();
  }

  async run() {
    try {
      await this.initialize();
      await this.navigateToJobsPage();
      await this.loadAllJobs();
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

// 🟢 Exported runner
const runFreshworksScraper = async ({ headless = true } = {}) => {
  const scraper = new FreshworksJobsScraper(headless);
  await scraper.run();
  return scraper.allJobs;
};

export default runFreshworksScraper;

// CLI support
if (import.meta.url === `file://${process.argv[1]}`) {
  const headless = !process.argv.includes('--headless=false');
  (async () => {
    await runFreshworksScraper({ headless });
  })();
}
