import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class MicrosoftJobsScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.allJobs = new Set();
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox'],
      defaultViewport: null
    });
    this.page = await this.browser.newPage();
  }

  async navigateToJobsPage() {
    await this.page.goto('https://jobs.careers.microsoft.com/global/en/search?lc=India', {
      waitUntil: 'networkidle2'
    });
  }

  async processAllPages() {
    let pageCount = 1, hasNext = true;
    while (hasNext) {
      console.log(`\n📄 Page ${pageCount}`);
      await this.page.waitForSelector('div.ms-List-page', { timeout: 60000 });
      let jobCards = await this.page.$$('div.ms-List-cell');
      console.log(`🃏 Found ${jobCards.length} jobs`);
      for (let i = 0; i < jobCards.length; i++) {
        try {
          jobCards = await this.page.$$('div.ms-List-cell');
          await jobCards[i].click();
          await this.page.waitForSelector('h1', { timeout: 60000 });
          await delay(2000);
          const job = await this.page.evaluate(() => {
            const tx = s => document.querySelector(s)?.innerText.trim() || '';
            const title = tx('h1');
            const location = tx('p');
            const qualifications = tx('div.WzU5fAyjS4KUVs1QJGcQ');
            const responsibilities = tx('div.fcUffXZZoGt8CJQd8GUl');
            const jobDescription = `\n${qualifications ? `## Qualifications\n${qualifications}\n\n` : ''}${responsibilities ? `## Responsibilities\n${responsibilities}` : ''}`.trim();
            return {
              title,
              location,
              company: 'Microsoft',
              description: jobDescription,
              url: window.location.href
            };
          });

          if (job.title) {
            this.allJobs.add(JSON.stringify(job));
            console.log(`✅ ${job.title}`);
          }
          await this.page.goBack({ waitUntil: 'networkidle2' });
          await delay(1000);
        } catch (err) {
          console.error(`❌ Job ${i + 1} failed:`, err.message);
          await this.page.goBack({ waitUntil: 'networkidle2' }).catch(() => {});
          await delay(1000);
        }
      }
      const nextBtn = await this.page.$('button[aria-label="Go to next page"]');
      if (nextBtn) {
        const previousJobCount = (await this.page.$$('div.M9jNOkq94Xdh7PlzI0v4')).length;
        await nextBtn.click();
        console.log("➡️ Going to next page...");
        try {
          await this.page.waitForFunction(
            (selector, prevCount) =>
              document.querySelectorAll(selector).length !== prevCount,
            { timeout: 60000 },
            'div.M9jNOkq94Xdh7PlzI0v4',
            previousJobCount
          );
          pageCount++;
        } catch (err) {
          console.warn("⚠️ Timeout waiting for next page job cards");
          hasNext = false;
        }
      } else {
        console.log("🚫 No more pages.");
        hasNext = false;
      }
    }
  }

  async saveResults() {
    fs.writeFileSync('microsoft_jobs.json', JSON.stringify([...this.allJobs].map(j => JSON.parse(j)), null, 2));
    console.log(`💾 Saved ${this.allJobs.size} jobs to microsoft_jobs.json`);
  }

  async close() {
    await this.browser.close();
  }

  async run() {
    try {
      await this.initialize();
      await this.navigateToJobsPage();
      await this.processAllPages();
      await this.saveResults();
    } catch (error) {
      console.error('❌ Scraper failed:', error);
    } finally {
      await this.close();
    }
  }
}

const runMicrosoftScraper = async () => {
  const scraper = new MicrosoftJobsScraper();
  await scraper.run();
  return [...scraper.allJobs].map(j => JSON.parse(j));
};

export default runMicrosoftScraper;

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    await runMicrosoftScraper();
  })();
}
