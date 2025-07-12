import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class RazorpayJobsScraper {
  constructor(headless = true) {
    this.browser = null;
    this.page = null;
    this.allJobLinks = [];
    this.allJobs = [];
    this.headless = headless;
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: this.headless,
      args: ['--no-sandbox', '--start-maximized'],
      defaultViewport: null
    });
    this.page = await this.browser.newPage();
  }

  async navigateToJobsPage() {
    await this.page.goto('https://razorpay.com/jobs/jobs-all/', { waitUntil: 'networkidle2' });
    await delay(3000);
  }

  async collectAllJobCardLinks() {
    let currentPage = 1;
    while (true) {
      await delay(2000);

      const jobCards = await this.page.$$('a.styles_container__LrNWu');
      if (jobCards.length === 0) {
        console.log('🚫 No job cards found. Stopping.');
        break;
      }

      const pageJobLinks = await this.page.$$eval('a.styles_container__LrNWu', anchors =>
        anchors.map(a => a.href)
      );
      this.allJobLinks.push(...pageJobLinks);

      const loadMoreBtn = await this.page.$('div.styles_arrow__RzLZC.styles_right__NhIcm');
      if (loadMoreBtn && currentPage < 10) {
        await loadMoreBtn.click();
        currentPage++;
        await delay(3000);
      } else {
        break;
      }
    }

    this.allJobLinks = [...new Set(this.allJobLinks)];
    console.log(`🔗 Found ${this.allJobLinks.length} unique job links`);
  }

  async extractJobDetailsFromLink(url) {
    const jobPage = await this.browser.newPage();
    try {
      await jobPage.goto(url, { waitUntil: 'networkidle2' });
      await delay(3000);

      const iframeHandle = await jobPage.waitForSelector('iframe', { timeout: 15000 });
      const frame = await iframeHandle.contentFrame();
      if (!frame) throw new Error('iframe content not found');

      const job = await frame.evaluate(() => {
        const getText = sel => document.querySelector(sel)?.innerText.trim() || '';
        return {
          title: getText('h1'),
          location: getText('.job__location') || 'Not specified',
          description: getText('.job__description.body'),
          url: window.location.href,
          company: 'Razorpay'
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
      console.log(`📝 [${i + 1}/${this.allJobLinks.length}] Processing: ${url}`);

      const jobData = await this.extractJobDetailsFromLink(url);
      if (jobData && jobData.title) {
        this.allJobs.push(extractRazorpayData(jobData));
        console.log(`✅ ${jobData.title}`);
      }
      await delay(1000);
    }
  }

  async saveResults() {
    fs.writeFileSync('./scrappedJobs/razorpayJobs.json', JSON.stringify(this.allJobs, null, 2));
    console.log(`💾 Saved ${this.allJobs.length} jobs to razorpayJobs.json`);
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

// ✅ Clean up job description
const extractRazorpayData = (job) => {
  if (!job) return job;

  let cleanedDescription = job.description || '';
  if (cleanedDescription) {
    cleanedDescription = cleanedDescription
      .replace(/[\s\S]*?roles and responsibilities\s*:/i, '')
      .replace(/roles and responsibilities\s*:/i, '')
      .replace(/[ \t]+$/gm, '')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }

  return {
    ...job,
    title: job.title.trim(),
    location: job.location.trim(),
    description: cleanedDescription,
    company: 'Razorpay',
    scrapedAt: new Date().toISOString()
  };
};

const runRazorpayScraper = async ({ headless = true } = {}) => {
  const scraper = new RazorpayJobsScraper(headless);
  await scraper.run();
  return scraper.allJobs;
};

export default runRazorpayScraper;

if (import.meta.url === `file://${process.argv[1]}`) {
  const headless = !process.argv.includes('--headless=false');
  (async () => {
    await runRazorpayScraper({ headless });
  })();
}
