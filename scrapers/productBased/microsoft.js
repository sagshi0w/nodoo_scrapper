const puppeteer = require('puppeteer');
const fs = require('fs');

const delay = ms => new Promise(res => setTimeout(res, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox'],
    defaultViewport: null
  });

  const page = await browser.newPage();
  const allJobs = new Set();

  await page.goto('https://jobs.careers.microsoft.com/global/en/search?lc=India', {
    waitUntil: 'networkidle2'
  });

  let pageCount = 1, hasNext = true;

  while (hasNext) {
    console.log(`\n📄 Page ${pageCount}`);
    await page.waitForSelector('div.ms-List-page', { timeout: 60000 });

    let jobCards = await page.$$('div.ms-List-cell');
    console.log(`🃏 Found ${jobCards.length} jobs`);

    for (let i = 0; i < jobCards.length; i++) {
      try {
        jobCards = await page.$$('div.ms-List-cell'); // refresh reference
        await jobCards[i].click();
        await page.waitForSelector('h1', { timeout: 60000 });
        await delay(2000);

        const job = await page.evaluate(() => {
          const tx = s => document.querySelector(s)?.innerText.trim() || '';
          return {
            title: tx('h1'),
            location: tx('p'),
            qualifications: tx('div.WzU5fAyjS4KUVs1QJGcQ'),
            responsibilities: tx('div.fcUffXZZoGt8CJQd8GUl'),
            url: window.location.href
          };
        });

        if (job.title) {
          allJobs.add(JSON.stringify(job));
          console.log(`✅ ${job.title}`);
        }

        await page.goBack({ waitUntil: 'networkidle2' });
        await delay(1000);
      } catch (err) {
        console.error(`❌ Job ${i + 1} failed:`, err.message);
        await page.goBack({ waitUntil: 'networkidle2' }).catch(() => {});
        await delay(1000);
      }
    }

    // Navigate to next page using more reliable wait
    const nextBtn = await page.$('button[aria-label="Go to next page"]');
    if (nextBtn) {
      const previousJobCount = (await page.$$('div.M9jNOkq94Xdh7PlzI0v4')).length;

      await nextBtn.click();
      console.log("➡️ Going to next page...");

      try {
        await page.waitForFunction(
          (selector, prevCount) =>
            document.querySelectorAll(selector).length !== prevCount,
          { timeout: 60000 },
          'div.M9jNOkq94Xdh7PlzI0v4',
          previousJobCount
        );
        pageCount++;
      } catch (err) {
        console.warn("⚠️ Timeout waiting for next page job cards");
        hasNext = false;
      }
    } else {
      console.log("🚫 No more pages.");
      hasNext = false;
    }
  }

  fs.writeFileSync('amazon_jobs.json', JSON.stringify([...allJobs].map(j => JSON.parse(j)), null, 2));
  console.log(`💾 Saved ${allJobs.size} jobs to amazon_jobs.json`);

  await browser.close();
})();
