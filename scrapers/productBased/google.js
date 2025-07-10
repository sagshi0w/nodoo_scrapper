import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Custom data extraction function for Google jobs
const extractGoogleData = (job) => {
    if (!job) return job;
    
    // Clean description
    let cleanedDescription = job.description || '';
    if (cleanedDescription) {
        // Remove 'about the job', 'about the role', or similar phrases at the start
        cleanedDescription = cleanedDescription
            .replace(/^(about(\s+(this|the))?\s+(job|role)\s*[:\-]?)\s*/i, '')
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
        company: 'Google',
        //scrapedAt: new Date().toISOString()
    };
};

async function runGoogleScraper() {
  const browser = await puppeteer.launch({
    headless: true,
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
            
            const jobDescription = getText('div.aG5W3');
            const jobQualification = getText('div.KwJkGe');
            const jobResponsibilities = getText('div.BDNOWe');
          
            // Combine into a single job description with clear sections
            const fullJobDescription = `
              ${jobDescription}
              
              **Qualifications:**
              ${jobQualification}
              
              **Responsibilities:**
              ${jobResponsibilities}
            `.trim();
          
            return {
              title: getText('h2.p1N2lc'),
              company: 'Google',
              location: getText('span.r0wTof'),
              description: fullJobDescription,
              url: window.location.href
            };
          });

          if (job.title) {
            const enrichedJob = extractGoogleData(job);
            allJobs.add(JSON.stringify(enrichedJob)); // Keep unique stringified jobs
            console.log(`\u2705 Collected: ${job.title}`);
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
    //fs.writeFileSync('./scrappedJobs/googleJobs.json', JSON.stringify(processedJobArray, null, 2));
    console.log(`\n💾 Saved ${processedJobArray.length} jobs to googleJobs.json`);
    return processedJobArray;
  } catch (error) {
    console.error("❌ Scraping failed:", error);
    await page.screenshot({ path: 'error_final.png' });
  } finally {
    await browser.close();
  }
}

export default runGoogleScraper;

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    await runGoogleScraper();
  })();
}
