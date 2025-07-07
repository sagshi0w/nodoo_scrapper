const puppeteer = require('puppeteer');
const fs = require('fs');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeSiemensJobs() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: null
  });

  let jobCards = [];
  const page = await browser.newPage();

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

  console.log("🚀 Starting Siemens job scraping...");
  const allJobs = new Set();
  const maxPages = 50;
 
  // Configure selectors
  const SELECTORS = {
    searchButton: '#main-container > div > div:nth-child(2) > div > div.col-xs-12.col-sm-12.col-md-4.go-button-container > div > span > button',
    jobCard: '#pcs-body-container > div:nth-child(2) > div.search-results-main-container > div > div.inline-block.position-cards-container > div > div:nth-child(2) > div',
    nextPage: '#pcs-body-container > div:nth-child(2) > div.search-results-main-container > div > div.inline-block.position-cards-container > div > div.iframe-button-wrapper > button',
    jobDetails: '#main-container > div > div > div.position-details > div.row > div.col-md-8.position-job-description-column > div > div:nth-child(2) > div.row.custom-jd-container' // Selector for the detailed fields you want
  };

  try {
    // Step 1: Navigate to careers page
    console.log("🌐 Loading careers page...");
    await page.goto("https://jobs.siemens.com/careers?query=Developer&location=India&pid=563156125003043&domain=siemens.com&sort_by=relevance&location_distance_km=25&triggerGoButton=false&utm_source=j_c_in", {
      waitUntil: "networkidle2",
      timeout: 1200000
    });
    await delay(3000);

    // Step 2: Click search button
    console.log("🔍 Clicking search button...");
    await page.waitForSelector(SELECTORS.searchButton, { visible: true, timeout: 15000 });
    await page.click(SELECTORS.searchButton);
    await delay(5000);

    // Step 3: Pagination loop
    for (let currentPage = 1; currentPage <= maxPages; currentPage++) {
      console.log(`📖 Processing page ${currentPage}/${maxPages}...`);

      // Wait for job cards
      await page.waitForSelector(SELECTORS.jobCard, { timeout: 30000 });
      jobCards = await page.$$(SELECTORS.jobCard);
      console.log(`🃏 Found ${jobCards.length} job cards`);

      // Pagination
      if (currentPage < maxPages) {
        try {
          const nextButton = await page.$(SELECTORS.nextPage);
          if (nextButton) {
            const isDisabled = await page.evaluate(btn => btn.disabled, nextButton);
            if (!isDisabled) {
              console.log("⏭️ Clicking next page...");
              await nextButton.click();
              await page.waitForSelector(SELECTORS.jobCard, { timeout: 30000 });
              await delay(3000);
            } else {
              console.log("⏹️ No more pages available");
            }
          }
        } catch (e) {
          console.log("⏹️ Pagination failed:", e.message);
        }
      }
    }

    // Process each job card
    for (let i = 0; i < jobCards.length; i++) {
      const card = jobCards[i];
      try {
      // Click the job card button to reveal details
      console.log(`🖱️ Clicking job card ${i + 1}/${jobCards.length}`);
      await card.click();
      await delay(2000); // Wait for details to appear

          // Extract all the detailed fields you want
          const jobInfo = await page.evaluate((detailsSelector) => {
            const fields = {};
            const elements = document.querySelectorAll(detailsSelector);
            
            elements.forEach(el => {
              const label = el.querySelector('h4')?.textContent.trim();
              const value = el.querySelector('div')?.textContent.trim();
              if (label && value) {
                // Convert labels to camelCase for consistent property names
                const key = label.toLowerCase()
                  .replace(/[^a-z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
                fields[key] = value;
              }
            });

            // Get standard job info
            return {
              title: document.querySelector('.position-title')?.textContent.trim(),
              location: document.querySelector('.position-location')?.textContent.trim(),
              jobDescription: document.querySelector('h4, .position-job-description-column')?.textContent.trim(),
              applyUrl: window.location.href,
              ...fields
            };
          }, SELECTORS.jobDetails);

          if (jobInfo.title) {
            allJobs.add(jobInfo);
            console.log(`✅ Collected: ${jobInfo.title}`);
          }

          // Close the job details (if needed)
          const closeButton = await page.$('[data-ph-at-id="close-button"]');
          if (closeButton) {
            await closeButton.click();
            await delay(500);
          }

        } catch (e) {
          console.error(`⚠️ Error processing job card ${i + 1}:`, e.message);
        }
    }

    if (allJobs.size === 0) throw new Error("No jobs found");

    // Remove duplicate jobs.
    //const uniqueJobs = allJobs.filter((job, index, self) =>
        //index === self.findIndex(j => (
            //j.title === job.title
        //))
    //);

    //console.log(`🔄 Removed ${allJobs.length - uniqueJobs.length} duplicate jobs`);
    console.log(`✅ Found ${allJobs.size} jobs with complete details`);

    const processedJobIdsArray = [...allJobs];

    fs.writeFileSync("siemens_jobs_devloper.json", JSON.stringify(processedJobIdsArray, null, 2));
    console.log("💾 Saved results to siemens_jobs_devloper.json");

  } catch (error) {
    console.error("❌ Scraping failed:", error.message);
    await page.screenshot({ path: 'error.png' });
  } finally {
    await browser.close();
  }
}

scrapeSiemensJobs();