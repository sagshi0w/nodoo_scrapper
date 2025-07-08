import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class FreshworksJobsScraper {
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
    await this.page.goto('https://careers.smartrecruiters.com/Freshworks', { waitUntil: 'networkidle2' });
    await delay(3000);
  }

  async loadAllJobs() {
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
      return Array.from(document.querySelectorAll('a.link--block.details'))
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
        const getText = (sel) => document.querySelector(sel)?.innerText.trim() || '';
        const title = getText('h1.job-title');
        const description = getText('div.job-sections');
        return {
          title,
          company: 'Freshworks',
          description,
          url: window.location.href
        };
      });
      const location = await jobPage.$eval('spl-job-location', el => el.getAttribute('formattedaddress'));
      if(location && location.includes('India')){
        jobData.location = location;
        jobData.url = url;
        this.allJobs.push(jobData);
        console.log(`✅ Done: ${jobData.title}`);
      }
      await jobPage.close();
    } catch (err) {
      await jobPage.close();
      console.warn(`⚠️ Failed to process ${url}: ${err.message}`);
    }
  }

  async processAllJobs() {
    for (let i = 0; i < this.jobUrls.length; i++) {
      const jobUrl = this.jobUrls[i];
      console.log(`🔍 Processing job ${i + 1}/${this.jobUrls.length}: ${jobUrl}`);
      await this.extractJobDetailsFromLink(jobUrl);
      await delay(1000);
    }
  }

  async saveResults() {
    fs.writeFileSync('freshworks_jobs.json', JSON.stringify(this.allJobs, null, 2));
    console.log(`💾 Saved ${this.allJobs.length} jobs to freshworks_jobs.json`);
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

const runFreshworksScraper = async () => {
  const scraper = new FreshworksJobsScraper();
  await scraper.run();
  return scraper.allJobs;
};

export default runFreshworksScraper;

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    await runFreshworksScraper();
  })();
}
