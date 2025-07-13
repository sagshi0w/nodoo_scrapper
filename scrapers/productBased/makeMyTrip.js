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
    const allJobs = [];
    const visitedLinks = new Set();

    console.log('🌐 Navigating to MakeMyTrip Careers...');
    const baseUrl = 'https://careers.makemytrip.com/prod/jobs';
    await page.goto(baseUrl, { waitUntil: 'networkidle2' });
    await delay(3000);

    // 🔁 Click "Load More" button until it disappears
    while (true) {
        try {
            const loadMoreBtn = await page.$('span.load-more-BTN');
            if (!loadMoreBtn) {
                console.log('✅ All job cards are loaded.');
                break;
            }
            console.log('⏳ Clicking Load More...');
            await loadMoreBtn.click();
            await delay(3000);
        } catch (err) {
            console.warn('⚠️ Load More button error or no longer available:', err.message);
            break;
        }
    }

    // 🔗 Collect all job card links
    const jobLinks = await page.$$eval('a.bs-card.typ-opening-card', anchors =>
        anchors.map(a => a.href).filter(href => href.includes('/prod/opportunity/'))
    );

    console.log(`🔗 Found ${jobLinks.length} unique job links`);

    // 📝 Visit each job detail page
    for (let i = 0; i < jobLinks.length; i++) {
        const url = jobLinks[i];
        if (visitedLinks.has(url)) continue;
        visitedLinks.add(url);

        console.log(`\n🔍 Visiting (${i + 1}/${jobLinks.length}): ${url}`);
        const jobPage = await browser.newPage();

        try {
            await jobPage.goto(url, { waitUntil: 'networkidle2' });
            await delay(3000);

            await jobPage.waitForSelector('h2', { timeout: 10000 });

            const job = await jobPage.evaluate(() => {
                const getText = sel => document.querySelector(sel)?.innerText.trim() || '';
                return {
                    title: getText('h2'),
                    fullDescription: getText('div.jobDescContainer'),
                    applyUrl: window.location.href
                };
            });

            if (job.title) {
                const structuredFields = extractJobSections(job.fullDescription);

                allJobs.push({
                    title: job.title,
                    //     role: structuredFields.role,
                    location: structuredFields.location,
                    //     experience: structuredFields.experience,
                    //     aboutFunction: structuredFields.aboutFunction,
                    //     whatYouWillBeDoing: structuredFields.whatYouWillBeDoing,
                    //     qualificationAndExperience: structuredFields.qualificationAndExperience,
                    applyUrl: job.applyUrl
                });

                //allJobs.push(job);

                console.log(`✅ Collected: ${job.title}`);
            } else {
                console.warn(`⚠️ No title found at ${url}`);
            }
        } catch (err) {
            console.warn(`❌ Failed to scrape ${url}: ${err.message}`);
        }

        await jobPage.close();
        await delay(1000);
    }

    function extractJobSections(fullDescription) {
        const result = {};

        //const roleMatch = fullDescription.match(/Role:\s*(.+)/);
        const locationMatch = fullDescription.match(/Location:\s*(.+)/);
        //const experienceMatch = fullDescription.match(/Years of Experience:\s*(.+)/);

        //const aboutFuncMatch = fullDescription.match(/About the function:\s*([\s\S]*?)\n\nWhat you.*doing:/i);
        //const doingMatch = fullDescription.match(/What you.*doing:\s*([\s\S]*?)\n\nWhat you.*bring to the table:/i);
        //const qualificationMatch = fullDescription.match(/(?:What you.*bring to the table|Qualification & Experience):\s*([\s\S]*?)(?:\n\n|What Makes Us Awesome\?)/i);

        //result.role = roleMatch ? roleMatch[1].trim() : '';
        //result.location = locationMatch ? locationMatch[1].trim() : '';
        //result.experience = experienceMatch ? experienceMatch[1].trim() : '';
        //result.aboutFunction = aboutFuncMatch ? aboutFuncMatch[1].trim() : '';
        //result.whatYouWillBeDoing = doingMatch ? doingMatch[1].trim() : '';
        //result.qualificationAndExperience = qualificationMatch ? qualificationMatch[1].trim() : '';

        return result;
    }

    // 💾 Save to file
    fs.writeFileSync('makeMyTripJobs.json', JSON.stringify(allJobs, null, 2));
    console.log(`\n💾 Saved ${allJobs.length} jobs to makeMyTripJobs.json`);

    await browser.close();
})();
