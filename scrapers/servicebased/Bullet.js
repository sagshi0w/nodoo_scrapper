import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class BulletJobsScraper {
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
        console.log('🌐 Navigating to Bullet Careers...');
        await this.page.goto('https://www.bulletshorts.com/career', {
            waitUntil: 'networkidle2'
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];
        const existingLinks = new Set();

        // Wait for the page to fully load
        await delay(3000);
        
        // Debug: Check if elements exist
        const elementCount = await this.page.$$eval(`a[data-framer-name="tab"]`, elements => elements.length);
        console.log(`🔍 Found ${elementCount} job link elements on page`);

        while (true) {
            // Collect job links on current page - try multiple selectors
            let jobLinks = await this.page.$$eval(`a[data-framer-name="tab"]`, anchors =>
                anchors.map(a => a.href)
            );

            // Fallback selector if primary doesn't work
            if (jobLinks.length === 0) {
                console.log("🔄 Trying fallback selector...");
                jobLinks = await this.page.$$eval(`a.framer-KqJUe`, anchors =>
                    anchors.map(a => a.href)
                );
            }

            console.log(`🔗 Raw job links found: ${jobLinks.length}`);
            console.log(`🔗 Sample links:`, jobLinks.slice(0, 3));

            for (const link of jobLinks) {
                if (!existingLinks.has(link)) {
                    existingLinks.add(link);
                    this.allJobLinks.push(link);
                }
            }

            console.log(`📄 Collected ${this.allJobLinks.length} unique job links so far...`);

            // Check if "Load More" button exists (fresh query every loop)
            const loadMoreExists = await this.page.$('#load_more_jobs2');
            if (!loadMoreExists) {
                console.log("✅ No more pages found. Pagination finished.");
                break;
            }

            // console.log("➡️ Clicking Load More...");
            // await this.page.click('#load_more_jobs');

            // ⏳ Wait for new jobs to load
            // await this.page.waitForFunction(
            //     (prevCount) => {
            //         return document.querySelectorAll("h5 > a").length > prevCount;
            //     },
            //     {},
            //     jobLinks.length
            // );

            // // Optional: small delay to stabilize
            // await delay(5000);
        }

        return this.allJobLinks;
    }

    cleanJobDescription(job) {
        if (!job || !job.description) return job;
        
        const cleanedDescription = this.cleanDescriptionText(job.description);
        
        return {
            ...job,
            description: cleanedDescription
        };
    }

    cleanDescriptionText(description, company = 'Bullet') {
        if (!description) return 'Description not available\n';
        
        let cleaned = description.trim();
        
        // 1. Remove company boilerplate and promotional text
        cleaned = cleaned
            // Remove company intro paragraphs
            .replace(/^[^.]*We're scaling[^.]*\.\s*/gi, '')
            .replace(/^[^.]*strives to hire[^.]*\.\s*/gi, '')
            .replace(/^[^.]*currently seeking[^.]*\.\s*/gi, '')
            .replace(/^[^.]*looking for[^.]*\.\s*/gi, '')
            
            // Remove promotional content
            .replace(/We want someone who's hungry[^.]*\./gi, '')
            .replace(/If you know how to test[^.]*\./gi, '')
            .replace(/this is your playground[^.]*\./gi, '')
            .replace(/let's talk[^.]*\./gi, '');
        
        // 2. Standardize section headers
        cleaned = cleaned
            .replace(/🎯\s*What you'll own:\s*/gi, '\n\nResponsibilities:\n')
            .replace(/🧰\s*Stack you'll vibe with:\s*/gi, '\n\nTechnical Stack:\n')
            .replace(/Key Responsibilities?:\s*/gi, '\n\nResponsibilities:\n')
            .replace(/Qualifications and Skills?:\s*/gi, '\n\nRequirements:\n')
            .replace(/Qualifications\s*[–-]\s*/gi, '\n\nQualifications:\n')
            .replace(/Skills Required:\s*/gi, '\n\nSkills:\n')
            .replace(/Technical Skills:\s*/gi, '\n\nTechnical Skills:\n')
            .replace(/Key Competencies?:\s*/gi, '\n\nKey Competencies:\n')
            .replace(/What you'll do:\s*/gi, '\n\nResponsibilities:\n')
            .replace(/Must Have:\s*/gi, '\n\nRequirements:\n')
            .replace(/Required Skills:\s*/gi, '\n\nSkills:\n')
            .replace(/Essential Skills:\s*/gi, '\n\nSkills:\n');
        
        // 3. Standardize bullet points and formatting
        cleaned = cleaned
            // Convert various bullet styles to consistent format
            .replace(/^[\s]*[•·▪▫‣⁃]\s*/gm, '• ')
            .replace(/^[\s]*[-–—]\s*/gm, '• ')
            .replace(/^[\s]*\*\s*/gm, '• ')
            .replace(/^[\s]*\d+\.\s*/gm, (match) => match.trim() + ' ')
            
            // Fix spacing around bullet points
            .replace(/\n\s*•\s*/g, '\n• ')
            .replace(/\n\s*(\d+\.\s)/g, '\n$1')
            
            // Clean up excessive whitespace
            .replace(/\n{3,}/g, '\n\n')
            .replace(/[ \t]+$/gm, '')
            .replace(/\n\s*\n/g, '\n\n');
        
        // 4. Structure the content better
        const sections = this.extractSections(cleaned);
        cleaned = this.restructureContent(sections);
        
        // 5. Final cleanup
        cleaned = cleaned
            .replace(/^\s+|\s+$/g, '') // trim start/end
            .replace(/\n{3,}/g, '\n\n') // max 2 consecutive newlines
            .replace(/([.!?])\s*\n\s*([A-Z])/g, '$1\n\n$2') // proper paragraph breaks
            .replace(/[\n\r\t]+/g, '\n') // normalize line breaks
            .replace(/[^\x20-\x7E\n]+/g, '') // remove non-printable chars
            .trim();
        
        return cleaned + '\n';
    }

    extractSections(text) {
        const sections = {
            overview: '',
            responsibilities: [],
            requirements: [],
            skills: [],
            technicalStack: []
        };
        
        // Extract overview (first paragraph)
        const overviewMatch = text.match(/^([^•\n]+?)(?=\n\n|Responsibilities|Requirements|Skills|Technical Stack)/s);
        if (overviewMatch) {
            sections.overview = overviewMatch[1].trim();
        }
        
        // Extract responsibilities
        const respMatch = text.match(/Responsibilities?:\s*\n((?:•[^\n]+\n?)+)/i);
        if (respMatch) {
            sections.responsibilities = respMatch[1]
                .split('\n')
                .filter(line => line.trim().startsWith('•'))
                .map(line => line.replace(/^•\s*/, '').trim())
                .filter(line => line.length > 0);
        }
        
        // Extract requirements
        const reqMatch = text.match(/Requirements?:\s*\n((?:•[^\n]+\n?)+)/i);
        if (reqMatch) {
            sections.requirements = reqMatch[1]
                .split('\n')
                .filter(line => line.trim().startsWith('•'))
                .map(line => line.replace(/^•\s*/, '').trim())
                .filter(line => line.length > 0);
        }
        
        // Extract skills
        const skillsMatch = text.match(/Skills?:\s*\n((?:•[^\n]+\n?)+)/i);
        if (skillsMatch) {
            sections.skills = skillsMatch[1]
                .split('\n')
                .filter(line => line.trim().startsWith('•'))
                .map(line => line.replace(/^•\s*/, '').trim())
                .filter(line => line.length > 0);
        }
        
        // Extract technical stack
        const techMatch = text.match(/Technical Stack:\s*\n((?:[^\n]+\n?)+)/i);
        if (techMatch) {
            const techText = techMatch[1].trim();
            // Split by comma and clean up
            sections.technicalStack = techText
                .split(',')
                .map(item => item.trim())
                .filter(item => item.length > 0);
        }
        
        return sections;
    }

    restructureContent(sections) {
        let result = '';
        
        // Add overview
        if (sections.overview) {
            result += sections.overview + '\n\n';
        }
        
        // Add responsibilities
        if (sections.responsibilities.length > 0) {
            result += 'Responsibilities:\n';
            sections.responsibilities.forEach(resp => {
                result += `• ${resp}\n`;
            });
            result += '\n';
        }
        
        // Add requirements
        if (sections.requirements.length > 0) {
            result += 'Requirements:\n';
            sections.requirements.forEach(req => {
                result += `• ${req}\n`;
            });
            result += '\n';
        }
        
        // Add skills
        if (sections.skills.length > 0) {
            result += 'Skills:\n';
            sections.skills.forEach(skill => {
                result += `• ${skill}\n`;
            });
            result += '\n';
        }
        
        // Add technical stack
        if (sections.technicalStack.length > 0) {
            result += 'Technical Stack:\n';
            sections.technicalStack.forEach(tech => {
                result += `• ${tech}\n`;
            });
            result += '\n';
        }
        
        return result.trim();
    }

    async extractJobDetailsFromLink(url) {
        const jobPage = await this.browser.newPage();
        try {
            await jobPage.goto(url, { waitUntil: 'networkidle2' });
            await delay(5000);
            //await jobPage.waitForSelector('div.job__description.body', { timeout: 10000 });
            const job = await jobPage.evaluate(() => {  
                const getText = sel => document.querySelector(sel)?.innerText.trim() || '';

                // Extract job title - try Framer selectors first
                let title = getText('[data-framer-name="Job Title"] .framer-text') || 
                           getText('[data-framer-name="Title"] h5.framer-text') || 
                           getText('.doqfy-service-para-1') || 
                           getText('h2.css-10i6wsd-H2Element') ||
                           getText('h1, h2, h3').trim();

                // Extract Location - try Framer selectors first
                let location = 'Mumbai'; // default fallback
                
                // Try the Framer location selectors first
                const framerLocation1 = document.querySelector('[data-framer-name="Job Location"] .framer-text');
                const framerLocation2 = document.querySelector('[data-framer-name="Company Location"] .framer-text');
                
                if (framerLocation1) {
                    location = framerLocation1.innerText.trim();
                } else if (framerLocation2) {
                    location = framerLocation2.innerText.trim();
                } else {
                    // Try the specific Doqfy selector
                    const doqfyLocation = document.querySelector('.doqfy-service-title');
                    if (doqfyLocation) {
                        location = doqfyLocation.innerText.trim();
                    } else {
                        // Try to find location near the location icon
                        const locationIcon = document.querySelector('span[data-icon="LOCATION_OUTLINE"]');
                        if (locationIcon) {
                            // Look for text in parent or sibling elements
                            const parent = locationIcon.parentElement;
                            if (parent) {
                                const locationText = parent.innerText.trim();
                                if (locationText && locationText !== locationIcon.innerText) {
                                    location = locationText;
                                } else {
                                    // Try next sibling
                                    const nextSibling = locationIcon.nextElementSibling;
                                    if (nextSibling && nextSibling.innerText) {
                                        location = nextSibling.innerText.trim();
                                    }
                                }
                            }
                        }
                        
                        // Fallback to other selectors
                        if (location === 'Mumbai') {
                            location = getText('.job-location') || 
                                      getText('.css-zx00c9-StyledIcon') ||
                                      'Mumbai';
                        }
                    }
                }
                
                let experience = '';
                let jobType = '';
                let salary = '';
                
                // Try to extract job type from Framer structure
                const framerJobType = document.querySelector('[data-framer-name="Job Type"] .framer-text');
                if (framerJobType) {
                    jobType = framerJobType.innerText.trim();
                }
            
                
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

                // Extract job description and responsibilities - combine them
                let description = '';
                
                // Get job description from Framer content structure
                const framerContent = document.querySelector('[data-framer-name="Content"]');
                if (framerContent) {
                    // Get all text content from the content section
                    const contentText = framerContent.innerText.trim();
                    if (contentText) {
                        description += contentText + '\n\n';
                    }
                } else {
                    // Fallback to other selectors
                    const jobDesc = getText('.job-description');
                    if (jobDesc) {
                        description += jobDesc + '\n\n';
                    }
                    
                    // Get responsibilities section
                    const responsibilitiesTitle = getText('.responsibilities-title');
                    if (responsibilitiesTitle) {
                        description += responsibilitiesTitle + '\n';
                    }
                    
                    // Get responsibilities list items
                    const responsibilitiesList = document.querySelectorAll('.responsibilities-list li');
                    if (responsibilitiesList.length > 0) {
                        responsibilitiesList.forEach((li, index) => {
                            const text = li.innerText.trim();
                            if (text) {
                                description += `• ${text}\n`;
                            }
                        });
                    }
                }
                
                // Fallback to other description selectors if no specific content found
                if (!description.trim()) {
                    description = getText('div.ATS_htmlPreview') || getText('div#cw-rich-description') || '';
                }

                return {
                    title,
                    company: 'Bullet',
                    description,
                    location,
                    experience,
                    jobType,
                    url: window.location.href
                };
            });

            console.log("Before enriching job=", job);

            // Clean the job description
            const cleanedJob = this.cleanJobDescription(job);

            await jobPage.close();
            return cleanedJob;
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
                    const enrichedJob = extractBulletData(jobData);
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

const extractBulletData = (job) => {
    if (!job) return job;

    let cleanedDescription = job.description || '';
    let experience = job.experience || '';

    if (cleanedDescription) {
        // Remove sections like Job Title, Location, Type, Experience, About Us intro, Why Join Us, About RevenueHero, About Fello
        cleanedDescription = cleanedDescription// Remove About Us intro until next section
            .replace(
                /About Us\s*\n+[\s\S]*?We're building a powerful natural language query engine \+ spreadsheet interface to help finance teams model, analyze, and automate reporting like never before\./,
                ''
            )
            .replace(
                /Why Join Us\s*\n+This is a unique opportunity to join a category-defining company at a pivotal stage\. You'll get to build impactful products, work alongside high-performing teams, and help shape the future of how businesses manage procurement\.\s*\n+\s*If you're excited by complex challenges, want to own meaningful product surfaces, and are ready to modernise the procurement industry, we'd love to talk to you\./i,
                ''
            )
            .replace(
                /About RevenueHero\s*\n+RevenueHero is one of the fastest-growing tech startups that helps marketing teams turn more of the website visitors into sales meetings instantly\.\s*\n+\s*Ready to design experiences that make people say "wow"\?\s*\n+\s*We're hunting for a Product Designer who doesn't just push pixels around – someone who crafts digital magic that users actually love to interact with\. If you dream in user flows and wake up thinking about micro-interactions, this might be your new creative playground\./i,
                ''
            )
            .replace(
                /About Fello:\s*\n+\s*Fello is a profitable, hyper-growth, VC-backed B2B SaaS startup on a mission to empower businesses with data-driven intelligence\. Our AI-powered marketing automation platform helps businesses optimize engagement, make smarter decisions, and stay ahead in a competitive market\.\s*\n+\s*With massive growth potential and a track record of success, we're just getting started\. If you're passionate about innovation and want to be part of an industry-defining team, Fello is the place to be\.\s*\n+\s*About You:\s*\n+\s*/i,
                ''
            )

            // Simple formatting - preserve bullet points
            // .replace(/\n{3,}/g, '\n\n')
            // .replace(/([.!?])\s+/g, '$1 ')
            // .replace(/[ \t]+$/gm, '')
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
const Bullet = async ({ headless = true } = {}) => {
    const scraper = new BulletJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};


export default Bullet;

// ✅ CLI support: node phonepe.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await Bullet({ headless: headlessArg });
    })();
}
