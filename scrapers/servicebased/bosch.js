import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class BoschJobsScraper {
    constructor(headless = true) {
        this.headless = headless;
        this.browser = null;
        this.page = null;
        this.allJobLinks = [];
        this.allJobs = [];
    }

    async initialize() {
        this.browser = await puppeteer.launch({
            headless: this.headless,
            args: ['--no-sandbox', ...(this.headless ? [] : ['--start-maximized'])],
            defaultViewport: this.headless ? { width: 1920, height: 1080 } : null
        });
        this.page = await this.browser.newPage();
    }

    async navigateToJobsPage() {
        console.log('🌐 Navigating to Bosch Careers...');
        await this.page.goto('https://careers.smartrecruiters.com/BoschGroup/india', {
            waitUntil: 'networkidle2'
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];
        const existingLinks = new Set();

		let lastCount = 0;
		let stagnantRounds = 0;
		const maxStagnantRounds = 3;
		const maxIterations = 50;
		let iteration = 0;

		while (iteration < maxIterations) {
			iteration++;
			// Collect job links on current viewport
			let jobLinks = await this.page.$$eval('a.link--block.details', anchors => anchors.map(a => a.href));
			if (jobLinks.length === 0) {
				jobLinks = await this.page.$$eval('a.link--block.details', anchors => anchors.map(a => a.href));
			}

			for (const link of jobLinks) {
				if (!existingLinks.has(link)) {
					existingLinks.add(link);
					this.allJobLinks.push(link);
				}
			}

			console.log(`📄 Collected ${this.allJobLinks.length} unique job links so far...`);

			if (this.allJobLinks.length > lastCount) {
				stagnantRounds = 0;
				lastCount = this.allJobLinks.length;
			} else {
				stagnantRounds++;
			}

			// Try expanding grouped sections (SmartRecruiters location groups)
			const groupMoreClicked = await this.page.evaluate(() => {
				const more = document.querySelector('a.link.details-desc.js-more');
				if (more && more.offsetParent !== null) {
					more.click();
					return true;
				}
				return false;
			});

			// Try clicking a Load More button if present
			const clicked = await this.page.evaluate(() => {
				const selectors = [
					'#load_more_jobs',
					'#load_more_jobs2',
					'button.js-load-more',
					'button[data-sr-track="loadMoreJobs"]',
					'button[aria-label="Load more jobs"]',
					'button:has(span:contains("Load more"))'
				];
				for (const sel of selectors) {
					const btn = document.querySelector(sel);
					if (btn && !btn.hasAttribute('disabled') && btn.offsetParent !== null) {
						btn.click();
						return true;
					}
				}
				return false;
			});

			if (!clicked && !groupMoreClicked) {
				// Scroll to bottom to trigger lazy loading
				await this.page.evaluate(() => {
					window.scrollTo(0, document.body.scrollHeight);
				});
			}

			await delay(2000);

			if (stagnantRounds >= maxStagnantRounds) {
				console.log('✅ No new links after multiple attempts. Stopping pagination.');
				break;
			}
		}

        return this.allJobLinks;
    }




    async extractJobDetailsFromLink(url) {
        const jobPage = await this.browser.newPage();
        try {
            await jobPage.goto(url, { waitUntil: 'networkidle2' });
            await delay(5000);
            //await jobPage.waitForSelector('div.job__description.body', { timeout: 10000 });
            const job = await jobPage.evaluate(() => {
                const getText = sel => document.querySelector(sel)?.innerText.trim() || '';

				// Extract job title (prefer SmartRecruiters markup)
				let title = getText('h1.job-title[itemprop="title"]') ||
						getText('h1.job-title') ||
						getText('h2.css-10i6wsd-H2Element') ||
						getText('h1, h2, h3');
				title = title.trim();

				// Extract Location - prefer SmartRecruiters structured data city
				let location = 'Remote'; // default fallback
				
				const getAttr = (sel, attr) => document.querySelector(sel)?.getAttribute(attr)?.trim() || '';
				const srCity = getAttr('li[itemprop="jobLocation"] [itemprop="address"] meta[itemprop="addressLocality"]', 'content');
				if (srCity) {
					location = srCity;
				} else {
					// Try parsing city from formattedaddress
					const formatted = getAttr('li[itemprop="jobLocation"] [itemprop="address"] spl-job-location', 'formattedaddress');
					if (formatted) {
						const parts = formatted.split(',').map(s => s.trim()).filter(Boolean);
						if (parts.length >= 2) {
							location = parts[parts.length - 2];
						} else {
							location = formatted;
						}
					} else {
						// Legacy fallbacks
						const locationIcon = document.querySelector('span[data-icon="LOCATION_OUTLINE"]');
						if (locationIcon) {
							const parent = locationIcon.parentElement;
							if (parent) {
								const locationText = parent.innerText.trim();
								if (locationText && locationText !== locationIcon.innerText) {
									location = locationText;
								} else {
									const nextSibling = locationIcon.nextElementSibling;
									if (nextSibling && nextSibling.innerText) {
										location = nextSibling.innerText.trim();
									}
								}
							}
						}
						if (location === 'Remote') {
							location = getText('.job-location') || 
									getText('.css-zx00c9-StyledIcon') ||
									'Remote';
						}
					}
				}
                
                let experience = '';
                
                // Try to extract experience from description or other elements
                const summaryList = document.querySelector('.cw-summary-list');
                if (summaryList) {
                    const listItems = summaryList.querySelectorAll('li');
                    for (const li of listItems) {
                        const spans = li.querySelectorAll('span');
                        if (spans.length >= 2) {
                            const label = spans[0].innerText.trim();
                            const value = spans[1].innerText.trim();
                            
                            if (label === 'Work Experience') {
                                experience = value;
                            }
                        }
                    }
                }

				// Extract job description (prefer SmartRecruiters structured sections)
				let description = '';
				const srDescRoot = document.querySelector('div.job-sections div[itemprop="description"]');
				if (srDescRoot) {
					const srJobDesc = srDescRoot.querySelector('#st-jobDescription .wysiwyg');
					const srResp = srDescRoot.querySelector('[itemprop="responsibilities"]');
					const srQual = srDescRoot.querySelector('#st-qualifications .wysiwyg, [itemprop="qualifications"]');
					const srAddl = srDescRoot.querySelector('#st-additionalInformation .wysiwyg, [itemprop="incentives"]');
					const parts = [];
					if (srJobDesc && srJobDesc.innerText.trim()) parts.push(srJobDesc.innerText.trim());
					else if (srResp && srResp.innerText.trim()) parts.push(srResp.innerText.trim());
					if (srQual && srQual.innerText.trim()) parts.push('Qualifications:\n' + srQual.innerText.trim());
					if (srAddl && srAddl.innerText.trim()) parts.push('Additional Information:\n' + srAddl.innerText.trim());
					description = parts.filter(Boolean).join('\n\n');
				}
				if (!description.trim()) {
					description = getText('div.ATS_htmlPreview') || getText('div#cw-rich-description');
				}

                return {
                    title,
                    company: 'Bosch',
                    description,
                    location,
                    experience,
                    url: window.location.href
                };
            });

            console.log("Before enriching job=", job);

            await jobPage.close();
            return job;
        } catch (err) {
            await jobPage.close();
            console.warn(`❌ Failed to scrape ${url}: ${err.message}`);
            return null;
        }
    }


    async processAllJobs() {
        for (let i = 0; i < this.allJobLinks.length; i++) {
            const url = this.allJobLinks[i];
            console.log(`📝 [${i + 1}/${this.allJobLinks.length}] Processing: ${url}`);
            const jobData = await this.extractJobDetailsFromLink(url);
            if (jobData && jobData.title) {
                // Ignore jobs with title "Open Roles"
                if (jobData.title.toLowerCase() === "open roles") {
                    console.log(`⛔ Skipping ${jobData.title}`);
                } else {
                    const enrichedJob = extractBoschData(jobData);
                    console.log("After enriching job=", enrichedJob);
                    this.allJobs.push(enrichedJob);
                    console.log(`✅ ${jobData.title}`);
                }
            }
            await delay(1000);
        }
    }

    async saveResults() {
        // fs.writeFileSync('./scrappedJobs/phonepeJobs.json', JSON.stringify(this.allJobs, null, 2));
        console.log(`💾 Saved ${this.allJobs.length} jobs to YashTechnologies.json`);
    }

    async close() {
        await this.browser.close();
    }


    async run() {
        try {
            await this.initialize();
            await this.navigateToJobsPage();
            await this.collectAllJobCardLinks();
            await this.processAllJobs();
            await this.saveResults();
        } catch (error) {
            console.error('❌ Scraper failed:', error);
        } finally {
            await this.close();
        }
    }
}

const extractBoschData = (job) => {
    if (!job) return job;

    let cleanedDescription = job.description || '';
    let experience = job.experience || '';

    if (cleanedDescription) {
        // Remove sections like Job Title, Location, Type, Experience, About Us intro, Why Join Us, About RevenueHero, About Fello
        cleanedDescription = cleanedDescription// Remove About Us intro until next section
            // Existing formatting steps
            .replace(/(\n\s*)(\d+\.\s+)(.*?)(\n)/gi, '\n\n$1$2$3$4')
            .replace(/(\n\s*)([•\-]\s+)(.*?)(\n)/gi, '\n\n$1$2$3$4')
            .replace(/([.!?])\s+/g, '$1  ')
            .replace(/[ \t]+$/gm, '')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/(\S)\n(\S)/g, '$1\n\n$2')
            .trim();

        if (cleanedDescription && !cleanedDescription.endsWith('\n')) {
            cleanedDescription += '\n';
        }

        if (!cleanedDescription.trim()) {
            cleanedDescription = 'Description not available\n';
        }
    } else {
        cleanedDescription = 'Description not available\n';
        console.log('Location:', 'Location not available');
    }





    const expPatterns = [
        /\bminimum\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i,
        /\bmin(?:imum)?\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i,
        /\b(\d{1,2})\s*(?:to|–|-|–)\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i,
        /\b(?:at least|over)\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i,
        /\b(\d{1,2})\s*(?:years|yrs|yr)\s+experience\b/i,
        /\bexperience\s*(?:of)?\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i,
        /\bexperience\s*(?:required)?\s*[:\-]?\s*(\d{1,2})\s*(?:[-to]+)?\s*(\d{1,2})?\s*(?:years|yrs|yr)?/i,
        /\b(\d{1,2})\s*\+\s*(?:years|yrs|yr)\b/i,
    ];

    if (typeof job.experience === 'number' || /^\d+$/.test(job.experience)) {
        const minExp = parseInt(job.experience, 10);
        const maxExp = minExp + 2;
        experience = `${minExp} - ${maxExp} yrs`;
    } else if (typeof job.experience === 'string') {
        for (const pattern of expPatterns) {
            const match = job.experience.match(pattern);
            if (match) {
                const minExp = parseInt(match[1], 10);
                const maxExp = match[2] ? parseInt(match[2], 10) : minExp + 2;
                experience = `${minExp} - ${maxExp} yrs`;
                break;
            }
        }
    }

    // Step 2: Parse experience from description
    if (!experience && cleanedDescription) {
        for (const pattern of expPatterns) {
            const match = cleanedDescription.match(pattern);
            if (match) {
                const min = match[1];
                const max = match[2];

                if (min && max) {
                    experience = `${min} - ${max} yrs`;
                } else if (min && !max) {
                    const estMax = parseInt(min) + 2;
                    experience = `${min} - ${estMax} yrs`;
                }
                break;
            }
        }
    }


    if (job.title && cleanedDescription.startsWith(job.title)) {
        const match = cleanedDescription.match(/Primary Skills\s*[:\-–]?\s*/i);
        if (match) {
            const index = match.index;
            if (index > 0) {
                cleanedDescription = cleanedDescription.slice(index).trimStart();
            }
        }
    }


    return {
        ...job,
        title: job.title?.trim(),
        experience,
        description: cleanedDescription,
    };
};


// ✅ Exportable runner function
const Bosch = async ({ headless = true } = {}) => {
    const scraper = new BoschJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};


export default Bosch;

// ✅ CLI support: node phonepe.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await Bosch({ headless: headlessArg });
    })();
}
