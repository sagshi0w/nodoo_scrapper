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
  const allJobs = [];

  // Navigate to Uber careers page with filters
  await page.goto('https://www.uber.com/us/en/careers/list/?query=developer%2C%20cloud%2C%20engineering%2C%20technology%2C%20ML%2C%20success%2C%20frontend%2C%20backend%2C%20design%2C%20devops%2C%20fullstack%2C%20ui%2C%20ux%2C%20cyber%20security%2C%20blockchain%2C&location=IND-Karnataka-Bangalore&location=IND-Telangana-Hyderabad&location=IND-Haryana-Gurgaon&location=IND-West%20Bengal-Kolkata', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  let pageCount = 1;
  let hasNext = true;

  // First, paginate through all pages to collect all job links
  const allJobLinks = new Set();

  console.log('⏳ Collecting all job links...');
  while (hasNext) {
    try {
      await page.waitForSelector('span.css-dCwqLp > a.css-fYOjwv', { timeout: 15000 });

      // Collect job links from current page
      const currentPageLinks = await page.$$eval('span.css-dCwqLp > a.css-fYOjwv', links => 
        links.map(link => {
          const href = link.getAttribute('href');
          return href.startsWith('http') ? href : `https://www.uber.com${href}`;
        })
      );

      currentPageLinks.forEach(link => allJobLinks.add(link));
      console.log(`📄 Page ${pageCount}: Collected ${currentPageLinks.length} job links`);

      // Try to click next page button
      const nextButton = await page.$('#main > div:nth-child(2) > div > div > div > div > div:nth-child(5) > button');
      if (nextButton) {
        await nextButton.evaluate(btn => btn.scrollIntoView({ block: 'center', behavior: 'smooth' }));
        await delay(1000 + Math.random() * 2000); // Random delay
        
        // Get current job IDs for comparison
        const currentJobIds = await page.$$eval('span.css-dCwqLp > a.css-fYOjwv', links => 
          links.map(link => link.getAttribute('href').split('/').pop())
        );
        
        await Promise.all([
          page.waitForResponse(response => 
            response.url().includes('careers') && response.status() === 200
          ),
          nextButton.click()
        ]);
        
        // Wait for job list to update
        await page.waitForFunction(
          (selector, oldIds) => {
            const newIds = Array.from(document.querySelectorAll(selector))
              .map(link => link.getAttribute('href').split('/').pop());
            return JSON.stringify(newIds) !== JSON.stringify(oldIds);
          },
          { timeout: 20000 },
          'span.css-dCwqLp > a.css-fYOjwv',
          currentJobIds
        );
        
        pageCount++;
      } else {
        console.log('🚫 No more pages found');
        hasNext = false;
      }
    } catch (err) {
      console.warn('⚠️ Error during pagination:', err.message);
      hasNext = false;
    }
  }

  console.log(`✅ Collected ${allJobLinks.size} total job links`);

  // Now process all collected job links
  console.log('⏳ Processing job details...');
  const jobArray = Array.from(allJobLinks);
  for (let i = 0; i < jobArray.length; i++) {
    const jobUrl = jobArray[i];
    const jobPage = await browser.newPage();
    
    try {
      await jobPage.goto(jobUrl, { waitUntil: 'networkidle2' });
      await delay(1000 + Math.random() * 1000); // Random delay

      // Extract job data
      const job = await jobPage.evaluate(() => {
        const tx = sel => document.querySelector(sel)?.textContent?.trim() || '';
        return {
          title: tx('h1.css-huLrFc'),
          location: tx('div.css-ghtRay'),
          description: tx('div.css-cvJeNJ'),
          qualifications: Array.from(document.querySelectorAll('div.css-cvJeNJ li')).map(li => li.textContent.trim()),
          url: window.location.href,
          postedDate: tx('div.css-jzly5o') // Example for posted date if available
        };
      });

      if (job.title) {
        allJobs.push(job);
        console.log(`✅ [${i+1}/${jobArray.length}] ${job.title} - ${job.location}`);
      }

    } catch (err) {
      console.error(`❌ Error scraping job ${i + 1}:`, err.message);
    } finally {
      await jobPage.close();
    }
  }

  // Save results
  fs.writeFileSync('uber_jobs.json', JSON.stringify(allJobs, null, 2));
  console.log(`💾 Saved ${allJobs.length} jobs to uber_jobs.json`);

  await browser.close();
})();