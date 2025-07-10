import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

// Custom data extraction function for Uber jobs
const extractUberData = (job) => {
    if (!job) return job;
    
    // Clean description
    let cleanedDescription = job.description || '';
    if (cleanedDescription) {
        // Remove 'about the role', 'about the program', 'about the team', or any 'about the ...' at the start
        cleanedDescription = cleanedDescription.replace(/^about the [a-zA-Z]+\s*[:\-]?/i, '');
        // Add extra newlines before common section headers for readability
        cleanedDescription = cleanedDescription
            .replace(/(Responsibilities:|Requirements:|Skills:|Qualifications:)/gi, '\n$1\n')
            // Remove common unwanted patterns
            .replace(/^(description|job\s+descriptions?)\s*[:\-]?\s*/i, '')
            .replace(/^[^a-zA-Z0-9\n\r]+/, '')
            .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
            .trim();
    }
    
    // Clean title
    let cleanedTitle = job.title || '';
    if (cleanedTitle) {
        cleanedTitle = cleanedTitle.trim();
    }
    
    // Clean location
    let cleanedLocation = job.location || '';
    if (cleanedLocation) {
        cleanedLocation = cleanedLocation.trim();
    }
    
    return {
        ...job,
        title: cleanedTitle,
        location: cleanedLocation,
        description: cleanedDescription,
        company: 'Uber',
        scrapedAt: new Date().toISOString()
    };
};

class UberJobsScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.allJobs = [];
    this.allJobLinks = new Set();
  }

  async initialize() {
    this.browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'], defaultViewport: null });
    this.page = await this.browser.newPage();
  }

  async navigateToJobsPage() {
    await this.page.goto('https://www.uber.com/us/en/careers/list/?query=developer%2C%20cloud%2C%20engineering%2C%20technology%2C%20ML%2C%20success%2C%20frontend%2C%20backend%2C%20design%2C%20devops%2C%20fullstack%2C%20ui%2C%20ux%2C%20cyber%20security%2C%20blockchain%2C&location=IND-Karnataka-Bangalore&location=IND-Telangana-Hyderabad&location=IND-Haryana-Gurgaon&location=IND-West%20Bengal-Kolkata', { waitUntil: 'networkidle2', timeout: 30000 });
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
        const nextButton = await this.page.$('#main > div:nth-child(2) > div > div > div > div > div:nth-child(5) > button');
        if (nextButton) {
          await nextButton.evaluate(btn => btn.scrollIntoView({ block: 'center', behavior: 'smooth' }));
          await delay(1000 + Math.random() * 2000);
          const currentJobIds = await this.page.$$eval('span.css-dCwqLp > a.css-fYOjwv', links =>
            links.map(link => link.getAttribute('href').split('/').pop())
          );
          await Promise.all([
            this.page.waitForResponse(response =>
              response.url().includes('careers') && response.status() === 200
            ),
            nextButton.click()
          ]);
          await this.page.waitForFunction(
            (selector, oldIds) => {
              const newIds = Array.from(document.querySelectorAll(selector))
                .map(link => link.getAttribute('href').split('/').pop());
              return JSON.stringify(newIds) !== JSON.stringify(oldIds);
            },
            { timeout: 20000 },
            'span.css-dCwqLp > a.css-fYOjwv',
            currentJobIds
          );
          pageCount++;
        } else {
          console.log('🚫 No more pages found');
          hasNext = false;
        }
      } catch (err) {
        console.warn('⚠️ Error during pagination:', err.message);
        hasNext = false;
      }
    }
    console.log(`✅ Collected ${this.allJobLinks.size} total job links`);
  }

  async extractJobDetailsFromLink(url) {
    const jobPage = await this.browser.newPage();
    try {
      await jobPage.goto(url, { waitUntil: 'networkidle2' });
      await delay(1000 + Math.random() * 1000);
      const job = await jobPage.evaluate(() => {
        const tx = sel => document.querySelector(sel)?.textContent?.trim() || '';
        const title = tx('h1.css-huLrFc');
        const location = tx('div.css-ghtRay');
        const description = tx('div.css-cvJeNJ');
        const qualifications = Array.from(document.querySelectorAll('div.css-cvJeNJ li')).map(li => li.textContent.trim());
        const enhancedDescription = `
          ${description || ''}
          
          ${qualifications.length > 0 ? `
          Qualifications:
          • ${qualifications.join('\n• ')}
          ` : ''}
        `.trim();
        return {
          title,
          location,
          company: 'Uber',
          description: enhancedDescription,
          url: window.location.href,
        };
      });
      await jobPage.close();
      return job;
    } catch (err) {
      await jobPage.close();
      console.error(`❌ Error scraping job:`, err.message);
      return null;
    }
  }

  async processAllJobs() {
    const jobArray = Array.from(this.allJobLinks);
    for (let i = 0; i < jobArray.length; i++) {
      const jobUrl = jobArray[i];
      console.log(`📝 [${i+1}/${jobArray.length}] Processing: ${jobUrl}`);
      const jobData = await this.extractJobDetailsFromLink(jobUrl);
      if (jobData && jobData.title) {
        const enrichedJob = extractUberData(jobData);
        this.allJobs.push(enrichedJob);
        console.log(`✅ ${jobData.title} - ${jobData.location}`);
      }
      await delay(1000);
    }
  }

  async saveResults() {
    //fs.writeFileSync('./scrappedJobs/uberJobs.json', JSON.stringify(this.allJobs, null, 2));
    console.log(`💾 Saved ${this.allJobs.length} jobs to uberJobs.json`);
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

const runUberScraper = async () => {
  const scraper = new UberJobsScraper();
  await scraper.run();
  return scraper.allJobs;
};

export default runUberScraper;

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    await runUberScraper();
  })();
}