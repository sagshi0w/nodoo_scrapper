import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

class ZohoJobsScraper {
  constructor(headless = true) {
    this.headless = headless;
    this.browser = null;
    this.page = null;
    this.allJobs = [];
    this.jobUrls = [];
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: this.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        ...(this.headless ? [] : ['--start-maximized']),
      ],
      defaultViewport: this.headless ? { width: 1440, height: 900 } : null,
    });

    this.page = await this.browser.newPage();

    // 🛡️ Set realistic user-agent to avoid bot detection
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    );
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
    });
  }

  async navigateToJobsPage() {
    const targetURL = 'https://careers.zohorecruit.com/jobs/Careers';

    console.log(`🌐 Navigating to direct job page: ${targetURL}`);
    await this.page.goto(targetURL, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    // Wait for job cards (update selector to match correct structure)
    await this.page.waitForSelector('a.job-title', { timeout: 20000 });

    // Debug dump
    await this.page.screenshot({ path: 'zoho_jobs.png', fullPage: true });
    fs.writeFileSync('zoho_jobs.html', await this.page.content());

    await delay(3000);
  }



  async collectAllJobCardLinks() {
    console.log('📄 Collecting job links from page...');

    // 🐞 Dump debug info in CI
    await this.page.screenshot({ path: 'zoho_debug.png', fullPage: true });
    fs.writeFileSync('zoho_debug.html', await this.page.content());

    this.jobUrls = await this.page.evaluate(() =>
      Array.from(document.querySelectorAll('a.job-title')).map((a) => a.href)
    );
    console.log(`🔗 Found ${this.jobUrls.length} job URLs`);
  }

  async extractJobDetailsFromLink(url) {
    const jobPage = await this.browser.newPage();
    try {
      await jobPage.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await delay(1000);
      const job = await jobPage.evaluate(() => {
        const tx = (sel) => document.querySelector(sel)?.innerText.trim() || '';
        return {
          title: tx('#data_title'),
          company: 'Zoho',
          location: tx('em#data_country'),
          description: tx('div#jobdescription_data > span#spandesc'),
          url: window.location.href,
        };
      });
      await jobPage.close();
      return job;
    } catch (err) {
      await jobPage.close();
      console.warn(`⚠️ Failed to process ${url}: ${err.message}`);
      return null;
    }
  }

  async processAllJobs() {
    for (let i = 0; i < this.jobUrls.length; i++) {
      const jobUrl = this.jobUrls[i];
      console.log(`🔍 Processing job ${i + 1}/${this.jobUrls.length}: ${jobUrl}`);
      const job = await this.extractJobDetailsFromLink(jobUrl);
      if (job?.title) {
        this.allJobs.push(job);
        console.log(`✅ Collected: ${job.title}`);
      }
      await delay(1000);
    }
  }

  async saveResults() {
    fs.writeFileSync('./scrappedJobs/zohoJobs.json', JSON.stringify(this.allJobs, null, 2));
    console.log(`💾 Saved ${this.allJobs.length} jobs to ./scrappedJobs/zohoJobs.json`);
  }

  async close() {
    if (this.browser) await this.browser.close();
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

const runZohoScraper = async ({ headless = true } = {}) => {
  const scraper = new ZohoJobsScraper(headless);
  await scraper.run();
  return scraper.allJobs;
};

export default runZohoScraper;

// ⛳ Run directly with optional headless flag
if (import.meta.url === `file://${process.argv[1]}`) {
  const headlessArg = process.env.HEADLESS !== 'false' && !process.argv.includes('--headless=false');
  (async () => {
    await runZohoScraper({ headless: headlessArg });
  })();
}
