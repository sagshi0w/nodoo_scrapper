import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class PhonePeJobsScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.allJobLinks = [];
    this.allJobs = [];
  }

  async initialize() {
    this.browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--start-maximized'], defaultViewport: null });
    this.page = await this.browser.newPage();
  }

  async navigateToJobsPage() {
    await this.page.goto('https://www.phonepe.com/careers/job-openings/', { waitUntil: 'networkidle2' });
    await delay(2000);
  }

  async collectAllJobCardLinks() {
    const jobCardsExist = await this.page.$('a.card');
    if (!jobCardsExist) {
      console.error('🚫 No job cards found on the page!');
      return;
    }
    const pageJobLinks = await this.page.$$eval('a.card', anchors =>
      anchors
        .map(a => a.href)
        .filter(href => href.includes('/phonepe/jobs'))
    );
    this.allJobLinks = [...new Set(pageJobLinks)];
    console.log(`🔗 Found ${this.allJobLinks.length} job links`);
  }

  async extractJobDetailsFromLink(url) {
    const jobPage = await this.browser.newPage();
    try {
      await jobPage.goto(url, { waitUntil: 'networkidle2' });
      await delay(3000);
      await jobPage.waitForSelector('div.job__description.body', { timeout: 10000 });
      const job = await jobPage.evaluate(() => {
        const getText = sel => document.querySelector(sel)?.innerText.trim() || '';
        return {
          title: getText('h1'),
          company: 'PhonePe',
          location: getText('.job__location') || 'Not specified',
          description: getText('.job__description.body'),
          url: window.location.href
        };
      });
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
      console.log(`📝 [${i+1}/${this.allJobLinks.length}] Processing: ${url}`);
      const jobData = await this.extractJobDetailsFromLink(url);
      if (jobData && jobData.title) {
        this.allJobs.push(jobData);
        console.log(`✅ ${jobData.title}`);
      }
      await delay(1000);
    }
  }

  async saveResults() {
    fs.writeFileSync('phonepeJobs.json', JSON.stringify(this.allJobs, null, 2));
    console.log(`💾 Saved ${this.allJobs.length} jobs to phonepeJobs.json`);
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

const runPhonePeScraper = async () => {
  const scraper = new PhonePeJobsScraper();
  await scraper.run();
  return scraper.allJobs;
};

export default runPhonePeScraper;

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    await runPhonePeScraper();
  })();
}
