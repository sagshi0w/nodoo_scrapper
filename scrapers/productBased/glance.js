const puppeteer = require('puppeteer');
const fs = require('fs');

const delay = ms => new Promise(res => setTimeout(res, ms));

class GlanceJobsScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.allJobs = [];
    this.jobLinks = [];
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--start-maximized'],
      defaultViewport: null
    });
    this.page = await this.browser.newPage();
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );
  }

  async navigateToJobsPage() {
    console.log('🌐 Navigating to Glance Careers page...');
    await this.page.goto('https://glance.com/careers#apply-now', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    await delay(5000);

    console.log('🎯 Opening Role dropdown...');
    await this.page.click('#__next > div > div.styles__CareersContainer-sc-tfwrse-0.cdjIjo > div.styles__CareersBody-sc-tfwrse-6.eaKJBr > div.styles__JobFilters-sc-tfwrse-9.bdOqfk > div:nth-child(1)');
    await delay(1000);
    console.log('✔️ Selecting "All" role...');
    await this.page.evaluate(() => {
      const opt = Array.from(document.querySelectorAll('div[role="option"], li'))
        .find(el => el.textContent.trim().toLowerCase() === 'all');
      if (opt) opt.click();
    });
    await delay(1500);

    console.log('🌍 Opening Location dropdown...');
    await this.page.click('#__next > div > div.styles__CareersContainer-sc-tfwrse-0.cdjIjo > div.styles__CareersBody-sc-tfwrse-6.eaKJBr > div.styles__JobFilters-sc-tfwrse-9.bdOqfk > div:nth-child(2)');
    await delay(1000);
    console.log('✔️ Selecting "India"...');
    await this.page.evaluate(() => {
      const opt = Array.from(document.querySelectorAll('div[role="option"], li'))
        .find(el => el.textContent.trim().toLowerCase() === 'india');
      if (opt) opt.click();
    });
    await delay(2000);

    console.log('🔍 Clicking the Search button...');
    await this.page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('div.styles__JobSearchContainer-sc-tfwrse-7 div'))
        .find(el => el.textContent.trim().toLowerCase() === 'search');
      if (btn) btn.click();
    });
    await delay(4000); // allow search results to load
  }

  async collectAllJobCardLinks() {
    console.log('📋 Collecting job links from job cards...');
    await this.page.waitForSelector('.styles__JobCardContainer-sc-tfwrse-10.fHYFOp a', { timeout: 10000 });

    const links = await this.page.$$eval('.styles__JobCardContainer-sc-tfwrse-10.fHYFOp a', anchors => 
      anchors.map(a => {
        let href = a.getAttribute('href');
        return href.startsWith('http') ? href : `https://glance.com${href}`;
      })
    );

    this.jobLinks.push(...new Set(links));
    console.log(`✅ Total job links collected: ${this.jobLinks.length}`);
  }

//   async extractJobDetailsFromLink(url) {
//     const jobPage = await this.browser.newPage();
//     try {
//       await jobPage.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
//       //await jobPage.waitForSelector('h1', { timeout: 10000 });

//       const details = await jobPage.evaluate(() => {
//         const getText = sel => (document.querySelector(sel) || {}).innerText?.trim() || '';
//         //const meta = getText('p.job-posting-detail--highlight').split('|').map(p => p.trim());
//         return {
//           title: getText('h1.section-header.section-header--large.font-primary'),
//           //team: meta[0] || 'N/A',
//           location: getText('div.job__location > div'),
//           //remoteType: meta[2] || 'N/A',
//           //employmentType: meta[3] || 'N/A',
//           description: getText('div.job__description.body') 
//                        //|| document.body.innerText.slice(0, 500)
//         };
//       });
//       await jobPage.close();
//       return { ...details, url };
//     } catch (err) {
//       await jobPage.close();
//       console.warn(`⚠️ Failed to extract from ${url}:`, err.message);
//       return { title: '', location: '', description: '', url };
//     }
//   }

  async extractJobDetailsFromLink(url) {
    const jobPage = await this.browser.newPage();
        try {
            await jobPage.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            // Wait for the iframe to load
            await jobPage.waitForSelector('#greenhouse-iframe', { timeout: 15000 });

            // Get iframe src
            const iframeSrc = await jobPage.$eval('#greenhouse-iframe', iframe => iframe.src);

            //await jobPage.close();

            // Open iframe URL in a new page
            const iframePage = await this.browser.newPage();
            await iframePage.goto(iframeSrc, { waitUntil: 'networkidle2', timeout: 60000 });

            // Wait for job content inside iframe
            await iframePage.waitForSelector('body > main', { timeout: 10000 });

            const details = await iframePage.evaluate(() => {
            const getText = sel => document.querySelector(sel)?.innerText?.trim() || '';

            const title = getText('body > main > div > div:nth-child(1) > div.job__header > div > h1');
            const location = getText('body > main > div > div:nth-child(1) > div.job__header > div > div');
            const description = getText('body > main > div > div:nth-child(1) > div.job__description.body > div:nth-child(1)');

            return { title, location, description };
            });

            if (!iframePage.isClosed()) await iframePage.close();

            const raw = details.description;

            const extractSection = (start, end) => {
            const regex = new RegExp(`${start}(.*?)${end ? end : '$'}`, 'is');
            const match = raw.match(regex);
            return match ? match[1].trim().replace(/\n{2,}/g, '\n') : '';
            };

            const responsibilities = extractSection('Key Responsibilities'|| 'What we’re looking for' || 'What you will be doing?' || 'Overview of the role');
            const qualifications = extractSection('Required Qualifications' || 'Qualifications' || 'The experience we need');

            return {
                title: details.title,
                location: details.location,
                responsibilities: responsibilities,
                qualifications: qualifications,
                description: (!responsibilities && !qualifications) ? details.description : null,
                url
            };
        } catch (err) {
            await jobPage.close();
            console.warn(`⚠️ Failed to extract from ${url}:`, err.message);
            return { title: '', location: '', description: '', url };
        }
    }


  async processAllJobs() {
    for (let i = 0; i < this.jobLinks.length; i++) {
      console.log(`📝 Processing job ${i + 1}/${this.jobLinks.length}`);
      const job = await this.extractJobDetailsFromLink(this.jobLinks[i]);
      this.allJobs.push(job);
    }
  }

  async saveResults() {
    fs.writeFileSync('glanceJobs.json', JSON.stringify(this.allJobs, null, 2));
    console.log(`💾 Saved ${this.allJobs.length} jobs to glanceJobs.json`);
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
    } catch (err) {
      console.error('❌ Scraper failed:', err);
    } finally {
      await this.close();
    }
  }
}

(async () => {
  const scraper = new GlanceJobsScraper();
  await scraper.run();
})();
