import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class PaypalJobsScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.allJobs = [];
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--start-maximized'],
      defaultViewport: null
    });
    this.page = await this.browser.newPage();
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );
  }

  async navigateToJobsPage() {
    console.log('🌐 Navigating to PayPal Careers page...');
    await this.page.goto(
      'https://paypal.eightfold.ai/careers?location=India&pid=274907388508&domain=paypal.com&sort_by=relevance&triggerGoButton=false',
      { waitUntil: 'networkidle2', timeout: 60000 }
    );
    await delay(5000);
  }

  async loadAllJobCardsViaNextButton() {
    console.log('⏭️ Clicking "Next" until all job cards are loaded...');
    const nextBtnSelector =
      '#pcs-body-container > div:nth-child(2) > div.search-results-main-container > div > div.inline-block.position-cards-container > div > div.iframe-button-wrapper > button';
    let attempt = 0;

    while (true) {
      try {
        await this.page.waitForSelector(nextBtnSelector, { timeout: 5000 });
        const isDisabled = await this.page.$eval(nextBtnSelector, btn => btn.disabled);
        if (isDisabled) {
          console.log('🚫 Next button is disabled. Stopping.');
          break;
        }

        console.log(`👉 Clicking "Next" (Attempt ${++attempt})...`);
        await this.page.click(nextBtnSelector);
        await delay(3000);
      } catch (err) {
        console.log('✅ No more "Next" button or failed to find. Assuming all jobs are loaded.');
        break;
      }
    }

    console.log('✅ Finished loading all job cards.');
  }

  async collectAllJobCards() {
    await this.page.waitForSelector('.position-card', { timeout: 10000 });
    return await this.page.$$('.position-card');
  }

    cleanJobSummary(rawText) {
        // Stop processing after "Our Benefits"
        const benefitsIndex = rawText.indexOf("Our Benefits:");
        if (benefitsIndex !== -1) {
            rawText = rawText.substring(0, benefitsIndex);
        }

        // Remove unwanted characters and normalize spacing
        const cleaned = rawText
            .replace(/[\n\r\t]+/g, '\n')
            .replace(/[^\x20-\x7E\n]+/g, '')
            .replace(/\n{2,}/g, '\n\n')
            .trim();

        return cleaned;
    }

    async extractJobDetailsFromCard(cardHandle) {
        try {
            await cardHandle.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
            await delay(500);
            await cardHandle.click();
            await this.page.waitForSelector('.position-details', { timeout: 15000 });
            await delay(2000);

            // Click "Read more" if present
            const readMoreBtn = await this.page.$(
            '#main-container > div > div > div.position-details > div.row > div.col-md-8.position-job-description-column > div > div:nth-child(3) > div > div > span > button'
            );
            if (readMoreBtn) {
            console.log('📖 Clicking "Read more"...');
            await readMoreBtn.click();
            await delay(1000);
            }

            // Extract text and HTML from browser context
            const rawData = await this.page.evaluate(() => {
            const getText = sel => document.querySelector(sel)?.innerText.trim() || '';
            const getHTML = sel => document.querySelector(sel)?.innerHTML;

            const summaryText = getText('.position-job-description');

            return {
                title: getText('h1.position-title'),
                location: getText('p.position-location'),
                summaryText,
                url: window.location.href
            };
            });

            const cleanedSummary = this.cleanJobSummary(rawData.summaryText);

            return {
            title: rawData.title,
            company: 'Paypal',
            location: rawData.location,
            description: cleanedSummary,
            url: rawData.url,
            };

        } catch (err) {
            console.warn('⚠️ Failed to extract job details:', err.message);
            return null;
        }
    }

  async processAllJobs() {
    const cards = await this.collectAllJobCards();
    for (let i = 0; i < cards.length; i++) {
      console.log(`📝 Processing job ${i + 1}/${cards.length}`);
      const jobData = await this.extractJobDetailsFromCard(cards[i]);
      if (jobData) {
        this.allJobs.push(jobData);
      }
      await delay(1000);
    }
  }

  async saveResults() {
    fs.writeFileSync('paypalJobs.json', JSON.stringify(this.allJobs, null, 2));
    console.log(`💾 Saved ${this.allJobs.length} jobs to paypalJobs.json`);
  }

  async close() {
    await this.browser.close();
  }

  async run() {
    try {
      await this.initialize();
      await this.navigateToJobsPage();
      await this.loadAllJobCardsViaNextButton();
      await this.processAllJobs();
      await this.saveResults();
    } catch (err) {
      console.error('❌ Scraper failed:', err);
    } finally {
      await this.close();
    }
  }
}

const runPaypalScraper = async () => {
  const scraper = new PaypalJobsScraper();
  await scraper.run();
  return scraper.allJobs;
};

export default runPaypalScraper;

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    await runPaypalScraper();
  })();
}
