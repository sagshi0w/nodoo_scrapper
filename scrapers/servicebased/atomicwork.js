import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class AtomicworkJobsScraper {
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
        console.log('🌐 Navigating to Atomicwork Careers...');
        await this.page.goto('https://www.atomicwork.com/company/careers#open-positions', {
            waitUntil: 'networkidle2'
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];
        const existingLinks = new Set();

        while (true) {
            // Collect job links on current page
            const jobLinks = await this.page.$$eval(`a.secondary_cta.w-button`, anchors =>
                anchors.map(a => a.href)
            );

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




    async extractJobDetailsFromLink(url) {
        const jobPage = await this.browser.newPage();
        try {
            await jobPage.goto(url, { waitUntil: 'networkidle2' });
            await delay(5000);
            //await jobPage.waitForSelector('div.job__description.body', { timeout: 10000 });

            const job = await jobPage.evaluate(() => {
                const getText = sel => document.querySelector(sel)?.innerText.trim() || '';

                // Extract and clean job title
                let rawTitle = getText('h2.heading_h2.u-white1-txt');
                let title = rawTitle.trim();

                return {
                    title,
                    company: 'Atomicwork',
                    location: getText('div.loation_txt'),
                    description: getText('div.blog-rich-text.w-richtext'),
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
                    const enrichedJob = extractAtomicworkData(jobData);
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

const cleanJobDescription = (description, company = 'Atomicwork') => {
    if (!description) return 'Description not available\n';
    
    let cleaned = description.trim();
    
    // 1. Remove company boilerplate and promotional text
    cleaned = cleaned
        // Remove company intro paragraphs
        .replace(/^[^.]*Atomicwork is on a mission[^.]*\.\s*/gi, '')
        .replace(/^[^.]*Our team is building[^.]*\.\s*/gi, '')
        .replace(/^[^.]*We're looking for[^.]*\.\s*/gi, '')
        .replace(/^[^.]*This is a hybrid position[^.]*\.\s*/gi, '')
        .replace(/^[^.]*We offer competitive pay[^.]*\.\s*/gi, '')
        .replace(/^[^.]*If this sounds interesting[^.]*\.\s*/gi, '')
        
        // Remove "About the job" section
        .replace(/About the job\s*/gi, '')
        
        // Remove "Why we are different" section
        .replace(/Why we are different[^.]*As a part of Atomicwork[^.]*Customer Obsession[^.]*\./gi, '')
        
        // Remove "What we offer" section
        .replace(/What we offer[^.]*What next[^.]*\./gi, '')
        
        // Remove "What next" section
        .replace(/What next[^.]*careers@atomicwork\.com[^.]*\./gi, '')
        
        // Remove contact information
        .replace(/Email careers@atomicwork\.com[^.]*\./gi, '')
        .replace(/careers@atomicwork\.com/gi, '')
        
        // Remove application instructions
        .replace(/Click on the apply button[^.]*\./gi, '')
        .replace(/Answer a few questions[^.]*\./gi, '')
        .replace(/Wait to hear from us[^.]*\./gi, '');
    
    // 2. Standardize section headers
    cleaned = cleaned
        .replace(/What we're looking for[^.]*qualifications[^.]*\)\s*/gi, '\n\nRequirements:\n')
        .replace(/What You'll Do[^.]*Responsibilities[^.]*\)\s*/gi, '\n\nResponsibilities:\n')
        .replace(/What you'll do[^.]*responsibilities[^.]*\)\s*/gi, '\n\nResponsibilities:\n')
        .replace(/Key Responsibilities?:\s*/gi, '\n\nResponsibilities:\n')
        .replace(/Qualifications and Skills?:\s*/gi, '\n\nRequirements:\n')
        .replace(/Qualifications\s*[–-]\s*/gi, '\n\nQualifications:\n')
        .replace(/Skills Required:\s*/gi, '\n\nSkills:\n')
        .replace(/Technical Skills:\s*/gi, '\n\nTechnical Skills:\n')
        .replace(/Key Competencies?:\s*/gi, '\n\nKey Competencies:\n')
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
    const sections = extractSections(cleaned);
    cleaned = restructureContent(sections);
    
    // 5. Final cleanup
    cleaned = cleaned
        .replace(/^\s+|\s+$/g, '') // trim start/end
        .replace(/\n{3,}/g, '\n\n') // max 2 consecutive newlines
        .replace(/([.!?])\s*\n\s*([A-Z])/g, '$1\n\n$2') // proper paragraph breaks
        .replace(/[\n\r\t]+/g, '\n') // normalize line breaks
        .replace(/[^\x20-\x7E\n]+/g, '') // remove non-printable chars
        .trim();
    
    return cleaned + '\n';
};

const extractSections = (text) => {
    const sections = {
        overview: '',
        responsibilities: [],
        requirements: [],
        skills: [],
        competencies: []
    };
    
    // Extract overview (first paragraph)
    const overviewMatch = text.match(/^([^•\n]+?)(?=\n\n|Responsibilities|Requirements|Skills|Key Competencies)/s);
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
    
    // Extract competencies
    const compMatch = text.match(/Key Competencies?:\s*\n((?:•[^\n]+\n?)+)/i);
    if (compMatch) {
        sections.competencies = compMatch[1]
            .split('\n')
            .filter(line => line.trim().startsWith('•'))
            .map(line => line.replace(/^•\s*/, '').trim())
            .filter(line => line.length > 0);
    }
    
    return sections;
};

const restructureContent = (sections) => {
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
    
    // Add competencies
    if (sections.competencies.length > 0) {
        result += 'Key Competencies:\n';
        sections.competencies.forEach(comp => {
            result += `• ${comp}\n`;
        });
        result += '\n';
    }
    
    return result.trim();
};

const extractExperience = (description) => {
    const expPatterns = [
        /\bminimum\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i,
        /\bmin(?:imum)?\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i,
        /\b(\d{1,2})\s*(?:to|–|-|–)\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i,
        /\b(?:at least|over)\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i,
        /\b(\d{1,2})\s*(?:years|yrs|yr)\s+experience\b/i,
        /\bexperience\s*(?:of)?\s*(\d{1,2})\s*(?:years|yrs|yr)\b/i,
        /\bexperience\s*(?:required)?\s*[:\-]?\s*(\d{1,2})\s*(?:[-to]+)?\s*(\d{1,2})?\s*(?:years|yrs|yr)?/i,
        /\b(\d{1,2})\s*\+\s*(?:years|yrs|yr)\b/i,
        /\b(\d{1,2})-(\d{1,2})\s*(?:years|yrs|yr)\s+experience\b/i,
    ];

    for (const pattern of expPatterns) {
        const match = description.match(pattern);
        if (match) {
            const minExp = parseInt(match[1], 10);
            const maxExp = match[2] ? parseInt(match[2], 10) : minExp + 2;
            return `${minExp} - ${maxExp} yrs`;
        }
    }

    return '';
};

const extractAtomicworkData = (job) => {
    if (!job) return job;

    let cleanedDescription = job.description || '';
    let experience = null;
    let location = null;

    // Extract experience
    experience = extractExperience(cleanedDescription);

    // Clean description
    cleanedDescription = cleanJobDescription(cleanedDescription);

    // Extract city from location string
    if (job.location) {
        const cityMatch = job.location.match(/^([^,\n]+)/);
        if (cityMatch) {
            location = cityMatch[1].trim();
        }
    }

    // Fallback: extract from description if location is still empty
    if (!location && job.description) {
        const descLocationMatch = job.description.match(/Job Location:\s*(.+)/i);
        if (descLocationMatch) {
            location = descLocationMatch[1].split('\n')[0].trim();
        }
    }

    // Optional: fallback default
    if (!location) {
        location = 'India';
    }

    return {
        ...job,
        title: job.title?.trim(),
        experience,
        location,
        description: cleanedDescription,
    };
};


// ✅ Exportable runner function
const Atomicwork = async ({ headless = true } = {}) => {
    const scraper = new AtomicworkJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};


export default Atomicwork;

// ✅ CLI support: node phonepe.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await Atomicwork({ headless: headlessArg });
    })();
}
