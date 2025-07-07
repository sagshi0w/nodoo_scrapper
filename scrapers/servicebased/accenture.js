const puppeteer = require('puppeteer');
const fs = require('fs');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeAccentureJobs() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: null
  });

  let jobCards = [];
  const page = await browser.newPage();

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

  console.log("🚀 Starting Accenture job scraping...");
  const allJobs = new Set();
  const maxPages = 50;
 
  // Configure selectors
  const SELECTORS = {
    jobCard: '#careersearch-47d6665375 > div.rad-job-search__filters-and-cards > div.rad-job-cards__column > div.rad-job-search__job-cards',
    jobCardLink:'#ATCI-4989168-S1861435_en\.content > div > div.rad-filters-vertical__job-card-content-buttons > a', // Selector for the job title link
    nextPage: '#careersearch-47d6665375 > div.rad-job-search__filters-and-cards > div.rad-job-cards__column > div.rad-pagination.rad-job-search__pagination.rad-pagination--initialized > button.rad-icon-button.rad-icon-button--secondary.rad-pagination__next > div.rad-icon.rad-icon__right',
    jobTitle: '#jobdetail-50e039d074 > div.rad-job-details-hero > h1',
    jobLocation: '#jobdetail-50e039d074 > div.rad-job-details-hero > div.rad-job-details-hero__job-data > div.job-data__row--two > span:nth-child(2) > span',
    jobDescription: '#jobdetail-50e039d074 > div.rad-job-detail'
  };

  try {
    // Step 1: Navigate to careers page
    console.log("🌐 Loading careers page...");
    await page.goto("https://www.accenture.com/in-en/careers/jobsearch?aoi=Artificial%20Intelligence%20(AI)%20%26%20Data%20Science%7CCloud%7CCreative%20%26%20Design%7CCustomer%20%26%20User%20Experience%20%7CEmerging%20Technology%7CEngineering%20%26%20Manufacturing%7CProduct%20Development%7CProgramming%20Languages%7CSoftware%20Engineering%7CSecurity%7CTechnology%20Platforms%7CTechnology", {
      waitUntil: "networkidle2",
      timeout: 1200000
    });
    await delay(3000);

    // Step 3: Pagination loop
    for (let currentPage = 1; currentPage <= maxPages; currentPage++) {
      console.log(`📖 Processing page ${currentPage}/${maxPages}...`);

      // Wait for job cards
      await page.waitForSelector(SELECTORS.jobCard, { timeout: 30000 });
      jobCards = await page.$$(SELECTORS.jobCard);
      console.log(`🃏 Found ${jobCards.length} job cards`);

      // Process each job card
      for (let i = 0; i < jobCards.length; i++) {
        const card = jobCards[i];
        try {
          // Get the job link from the card
          const jobLink = await card.$eval(SELECTORS.jobCardLink, el => el.href);
          
          console.log(`🔗 Opening job details page for job ${i + 1}/${jobCards.length}: ${jobLink}`);
          
          // Open a new tab for the job details
          const jobPage = await browser.newPage();
          await jobPage.goto(jobLink, { waitUntil: 'networkidle2', timeout: 60000 });
          await delay(2000);

          // Extract job details
          const jobInfo = await jobPage.evaluate((selectors) => {
            const getText = (selector) => {
              const el = document.querySelector(selector);
              return el ? el.textContent.trim() : '';
            };

            // Extract all job description fields
            const descriptionFields = {};
            const descriptionElements = document.querySelectorAll(`${selectors.jobDescription} div.row`);
            
            descriptionElements.forEach(el => {
              const label = el.querySelector('h4')?.textContent.trim();
              const value = el.querySelector('div')?.textContent.trim();
              if (label && value) {
                const key = label.toLowerCase()
                  .replace(/[^a-z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
                descriptionFields[key] = value;
              }
            });

            return {
              title: getText(selectors.jobTitle),
              location: getText(selectors.jobLocation),
              jobUrl: window.location.href,
              ...descriptionFields
            };
          }, SELECTORS);

          if (jobInfo.title) {
            allJobs.add(jobInfo);
            console.log(`✅ Collected: ${jobInfo.title}`);
          }

          // Close the job details tab
          await jobPage.close();
          await delay(1000);

        } catch (e) {
          console.error(`⚠️ Error processing job card ${i + 1}:`, e.message);
        }
      }

      // Pagination - go to next page
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
              break; // Exit pagination loop if no more pages
            }
          }
        } catch (e) {
          console.log("⏹️ Pagination failed:", e.message);
          break; // Exit pagination loop if error occurs
        }
      }
    }

    console.log(`✅ Found ${allJobs.size} jobs with complete details`);

    const processedJobIdsArray = [...allJobs];
    fs.writeFileSync("accenture_jobs.json", JSON.stringify(processedJobIdsArray, null, 2));
    console.log("💾 Saved results to accenture_jobs.json");

  } catch (error) {
    console.error("❌ Scraping failed:", error.message);
    await page.screenshot({ path: 'error.png' });
  } finally {
    await browser.close();
  }
}

scrapeAccentureJobs();