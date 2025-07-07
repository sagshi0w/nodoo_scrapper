const puppeteer = require('puppeteer');
const fs = require('fs');
const delay = ms => new Promise(res => setTimeout(res, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: false, args: ['--start-maximized'] });
  const page = await browser.newPage();
  await page.goto('https://www.zoho.com/careers/', { waitUntil: 'networkidle2' });
  await delay(3000); // Wait for job cards to load

  console.log('📥 Collecting job URLs...');
  const jobUrls = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('li.rec-job-title a'))
      .map(link => link.href)
      //.filter(href => href.includes('/careers/jobdescription/')); // ensure valid job links
  });

  console.log(`🔗 Found ${jobUrls.length} job URLs`);

  const allJobs = [];

  for (let i = 0; i < jobUrls.length; i++) {
    const jobUrl = jobUrls[i];
    if (!jobUrl) {
      console.warn(`⚠️ Skipping invalid URL at index ${i}`);
      continue;
    }

    console.log(`🔍 Processing job ${i + 1}/${jobUrls.length}: ${jobUrl}`);

    const jobPage = await browser.newPage();
    try {
      await jobPage.goto(jobUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      await delay(2000);

      const jobData = await jobPage.evaluate(() => {
        const getText = sel => document.querySelector(sel)?.innerText.trim() || '';

        return {
          title: getText('#data_title'),
          location: getText('em#data_country'),
          description: getText('div#jobdescription_data > span#spandesc'),
          url: window.location.href
        };
      });

      if (jobData.title) {
        allJobs.push(jobData);
        console.log(`✅ Done: ${jobData.title}`);
      }
    } catch (err) {
      console.warn(`⚠️ Failed to process ${jobUrl}: ${err.message}`);
    }

    await jobPage.close();
    await delay(1000);
  }

  fs.writeFileSync('zohoJobs.json', JSON.stringify(allJobs, null, 2));
  console.log(`💾 Saved ${allJobs.length} jobs to zohoJobs.json`);

  await browser.close();
})();
