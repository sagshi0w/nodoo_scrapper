import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class SwiggyJobsScraper {
  constructor(headless = true) {
    this.headless = headless;
    this.browser = null;
    this.page = null;
    this.jobIds = [];
    this.allJobs = [];
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: this.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--start-maximized'
      ],
      defaultViewport: null
    });
    this.page = await this.browser.newPage();
  }

  async collectJobIds() {
    console.log('🌐 Navigating to job listings...');
    await this.page.goto('https://careers.swiggy.com/#/careers', { waitUntil: 'networkidle2' });
    await this.page.waitForSelector('iframe#mnhembedded', { timeout: 15000 });
    const iframeHandle = await this.page.$('iframe#mnhembedded');
    const frame = await iframeHandle.contentFrame();

    let pageCount = 1;
    const nextBtnSelector = 'ul.pagination li:last-child a';

    while (true) {
      console.log(`📄 Processing page ${pageCount}...`);
      await frame.waitForSelector('tr.mnh-jobs-table-row', { timeout: 10000 });
      const ids = await frame.$$eval('tr.mnh-jobs-table-row td span.mnh_req_id', spans => spans.map(span => span.textContent.trim()));
      this.jobIds.push(...ids);

      const nextBtn = await frame.$(nextBtnSelector);
      if (!nextBtn) break;

      const isDisabled = await nextBtn.evaluate(el => el.closest('li').classList.contains('disabled'));
      if (isDisabled) break;

      await nextBtn.click();
      await delay(2000);
      pageCount++;
    }

    console.log(`✅ Collected ${this.jobIds.length} job IDs.`);
  }

  async processJobs() {
    for (let i = 0; i < this.jobIds.length; i++) {
      const jobId = this.jobIds[i];
      console.log(`🔍 Searching for Job ID: ${jobId}`);

      const jobPage = await this.browser.newPage();
      await jobPage.goto(`https://swiggy.mynexthire.com/employer/jobs/careers#?src=careers&page=careers`, { waitUntil: 'networkidle2' });

      await jobPage.waitForSelector('body > div > div > div:nth-child(3) > div > h4 > div > input', { visible: true });
      await jobPage.type('body > div > div > div:nth-child(3) > div > h4 > div > input', jobId, { delay: 100 });

      await delay(3000);

      const iframeHandle = await jobPage.$('iframe#mnhembedded');
      if (!iframeHandle) {
        console.warn(`⚠️ iframe not found for Job ID ${jobId}`);
        await jobPage.close();
        continue;
      }

      let iframeSrc = null;
      for (let j = 0; j < 10; j++) {
        iframeSrc = await iframeHandle.evaluate(el => el.getAttribute('src'));
        if (iframeSrc && iframeSrc.includes(jobId)) break;
        await delay(1000);
      }

      if (!iframeSrc || !iframeSrc.includes(jobId)) {
        console.warn(`⚠️ Job ID ${jobId} not found in iframe src after retries.`);
        await jobPage.close();
        continue;
      }

      const jobFramePage = await this.browser.newPage();
      await jobFramePage.goto(iframeSrc, { waitUntil: 'networkidle2' });

      try {
        await jobFramePage.waitForSelector('h4.mnh-jd-req-title > strong', { timeout: 10000 });
        const jobData = await jobFramePage.evaluate(() => {
          const getText = sel => document.querySelector(sel)?.innerText.trim() || '';
          const cleanText = text => text.replace(/[^a-zA-Z0-9.,\s\-()/]/g, '');
          return {
            title: getText('h4.mnh-jd-req-title > strong'),
            location: getText('span.mnh-jd-office'),
            description: cleanText(getText('#mnhJobboardDescriptionForDisplay > span')),
            url: window.location.href,
            company: 'Swiggy',
            scrapedAt: new Date().toISOString()
          };
        });

        console.log(`✅ Collected: ${jobData.title}`);
        this.allJobs.push(jobData);
      } catch (err) {
        console.warn(`⚠️ Failed to process Job ID ${jobId}: ${err.message}`);
      }

      await jobFramePage.close();
      await jobPage.close();
      await delay(1000);
    }
  }

  async saveResults() {
    writeFileSync('./scrappedJobs/swiggyJobs.json', JSON.stringify(this.allJobs, null, 2));
    console.log(`💾 Saved ${this.allJobs.length} jobs to scrappedJobs/swiggyJobs.json`);
  }

  async close() {
    if (this.browser) await this.browser.close();
  }

  async run() {
    try {
      await this.initialize();
      await this.collectJobIds();
      await this.processJobs();
      await this.saveResults();
    } catch (err) {
      console.error('❌ Scraper failed:', err);
    } finally {
      await this.close();
    }
  }
}

const runSwiggyScraper = async ({ headless = true } = {}) => {
  const scraper = new SwiggyJobsScraper(headless);
  await scraper.run();
  return scraper.allJobs;
};

export default runSwiggyScraper;

if (import.meta.url === `file://${process.argv[1]}`) {
  const headlessArg = process.argv.includes('--headless=false') ? false : true;
  (async () => {
    await runSwiggyScraper({ headless: headlessArg });
  })();
}
