const puppeteer = require('puppeteer');
const fs = require('fs');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeGoogleJobs() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: null
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  );

  const allJobs = new Set();

  const SELECTORS = {
    jobCards: 'li.lLd3Je, div[role="listitem"], [jsname="jqKNec"]',
    learnMore: 'a[aria-label^="Learn more about"]',
    jobTitle: 'h3.QJPWVe',
    company: 'span.RP7SMd',
    jobLocation: 'div[itemprop="jobLocation"], div.r0wTof, [jsname="K4r5Ff"]',
    jobDescription: 'div[itemprop="description"], div.aG5W3, [jsname="Yr7Kod"]',
    qualifications: 'div[aria-label*="qualifications"] + div, div.KwJkGe, [jsname="Rq5Gcb"]',
    responsibilities: 'div[aria-label*="responsibilities"] + div, div.BDNOWe, [jsname="t5nFfc"]',
    backButton: 'a.WpHeLc VfPpkd-mRLv6',
    nextButton: 'a.WpHeLc.VfPpkd-mRLv6[jsname="hSRGPd"][aria-label="Go to next page"][href*="/jobs/results/"]'
  };

  try {
    let pageCount = 1;
    let hasNextPage = true;

    console.log("🌐 Navigating to Google Careers...");
    await page.goto('https://www.google.com/about/careers/applications/jobs/results?location=India', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    while (hasNextPage) {
      console.log(`\n📄 Scraping Page ${pageCount}`);

      await page.waitForSelector(SELECTORS.jobCards, { timeout: 30000 });
      const jobCards = await page.$$(SELECTORS.jobCards);
      console.log(`🃏 Found ${jobCards.length} job cards on page ${pageCount}`);

      const learnMoreLinks = await page.$$eval(
        SELECTORS.learnMore,
        anchors => anchors.map(a => a.href)
      );

      console.log(`🔗 Collected ${learnMoreLinks.length} job links`);

      for (let i = 0; i < learnMoreLinks.length; i++) {
        const jobUrl = learnMoreLinks[i];
        try {
          await page.goto(jobUrl, { waitUntil: 'networkidle2' });
          await delay(3000);

          const job = await page.evaluate(() => {
            const getText = sel => document.querySelector(sel)?.textContent.trim() || '';
            return {
              title: getText('h2.p1N2lc'),
              location: getText('span.r0wTof'),
              jobDescription: getText('div.aG5W3'),
              jobQualification: getText('div.KwJkGe'),
              jobResponsibilities: getText('div.BDNOWe'),
              applyUrl: window.location.href
            };
          });

          if (job.title) {
            allJobs.add(JSON.stringify(job)); // Keep unique stringified jobs
            console.log(`✅ Collected: ${job.title}`);
          }
        } catch (err) {
          console.error(`❌ Failed on job ${i + 1}: ${err.message}`);
        }
      }

      // Try navigating to the next page manually via URL
      pageCount++;
      const nextPageUrl = `https://www.google.com/about/careers/applications/jobs/results?location=India&page=${pageCount}`;
      await page.goto(nextPageUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      await delay(2000);

      const nextButtonExists = await page.$(SELECTORS.jobCards);
      if (!nextButtonExists) {
        console.log("🚫 No more jobs/pages found. Ending.");
        hasNextPage = false;
      }
    }

    const processedJobArray = [...allJobs].map(j => JSON.parse(j));
    fs.writeFileSync('google_jobs.json', JSON.stringify(processedJobArray, null, 2));
    console.log(`\n💾 Saved ${processedJobArray.length} jobs to google_jobs.json`);

  } catch (error) {
    console.error("❌ Scraping failed:", error);
    await page.screenshot({ path: 'error_final.png' });
  } finally {
    await browser.close();
  }
}

scrapeGoogleJobs();
