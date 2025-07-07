const puppeteer = require('puppeteer');
const fs = require('fs');

const delay = ms => new Promise(res => setTimeout(res, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox', '--start-maximized'], defaultViewport: null });
  const page = await browser.newPage();

  const jobIds = [];
  const allJobs = [];

  async function collectJobIds() {
    console.log('🌐 Navigating to job listings...');
    await page.goto('https://careers.swiggy.com/#/careers', { waitUntil: 'networkidle2' });
    await page.waitForSelector('iframe#mnhembedded', { timeout: 15000 });
    const iframeHandle = await page.$('iframe#mnhembedded');
    const frame = await iframeHandle.contentFrame();

    let pageCount = 1;
    const nextBtnSelector = 'ul.pagination li:last-child a';

    while (true) {
      console.log(`📄 Processing page ${pageCount}...`);
      await frame.waitForSelector('tr.mnh-jobs-table-row', { timeout: 10000 });
      const ids = await frame.$$eval('tr.mnh-jobs-table-row td span.mnh_req_id', spans => spans.map(span => span.textContent.trim()));
      jobIds.push(...ids);

      const nextBtn = await frame.$(nextBtnSelector);
      if (!nextBtn) break;

      const isDisabled = await nextBtn.evaluate(el => el.closest('li').classList.contains('disabled'));
      if (isDisabled) break;

      await nextBtn.click();
      await delay(2000);
      pageCount++;
    }

    console.log(`✅ Collected ${jobIds.length} job IDs.`);
  }

  async function processJobs() {
    for (let i = 0; i < jobIds.length; i++) {
      const jobId = jobIds[i];
      console.log(`🔍 Searching for Job ID: ${jobId}`);

      const jobPage = await browser.newPage();
      await jobPage.goto(`https://swiggy.mynexthire.com/employer/jobs/careers#?src=careers&amp;page=careers`, { waitUntil: 'networkidle2' });

      // Fill search input
      await jobPage.waitForSelector('body > div > div > div:nth-child(3) > div > h4 > div > input', { visible: true });
      await jobPage.type('body > div > div > div:nth-child(3) > div > h4 > div > input', jobId, { delay: 100 });

      // Click Search button
      //await jobPage.click('button.search_btn.home-serachbox-btn');
      console.log('✅ Search button clicked');

      // Wait for iframe to reload
      //await jobPage.waitForSelector('iframe#mnhembedded', { timeout: 15000 });
      //const iframeHandle = await jobPage.$('iframe#mnhembedded');
      //if (!iframeHandle) {
        //console.warn(`⚠️ iframe not found for Job ID ${jobId}`);
        //await jobPage.close();
        //continue;
      //}

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

      const jobFramePage = await browser.newPage();
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
            url: window.location.href
          };
        });

        console.log(`✅ Collected: ${jobData.title}`);
        allJobs.push(jobData);
      } catch (err) {
        console.warn(`⚠️ Failed to process Job ID ${jobId}: ${err.message}`);
      }

      await jobFramePage.close();
      await jobPage.close();
      await delay(1000);
    }
  }


  async function saveResults() {
    fs.writeFileSync('swiggy_jobs.json', JSON.stringify(allJobs, null, 2));
    console.log(`💾 Saved ${allJobs.length} jobs to swiggy_jobs.json`);
  }

  try {
    await collectJobIds();
    await processJobs();
    await saveResults();
  } catch (err) {
    console.error('❌ Scraper failed:', err);
  } finally {
    await browser.close();
  }
})();
