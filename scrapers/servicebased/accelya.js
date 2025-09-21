import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class AccelyaJobsScraper {
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
        console.log('🌐 Navigating to Accelya Careers...');
        await this.page.goto('https://accelya.wd103.myworkdayjobs.com/Careers?locationCountry=c4f78be1a8f14da0ab49ce1162348a5e', {
            waitUntil: 'networkidle2'
        });
        await delay(5000);
    }

    async collectAllJobCardLinks() {
        this.allJobLinks = [];
        const existingLinks = new Set();

        while (true) {
            // Wait for job cards to appear
            //await this.page.waitForSelector("a.awsm-job-item", { timeout: 10000 });

            // Collect job links on current page
            const jobLinks = await this.page.$$eval("a.css-19uc56f", anchors =>
                anchors.map(a => a.href)
            );

            for (const link of jobLinks) {
                if (!existingLinks.has(link)) {
                    existingLinks.add(link);
                    this.allJobLinks.push(link);
                }
            }

            console.log(`📄 Collected ${this.allJobLinks.length} unique job links so far...`);

            // Check if "Next" page exists
            const nextPageUrl = await this.page.$eval("a.next.page-numbers", a => a.href).catch(() => null);

            if (!nextPageUrl) {
                console.log("✅ No more pages found. Pagination finished.");
                break;
            }

            // Go to next page
            console.log(`➡️ Going to next page: ${nextPageUrl}`);
            await this.page.goto(nextPageUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
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
                return {
                    title: getText('h2[data-automation-id="jobPostingHeader"]'),
                    company: 'Accelya',
                    location: getText('div[data-automation-id="locations"] dd'),
                    description: getText('div[data-automation-id="jobPostingDescription"]'),
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
                const enrichedJob = extractAccelyaData(jobData);
                console.log("After enriching job=", enrichedJob);
                this.allJobs.push(enrichedJob);
                console.log(`✅ ${jobData.title}`);
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

const cleanJobDescription = (description, company = 'Accelya') => {
    if (!description) return 'Description not available\n';
    
    let cleaned = description.trim();
    
    // 1. Remove company boilerplate and legal text
    cleaned = cleaned
        // Remove company intro paragraphs
        .replace(/^[^.]*For more than \d+ years[^.]*\.\s*/gi, '')
        .replace(/^[^.]*strives to hire[^.]*\.\s*/gi, '')
        .replace(/^[^.]*currently seeking[^.]*\.\s*/gi, '')
        .replace(/^[^.]*looking for[^.]*\.\s*/gi, '')
        
        // Remove "About [Company]" sections
        .replace(/About\s+[A-Za-z\s]+\s*[A-Za-z\s]*\$[\d.]+[^.]*\./gi, '')
        .replace(/About\s+[A-Za-z\s]+\s*[A-Za-z\s]*[^.]*Visit us at[^.]*\./gi, '')
        .replace(/About\s+[A-Za-z\s]+\s*[A-Za-z\s]*[^.]*\./gi, '')
        
        // Remove EEO and legal disclaimers
        .replace(/Whenever possible[^.]*\./gi, '')
        .replace(/Accelya recruiters[^.]*\./gi, '')
        .replace(/Accelya endeavors[^.]*\./gi, '')
        .replace(/Accelya is an equal opportunity[^.]*\./gi, '')
        .replace(/For our EEO Policy[^.]*\./gi, '')
        .replace(/If you'd like more information[^.]*\./gi, '')
        .replace(/This contact information[^.]*\./gi, '')
        .replace(/Equal opportunity employer[^.]*\./gi, '')
        .replace(/Qualified applicants[^.]*\./gi, '')
        
        // Remove contact and application info
        .replace(/Visit us at[^.]*\./gi, '')
        .replace(/https?:\/\/[^\s]+/g, '')
        .replace(/please click here/gi, '')
        .replace(/please contact us[^.]*\./gi, '')
        .replace(/contact us at[^.]*\./gi, '')
        
        // Remove job ID and reference numbers
        .replace(/^Req ID:\s*\d+\s*/gi, '')
        .replace(/^Job ID:\s*\d+\s*/gi, '')
        .replace(/^Reference:\s*\w+\s*/gi, '')
        
        // Remove Accelya-specific boilerplate
        .replace(/What does the future of the air transport industry[^.]*\./gi, '')
        .replace(/Whether you're an industry veteran[^.]*\./gi, '')
        .replace(/we want to make your ambitions[^.]*\./gi, '');
    
    // 2. Clean up job title and location repetition
    cleaned = cleaned
        .replace(/Position is for[^.]*\./gi, '')
        .replace(/join our team in[^.]*\./gi, '')
        .replace(/based in[^.]*\./gi, '')
        .replace(/located in[^.]*\./gi, '');
    
    // 3. Standardize section headers
    cleaned = cleaned
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
    
    // 4. Standardize bullet points and formatting
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
    
    // 5. Structure the content better
    const sections = extractSections(cleaned);
    cleaned = restructureContent(sections);
    
    // 6. Final cleanup
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

const extractAccelyaData = (job) => {
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

    return {
        ...job,
        title: job.title?.trim(),
        experience,
        location,
        description: cleanedDescription,
    };
};


// ✅ Exportable runner function
const runAccelyaJobsScraper = async ({ headless = true } = {}) => {
    const scraper = new AccelyaJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runAccelyaJobsScraper;

// ✅ CLI support: node phonepe.js --headless=false
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await runAccelyaJobsScraper({ headless: headlessArg });
    })();
}
