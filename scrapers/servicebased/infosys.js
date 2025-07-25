import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class SiemensJobsScraper {
  constructor(headless = true) {
    this.headless = headless;
    this.browser = null;
    this.page = null;
    this.allJobs = [];
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

  async navigateToJobsPage() {
    console.log('🌐 Navigating to Infosys Careers page...');
    await this.page.goto(
      'https://career.infosys.com/jobs?companyhiringtype=IL&countrycode=IN',
      { waitUntil: 'networkidle2', timeout: 60000 }
    );
    await delay(3000);
  }

  cleanJobDescription(description = '') {
    return description
      .replace(/^job summary\s*[:\-]?/i, '')
      .replace(/\n+job summary\s*[:\-]?/gi, '\n')
      .replace(/^job description\s*[:\-]?/i, '')
      .replace(/\n+job description\s*[:\-]?/gi, '\n')
      .replace(/(Responsibilities:|Requirements:|Skills:|Qualifications:)/gi, '\n$1\n')
      .replace(/[ \t]+$/gm, '')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }

  async scrapeAllJobs() {
    const jobCardsSelector = 'mat-card.custom-card';
    const jobDetailsSelector = 'div.col-md-9.container-fluid.mainContent';
    const maxPages = 1000;
    let pageNum = 1;

    for (; pageNum <= maxPages; pageNum++) {
      console.log(`📄 Scraping Page ${pageNum}...`);

      await this.page.waitForSelector(jobCardsSelector, { timeout: 10000 });
      const cards = await this.page.$$(jobCardsSelector);

      if (cards.length === 0) {
        console.log('✅ No more job cards. Stopping...');
        break;
      }

      for (let i = 0; i < cards.length; i++) {
        console.log(`📝 Processing Infosys job ${i + 1}/${cards.length}`);
        try {
          const card = cards[i];
          await card.click();
          await delay(2000);

          const job = await this.page.evaluate((detailsSelector) => {

            return {
              title: document.querySelector('span.jobTitle')?.innerText.trim() || '',
              location: document.querySelector('span.jobCity')?.innerText.trim() || '',
              description: document.querySelector('div.jobDesc')?.innerText.trim() || '',
              url: window.location.href,
              company: 'Infosys'
            };
          }, jobDetailsSelector);

          if (job?.title) {
            job.description = this.cleanJobDescription(job.description);
            job.scrapedAt = new Date().toISOString();
            this.allJobs.push(job);
            console.log(`✅ ${job.title}`);
          }

          const closeBtn = await this.page.$('[data-ph-at-id="close-button"]');
          if (closeBtn) {
            await closeBtn.click();
            await delay(500);
          }

        } catch (err) {
          console.warn(`⚠️ Error processing job ${i + 1}:`, err.message);
        }
      }

      const nextBtnSelector = 'div.iframe-button-wrapper > button';
      const nextBtn = await this.page.$(nextBtnSelector);

      if (nextBtn) {
        const isDisabled = await this.page.evaluate(btn => btn.disabled, nextBtn);
        if (!isDisabled) {
          console.log('➡️ Moving to next page...');
          await nextBtn.click();
          await delay(5000);
        } else {
          console.log('🛑 No more pages.');
          break;
        }
      } else {
        break;
      }
    }

    console.log(`✅ Total jobs scraped: ${this.allJobs.length}`);
  }

  async saveResults() {
    //writeFileSync('./scrappedJobs/siemensJobs.json', JSON.stringify(this.allJobs, null, 2));
    console.log(`💾 Saved ${this.allJobs.length} jobs to scrappedJobs/infosysJobs.json`);
  }

  async close() {
    if (this.browser) await this.browser.close();
  }

  async run() {
    try {
      await this.initialize();
      await this.navigateToJobsPage();
      await this.scrapeAllJobs();
      await this.saveResults();
    } catch (error) {
      console.error('❌ Scraper failed:', error);
    } finally {
      await this.close();
    }
  }
}

const runSiemensScraper = async ({ headless = true } = {}) => {
  const scraper = new SiemensJobsScraper(headless);
  await scraper.run();
  return scraper.allJobs;
};

export default runSiemensScraper;

if (import.meta.url === `file://${process.argv[1]}`) {
  const headlessArg = process.argv.includes('--headless=false') ? false : true;
  (async () => {
    await runSiemensScraper({ headless: headlessArg });
  })();
}
