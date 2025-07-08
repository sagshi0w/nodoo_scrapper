import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class ZohoJobsScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.allJobs = [];
    this.jobUrls = [];
  }

  async initialize() {
    this.browser = await puppeteer.launch({ headless: true, args: ['--start-maximized'] });
    this.page = await this.browser.newPage();
  }

  async navigateToJobsPage() {
    await this.page.goto('https://www.zoho.com/careers/', { waitUntil: 'networkidle2' });
    await delay(3000);
  }

  async collectAllJobCardLinks() {
    this.jobUrls = await this.page.evaluate(() => {
      return Array.from(document.querySelectorAll('li.rec-job-title a'))
        .map(link => link.href);
    });
    console.log(`🔗 Found ${this.jobUrls.length} job URLs`);
  }

  async extractJobDetailsFromLink(url) {
    const jobPage = await this.browser.newPage();
    try {
      await jobPage.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await delay(2000);
      const jobData = await jobPage.evaluate(() => {
        const getText = sel => document.querySelector(sel)?.innerText.trim() || '';
        return {
          title: getText('#data_title'),
          company: 'Zoho',
          location: getText('em#data_country'),
          description: getText('div#jobdescription_data > span#spandesc'),
          url: window.location.href
        };
      });
      await jobPage.close();
      return jobData;
    } catch (err) {
      await jobPage.close();
      console.warn(`⚠️ Failed to process ${url}: ${err.message}`);
      return null;
    }
  }

  async processAllJobs() {
    for (let i = 0; i < this.jobUrls.length; i++) {
      const jobUrl = this.jobUrls[i];
      if (!jobUrl) continue;
      console.log(`🔍 Processing job ${i + 1}/${this.jobUrls.length}: ${jobUrl}`);
      const jobData = await this.extractJobDetailsFromLink(jobUrl);
      if (jobData && jobData.title) {
        this.allJobs.push(jobData);
        console.log(`✅ Done: ${jobData.title}`);
      }
      await delay(1000);
    }
  }

  async saveResults() {
    fs.writeFileSync('zohoJobs.json', JSON.stringify(this.allJobs, null, 2));
    console.log(`💾 Saved ${this.allJobs.length} jobs to zohoJobs.json`);
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

const runZohoScraper = async () => {
  const scraper = new ZohoJobsScraper();
  await scraper.run();
  return scraper.allJobs;
};

export default runZohoScraper;

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    await runZohoScraper();
  })();
}
