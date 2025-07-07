const puppeteer = require('puppeteer');
const fs = require('fs');

const delay = ms => new Promise(res => setTimeout(res, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--start-maximized'],
    defaultViewport: null
  });

  const page = await browser.newPage();
  const allJobLinks = [];
  const allJobs = [];

  const baseUrl = 'https://www.phonepe.com/careers/job-openings/';
  let currentPage = 1;

  console.log('🌐 Navigating to PhonePe Careers...');
  await page.goto(baseUrl, { waitUntil: 'networkidle2' });

  console.log(`\n📄 Scraping Page ${currentPage}`);

  await delay(2000);

  // 📌 Make sure job cards exist
  const jobCardsExist = await page.$('a.card');
  if (!jobCardsExist) {
    console.error('🚫 No job cards found on the page!');
    await browser.close();
    return;
  }

  // 🔗 Collect all job links
  const pageJobLinks = await page.$$eval('a.card', anchors =>
    anchors
        .map(a => a.href)
        .filter(href => href.includes('/phonepe/jobs'))
    );

  console.log(`🔗 Found ${pageJobLinks.length} job links on page ${currentPage}`);
  allJobLinks.push(...pageJobLinks);

  const uniqueJobLinks = [...new Set(allJobLinks)];  

  // 🔍 Visit each job link
  for (let i = 0; i < uniqueJobLinks.length; i++) {
    const url = uniqueJobLinks[i];
    console.log(`\n🔍 Visiting (${i + 1}/${uniqueJobLinks.length}): ${url}`);

    const jobPage = await browser.newPage();
    try {
      await jobPage.goto(url, { waitUntil: 'networkidle2' });
      await delay(3000);

      // ⚠️ Wait for job description container
      await jobPage.waitForSelector('div.job__description.body', { timeout: 10000 });

      const job = await jobPage.evaluate(() => {
        const getText = sel => document.querySelector(sel)?.innerText.trim() || '';
        return {
          title: getText('h1'),
          location: getText('.job__location') || 'Not specified',
          description: getText('.job__description.body'),
          applyUrl: window.location.href
        };
      });

      if (job.title) {
        allJobs.push(job);
        console.log(`✅ Collected: ${job.title}`);
      } else {
        console.warn(`⚠️ No title found for ${url}`);
      }

    } catch (err) {
      console.warn(`❌ Failed to scrape ${url}: ${err.message}`);
    }

    await jobPage.close();
    await delay(1000);
  }

  // 💾 Save jobs to file
  fs.writeFileSync('phonepeJobs.json', JSON.stringify(allJobs, null, 2));
  console.log(`\n💾 Saved ${allJobs.length} jobs to phonepeJobs.json`);

  await browser.close();
})();
