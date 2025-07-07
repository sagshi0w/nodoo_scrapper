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

  const baseUrl = 'https://razorpay.com/jobs/jobs-all/';
  let currentPage = 1;

  console.log('🌐 Navigating to Razorpay Careers...');
  await page.goto(baseUrl, { waitUntil: 'networkidle2' });

  while (true) {
    console.log(`\n📄 Scraping Page ${currentPage}`);

    await delay(2000);
    const jobCards = await page.$$('#__next > main > div.container.pt-5.mt-5.styles_faqsearchContainer__vLzvk > div > div.col-md-12.mt-0');

    if (jobCards.length === 0) {
      console.log('🚫 No job cards found. Stopping pagination.');
      break;
    }

    const pageJobLinks = await page.$$eval(
      'a.styles_container__LrNWu',
      anchors => anchors.map(a => a.href)
    );

    console.log(`🔗 Found ${pageJobLinks.length} job links on page ${currentPage}`);
    allJobLinks.push(...pageJobLinks);

    // Try clicking "Load more" button
    const loadMoreBtn = await page.$('div.styles_arrow__RzLZC.styles_right__NhIcm');
    if (loadMoreBtn && currentPage < 8) {
      await loadMoreBtn.click();
      currentPage++;
      await delay(3000);
    } else {
      break;
    }
  }

  // Deduplicate
  const uniqueJobLinks = [...new Set(allJobLinks)];

  // Now scrape each job page
  for (let i = 0; i < uniqueJobLinks.length; i++) {
    const url = uniqueJobLinks[i];
    console.log(`\n🔍 Visiting (${i + 1}/${uniqueJobLinks.length}): ${url}`);

    const jobPage = await browser.newPage();
    try {
        await jobPage.goto(url, { waitUntil: 'networkidle2' });
        await delay(3000);

        // Wait for iframe and access its content
        const iframeHandle = await jobPage.waitForSelector('iframe', { timeout: 10000 });
        const frame = await iframeHandle.contentFrame();

        if (!frame) {
            console.warn(`⚠️ No iframe content loaded for ${jobUrl}`);
            await jobPage.close();
            continue;
        }

      const job = await frame.evaluate(() => {
            const getText = sel => document.querySelector(sel)?.innerText.trim() || '';
            const getHtml = sel => document.querySelector(sel)?.innerHTML.trim() || '';
            
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
      }
    } catch (err) {
      console.warn(`❌ Failed to scrape ${url}: ${err.message}`);
    }
    await jobPage.close();
    await delay(1000);
  }

  fs.writeFileSync('razorpayJobs.json', JSON.stringify(allJobs, null, 2));
  console.log(`\n💾 Saved ${allJobs.length} jobs to razorpayJobs.json`);

  await browser.close();
})();
