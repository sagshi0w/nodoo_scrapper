const puppeteer = require('puppeteer');
const fs = require('fs');
const delay = ms => new Promise(res => setTimeout(res, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: false, args: ['--start-maximized'] });
  const page = await browser.newPage();
  await page.goto('https://careers.smartrecruiters.com/Freshworks', { waitUntil: 'networkidle2' });

  await delay(3000); // Let all job cards render

  console.log('⏳ Loading all jobs by clicking "Show more jobs"...');
    while (true) {
    const showMoreButton = await page.$('a.js-more');
    if (!showMoreButton) break;

    await Promise.all([
        page.waitForResponse(res => res.url().includes('smartrecruiters.com') && res.status() === 200),
        showMoreButton.click()
    ]);

    await delay(2000); // Give time for jobs to load
    }
    console.log('✅ All jobs loaded!');

  console.log('📥 Collecting job URLs...');
  const jobUrls = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a.link--block.details'))
      .map(link => link.href);
  });

  console.log(`🔗 Found ${jobUrls.length} job URLs`);

  const allJobs = [];

  for (let i = 0; i < jobUrls.length; i++) {
    const jobUrl = jobUrls[i];
    console.log(`🔍 Processing job ${i + 1}/${jobUrls.length}: ${jobUrl}`);

    const jobPage = await browser.newPage();
    try {
      await jobPage.goto(jobUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      await delay(2000);

      const jobData = await jobPage.evaluate(() => {
        const getText = (sel) => document.querySelector(sel)?.innerText.trim() || '';

        const title = getText('h1.job-title');
        const description = getText('div.job-sections');

        return {
          title,
          description,
          url: window.location.href
        };
      });

      const location = await jobPage.$eval('spl-job-location', el => el.getAttribute('formattedaddress'));

      if(location && location.includes('India')){
        jobData.location = location;
        jobData.url = jobUrl;
        allJobs.push(jobData);
        console.log(`✅ Done: ${jobData.title}`);
      }
    } catch (err) {
      console.warn(`⚠️ Failed to process ${jobUrl}: ${err.message}`);
    }

    await jobPage.close();
    await delay(1000);
  }

  fs.writeFileSync('freshworks_jobs.json', JSON.stringify(allJobs, null, 2));
  console.log(`💾 Saved ${allJobs.length} jobs to freshworks_jobs.json`);

  await browser.close();
})();
