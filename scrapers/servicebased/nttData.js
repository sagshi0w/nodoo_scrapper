import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class NttDataJobsScraper {
  constructor(headless = true) {
    this.headless = headless;
    this.browser = null;
    this.page = null;
    this.allJobs = [];
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: this.headless ? true : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--no-zygote',
        '--single-process',
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
    console.log('🌐 Navigating to NTT Data Careers page...');
    await this.page.goto(
      'https://paypal.eightfold.ai/careers?location=India&pid=274907388508&domain=paypal.com&sort_by=relevance&triggerGoButton=false',
      { waitUntil: 'networkidle2', timeout: 60000 }
    );
    await delay(5000);
  }

  async loadAndScrapeAllPages() {
    let start = 0;
    let pageCount = 1;

    const indianCities = [ /* Indian cities list as before */
      "Bangalore", "Bengaluru", "Mumbai", "Delhi", "Hyderabad", "Chennai", "Pune", "Gurgaon", "Noida",
      "Kolkata", "Ahmedabad", "Jaipur", "Chandigarh", "Indore", "Lucknow", "Coimbatore", "Nagpur",
      "Surat", "Visakhapatnam", "Bhopal", "Patna", "Vadodara", "Ghaziabad", "Ludhiana", "Agra",
      "Nashik", "Faridabad", "Meerut", "Rajkot", "Kalyan", "Vasai", "Varanasi", "Srinagar", "Aurangabad",
      "Dhanbad", "Amritsar", "Navi Mumbai", "Allahabad", "Ranchi", "Howrah", "Jabalpur", "Gwalior",
      "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota", "Guwahati", "Chandrapur", "Solapur",
      "Remote", "Gurugram", "Kanpur", "Trichy", "Tiruchirappalli", "Mysore", "Thrissur", "Jamshedpur", "Udaipur",
      "Dehradun", "Hubli", "Dharwad", "Nellore", "Thane", "Panaji", "Shimla", "Mangalore",
      "Bareilly", "Salem", "Aligarh", "Bhavnagar", "Kolhapur", "Ajmer", "Belgaum", "Tirupati",
      "Rourkela", "Bilaspur", "Anantapur", "Silchar", "Kochi", "Thiruvananthapuram"
    ];

    while (start < 10) {
      const url = `https://nttdata.eightfold.ai/careers?pid=563327923692371&sort_by=hot&start=${start}`;

      console.log(`🌐 Navigating to Page ${pageCount} -> ${url}`);
      await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await delay(5000);

      await this.page.waitForSelector('div[data-test-id="job-listing"]', { timeout: 10000 });
      const cards = await this.page.$$('div[data-test-id="job-listing"]');
      const cardsCount = cards.length;

      if (cardsCount === 0) {
        console.log('✅ No more job cards found. Stopping pagination.');
        break;
      }

      for (let i = 0; i < cardsCount; i++) {
        const freshCards = await this.page.$$('div[data-test-id="job-listing"]');
        const card = freshCards[i];

        console.log(`📝 Processing job ${i + 1}/${cardsCount} on Page ${pageCount}`);

        try {
          const jobData = await this.extractJobDetailsFromCard(card);
          if (jobData.title && jobData.description && jobData.location && jobData.url) {
            const jobLocation = jobData.location.toLowerCase();
            const isIndianCity = indianCities.some(city => jobLocation.includes(city.toLowerCase()));
            if (isIndianCity) {
              this.allJobs.push(jobData);
            }
          }
        } catch (err) {
          console.warn(`⚠️ Failed to extract job ${i + 1}:`, err.message);
        }

        await delay(1000);
      }

      start += 10;
      pageCount++;
    }

    console.log('✅ Completed scraping all pages.');
  }

  cleanJobSummary(rawText) {
    let cleaned = rawText;

    const jobSummaryPattern = /job summary\s*:?/i;
    const jobSummaryMatch = cleaned.match(jobSummaryPattern);
    if (jobSummaryMatch) {
      const idx = cleaned.toLowerCase().indexOf(jobSummaryMatch[0].toLowerCase());
      if (idx !== -1) {
        cleaned = cleaned.substring(idx + jobSummaryMatch[0].length);
      }
    } else {
      const sectionPatterns = [
        /about company\s*:?/i,
        /about us\s*:?/i,
        /company overview\s*:?/i,
        /the company\s*:?/i
      ];
      let cutIndex = cleaned.length;
      for (const pattern of sectionPatterns) {
        const match = cleaned.match(pattern);
        if (match && match.index < cutIndex) {
          cutIndex = match.index;
        }
      }
      cleaned = cleaned.substring(0, cutIndex);
    }

    cleaned = cleaned.replace(/^.*meet your team.*$/gim, '');

    const benefitsIndex = cleaned.indexOf("Our Benefits:");
    if (benefitsIndex !== -1) {
      cleaned = cleaned.substring(0, benefitsIndex);
    }

    return cleaned
      .replace(/[\n\r\t]+/g, '\n')
      .replace(/[^\x20-\x7E\n]+/g, '')
      .replace(/\n{2,}/g, '\n\n')
      .trim();
  }

  async extractJobDetailsFromCard(cardHandle) {
    await cardHandle.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    await delay(500);
    await cardHandle.click();
    await delay(2000);

    const rawData = await this.page.evaluate(() => {
      const getText = sel => document.querySelector(sel)?.innerText.trim() || '';
      return {
        title: getText('.position-title-3TPtN'),
        location: getText('.position-location-12ZUO'),
        summaryText: getText('#job-description-container'),
        url: window.location.href
      };
    });

    const cleanedSummary = this.cleanJobSummary(rawData.summaryText);

    return {
      title: rawData.title,
      company: 'PayPal',
      location: rawData.location,
      description: cleanedSummary,
      url: rawData.url
    };
  }

  async saveResults() {
    //writeFileSync('./scrappedJobs/paypalJobs.json', JSON.stringify(this.allJobs, null, 2));
    console.log(`💾 Saved ${this.allJobs.length} jobs to scrappedJobs/NTTDataJobs.json`);
  }

  async close() {
    if (this.browser) await this.browser.close();
  }

  async run() {
    try {
      await this.initialize();
      await this.navigateToJobsPage();
      await this.loadAndScrapeAllPages();
      await this.saveResults();
    } catch (err) {
      console.error('❌ Scraper failed:', err);
    } finally {
      await this.close();
    }
  }
}

const runNTTDataScraper = async ({ headless = true } = {}) => {
  const scraper = new NttDataJobsScraper(headless);
  await scraper.run();
  return scraper.allJobs;
};

export default runNTTDataScraper;

// Allow direct CLI execution for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  const headlessArg = process.argv.includes('--headless=false') ? false : true;
  (async () => {
    await runNTTDataScraper({ headless: headlessArg });
  })();
}
