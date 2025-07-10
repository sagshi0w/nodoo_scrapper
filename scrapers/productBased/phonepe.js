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
        const enrichedJob = extractPhonePeData(jobData);
        this.allJobs.push(enrichedJob);
        console.log(`✅ ${jobData.title}`);
      }
      await delay(1000);
    }
  }

  async saveResults() {
    //fs.writeFileSync('./scrappedJobs/phonepeJobs.json', JSON.stringify(this.allJobs, null, 2));
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

// Custom data extraction function for PhonePe jobs
const extractPhonePeData = (job) => {
    if (!job) return job;
    let cleanedDescription = job.description || '';
    if (cleanedDescription) {
        // Remove specific phrases but keep the content after them
        cleanedDescription = cleanedDescription
            .replace(/about\s+phonepe\s+group\s*:/gi, '')
            .replace(/about\s+phonepe\s*:/gi, '')
            .replace(/culture/gi, '');
        
        // Remove the phrase 'Job Summary:' (case-insensitive, anywhere)
        cleanedDescription = cleanedDescription.replace(/job summary:?/gi, '').trim();
        
        // Add extra line breaks after common section headers for better readability
        cleanedDescription = cleanedDescription
            .replace(/(\n\s*)(responsibilities|requirements|qualifications|skills|experience|education|benefits|what\s+we\s+offer|key\s+responsibilities|job\s+description|role\s+and\s+responsibilities|about\s+the\s+role|what\s+you'll\s+do|what\s+you\s+will\s+do)(\s*:?\s*\n)/gi, '\n\n$1$2$3\n\n')
            .replace(/(\n\s*)(\d+\.\s*)(.*?)(\n)/gi, '\n\n$1$2$3$4\n')
            .replace(/(\n\s*)(•\s*)(.*?)(\n)/gi, '\n\n$1$2$3$4\n');
        
        // Remove extra blank lines and trailing spaces
        cleanedDescription = cleanedDescription
            .replace(/[ \t]+$/gm, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }
    let cleanedTitle = job.title ? job.title.trim() : '';
    let cleanedLocation = job.location ? job.location.trim() : '';
    return {
        ...job,
        title: cleanedTitle,
        location: cleanedLocation,
        description: cleanedDescription,
        company: 'PhonePe',
    };
};

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
