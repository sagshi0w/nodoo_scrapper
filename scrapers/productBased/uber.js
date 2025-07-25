import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

const extractUberData = (job) => {
  if (!job) return job;
  let cleanedDescription = job.description || '';

  if (cleanedDescription) {
    cleanedDescription = cleanedDescription
      .replace(/^about the [a-zA-Z]+\s*[:\-]?/i, '')
      .replace(/(Responsibilities:|Requirements:|Skills:|Qualifications:)/gi, '\n$1\n')
      .replace(/^(description|job\s+descriptions?)\s*[:\-]?\s*/i, '')
      .replace(/^[^a-zA-Z0-9\n\r]+/, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  return {
    ...job,
    title: job.title?.trim() || '',
    location: job.location?.trim() || '',
    description: cleanedDescription,
    company: 'Uber',
    scrapedAt: new Date().toISOString()
  };
};

class UberJobsScraper {
  constructor(headless = true) {
    this.headless = headless;
    this.browser = null;
    this.page = null;
    this.allJobs = [];
    this.allJobLinks = new Set();
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: this.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: null
    });
    this.page = await this.browser.newPage();
  }

  async navigateToJobsPage() {
    console.log('🌐 Navigating to Uber Careers...');
    await this.page.goto(
      'https://www.uber.com/us/en/careers/list/?query=developer%2C%20cloud%2C%20engineering%2C%20technology%2C%20ML%2C%20success%2C%20frontend%2C%20backend%2C%20design%2C%20devops%2C%20fullstack%2C%20ui%2C%20ux%2C%20cyber%20security%2C%20blockchain%2C&location=IND-Karnataka-Bangalore&location=IND-Telangana-Hyderabad&location=IND-Haryana-Gurgaon&location=IND-West%20Bengal-Kolkata',
      { waitUntil: 'networkidle2', timeout: 60000 }
    );
  }

  async collectAllJobCardLinks() {
    let pageCount = 1;
    let hasNext = true;

    while (hasNext) {
      try {
        await this.page.waitForSelector('span.css-dCwqLp > a.css-fYOjwv', { timeout: 15000 });

        const currentPageLinks = await this.page.$$eval('span.css-dCwqLp > a.css-fYOjwv', links =>
          links.map(link => {
            const href = link.getAttribute('href');
            return href.startsWith('http') ? href : `https://www.uber.com${href}`;
          })
        );

        currentPageLinks.forEach(link => this.allJobLinks.add(link));
        console.log(`📄 Page ${pageCount}: Collected ${currentPageLinks.length} job links`);

        const nextButton = await this.page.$('button[aria-label="Next page"]');
        if (nextButton) {
          const previousCount = this.allJobLinks.size;
          await nextButton.evaluate(btn => btn.scrollIntoView({ behavior: 'smooth', block: 'center' }));
          await delay(3000);
          await nextButton.click();
          await delay(5000);

          // Verify if more jobs were loaded
          const afterClickLinks = await this.page.$$eval('span.css-dCwqLp > a.css-fYOjwv', links =>
            links.map(link => link.getAttribute('href'))
          );

          if (afterClickLinks.length === 0 || this.allJobLinks.size === previousCount) {
            hasNext = false;
          }

          pageCount++;
        } else {
          console.log('🚫 No more pages found');
          hasNext = false;
        }
      } catch (err) {
        console.warn('⚠️ Pagination error:', err.message);
        hasNext = false;
      }
    }

    console.log(`✅ Collected ${this.allJobLinks.size} total job links`);
  }

  async extractJobDetailsFromLink(url) {
    const jobPage = await this.browser.newPage();
    try {
      await jobPage.goto(url, { waitUntil: 'networkidle2', timeout: 40000 });
      await delay(1000);

      const job = await jobPage.evaluate(() => {
        const tx = sel => document.querySelector(sel)?.innerText?.trim() || '';
        const title = tx('h1.css-huLrFc');
        const location = tx('div.css-ghtRay');
        const description = tx('div.css-cvJeNJ');
        const qualifications = Array.from(document.querySelectorAll('div.css-cvJeNJ li')).map(li => li.textContent.trim());

        const fullDescription = `
${description || ''}

${qualifications.length ? 'Qualifications:\n• ' + qualifications.join('\n• ') : ''}
        `.trim();

        return {
          title,
          location,
          description: fullDescription,
          url: window.location.href
        };
      });

      await jobPage.close();
      return job;
    } catch (err) {
      await jobPage.close();
      console.error(`❌ Error scraping job at ${url}:`, err.message);
      return null;
    }
  }

  async processAllJobs() {
    const jobArray = Array.from(this.allJobLinks);

    for (let i = 0; i < jobArray.length; i++) {
      const url = jobArray[i];
      console.log(`📝 [${i + 1}/${jobArray.length}] ${url}`);
      const job = await this.extractJobDetailsFromLink(url);
      if (job?.title) {
        this.allJobs.push(extractUberData(job));
        console.log(`✅ ${job.title}`);
      }
      await delay(1000);
    }
  }

  async saveResults() {
    //fs.writeFileSync('./scrappedJobs/uberJobs.json', JSON.stringify(this.allJobs, null, 2));
    console.log(`💾 Saved ${this.allJobs.length} jobs to ./scrappedJobs/uberJobs.json`);
  }

  async close() {
    if (this.browser) await this.browser.close();
  }

  async run() {
    try {
      await this.initialize();
      await this.navigateToJobsPage();
      await this.collectAllJobCardLinks();
      await this.processAllJobs();
      await this.saveResults();
    } catch (err) {
      console.error('❌ Scraper failed:', err.message);
    } finally {
      await this.close();
    }
  }
}

const runUberScraper = async ({ headless = true } = {}) => {
  const scraper = new UberJobsScraper(headless);
  await scraper.run();
  return scraper.allJobs;
};

export default runUberScraper;

if (import.meta.url === `file://${process.argv[1]}`) {
  const headlessArg = !process.argv.includes('--headless=false');
  (async () => {
    await runUberScraper({ headless: headlessArg });
  })();
}
