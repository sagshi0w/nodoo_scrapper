import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

// 🧼 Clean Flipkart job description
function cleanDescription(raw) {
  const fieldLabels = [
    "Posted On", "Open Positions", "Skills Required", "Location",
    "Education/Qualification", "Years Of Exp"
  ];
  const sectionHeaders = ["About the Role", "Job Description", "Responsibilities"];

  let lines = raw.split('\n');

  lines = lines.filter(line =>
    !fieldLabels.concat(sectionHeaders).some(label =>
      line.trim().startsWith(label + ":") || line.trim() === label
    )
  );

  lines = [...new Set(lines)].map(line => line.trim()).filter(line => line);
  return lines.join('\n');
}

// 🧠 Enrich and clean extracted data
const extractFlipkartData = (job) => {
  if (!job) return null;

  let { title = '', location = '', description = '' } = job;

  return {
    ...job,
    title: title.trim(),
    location: location.trim(),
    description: cleanDescription(description),
    company: 'Flipkart',
    scrapedAt: new Date().toISOString()
  };
};

class FlipkartJobsScraper {
  constructor(headless = false) {
    this.browser = null;
    this.page = null;
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
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );
  }

  async navigateToJobsPage() {
    console.log('🌐 Navigating to Flipkart Careers page...');
    await this.page.goto('https://www.flipkartcareers.com/#!/joblist', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    await delay(5000);
  }

  async loadAllJobPages() {
    let pageCount = 1;

    while (true) {
      const nextBtn = await this.page.$('button.loadmore-btn');
      if (!nextBtn) {
        console.log('🚫 No more pages.');
        break;
      }

      console.log(`➡️ Loading more jobs (Page ${pageCount + 1})...`);
      await nextBtn.click();
      await delay(4000);
      pageCount++;
    }
  }

  async getAllJobCards() {
    const selector = 'div.block-h';
    await this.page.waitForSelector(selector, { timeout: 10000 });

    const indexes = await this.page.$$eval(selector, (els) => els.map((_, idx) => idx));
    console.log(`🔍 Found ${indexes.length} job cards`);
    return indexes;
  }

  async extractJobDetails(page) {
    try {
      const sel = {
        title: 'h2.defThmSubHeading.align-titleJob.ng-binding:not(.job-location)',
        location: 'h2.defThmSubHeading.align-titleJob.job-location.ng-binding',
        description: '#content > div > section.listing-block.recent-vehicles.customJobVwSection > div:nth-child(3) > div > div > div'
      };

      await page.waitForSelector(sel.title, { timeout: 15000 });
      await page.waitForSelector(sel.location, { timeout: 15000 });

      return await page.evaluate((s) => {
        const getText = selector => document.querySelector(selector)?.textContent.trim() || '';
        return {
          title: getText(s.title),
          location: getText(s.location),
          description: getText(s.description)
        };
      }, sel);
    } catch (err) {
      console.warn('⚠️ Failed to extract job details:', err.message);
      return { title: '', location: '', description: '' };
    }
  }

  async processJobCards(indexes) {
    const cards = await this.page.$$('div.block-h');

    for (let i = 0; i < indexes.length; i++) {
      const index = indexes[i];
      console.log(`📝 Processing job ${i + 1}/${indexes.length}`);

      try {
        const existingPages = await this.browser.pages();
        await cards[index].click();
        await delay(3000);

        const newPage = (await this.browser.pages()).find(p => !existingPages.includes(p));
        if (!newPage) {
          console.warn('⚠️ No new tab detected');
          continue;
        }

        await newPage.bringToFront();
        await newPage.waitForNetworkIdle({ timeout: 10000 });

        const jobDetails = await this.extractJobDetails(newPage);
        const enriched = extractFlipkartData({ ...jobDetails, url: newPage.url() });

        this.allJobs.push(enriched);
        await newPage.close();
      } catch (err) {
        console.error(`❌ Error on job ${i + 1}:`, err.message);
      }
    }
  }

  async saveResults() {
    const path = './scrappedJobs/flipkartJobs.json';
    fs.writeFileSync(path, JSON.stringify(this.allJobs, null, 2));
    console.log(`💾 Saved ${this.allJobs.length} jobs to ${path}`);
  }

  async close() {
    await this.browser.close();
  }

  async run() {
    try {
      await this.initialize();
      await this.navigateToJobsPage();
      await this.loadAllJobPages();
      const indexes = await this.getAllJobCards();
      await this.processJobCards(indexes);
      await this.saveResults();
    } catch (err) {
      console.error('❌ Flipkart scraper failed:', err);
    } finally {
      await this.close();
    }
  }
}

// 🚀 Entry point
const runFlipkartScraper = async ({ headless = false } = {}) => {
  const scraper = new FlipkartJobsScraper(headless);
  await scraper.run();
  return scraper.allJobs;
};

export default runFlipkartScraper;

// CLI support: `node flipkart.js --headless=false`
if (import.meta.url === `file://${process.argv[1]}`) {
  const headless = !process.argv.includes('--headless=false');
  (async () => {
    await runFlipkartScraper({ headless });
  })();
}
