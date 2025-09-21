import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

const delay = ms => new Promise(res => setTimeout(res, ms));

class NttDataJobsScraper {
    constructor(headless = true) {
        this.headless = headless;
        this.browser = null;
        this.page = null;
        this.allJobs = [];
    }

    async initialize() {
        this.browser = await puppeteer.launch({
            headless: this.headless ? true : false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--no-zygote',
                '--single-process',
                '--disable-setuid-sandbox',
                ...(this.headless ? [] : ['--start-maximized'])
            ],
            defaultViewport: this.headless ? { width: 1920, height: 1080 } : null
        });

        this.page = await this.browser.newPage();
        await this.page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        );
    }

    async navigateToJobsPage() {
        console.log('🌐 Navigating to NTT Data Careers page...');
        await this.page.goto(
            'https://paypal.eightfold.ai/careers?location=India&pid=274907388508&domain=paypal.com&sort_by=relevance&triggerGoButton=false',
            { waitUntil: 'networkidle2', timeout: 60000 }
        );
        await delay(5000);
    }

    async loadAndScrapeAllPages() {
        let start = 0;
        let pageCount = 1;

        const indianCities = [ /* Indian cities list as before */
            "Bangalore", "Bengaluru", "Mumbai", "Delhi", "Hyderabad", "Chennai", "Pune", "Gurgaon", "Noida",
            "Kolkata", "Ahmedabad", "Jaipur", "Chandigarh", "Indore", "Lucknow", "Coimbatore", "Nagpur",
            "Surat", "Visakhapatnam", "Bhopal", "Patna", "Vadodara", "Ghaziabad", "Ludhiana", "Agra",
            "Nashik", "Faridabad", "Meerut", "Rajkot", "Kalyan", "Vasai", "Varanasi", "Srinagar", "Aurangabad",
            "Dhanbad", "Amritsar", "Navi Mumbai", "Allahabad", "Ranchi", "Howrah", "Jabalpur", "Gwalior",
            "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota", "Guwahati", "Chandrapur", "Solapur",
            "Remote", "Gurugram", "Kanpur", "Trichy", "Tiruchirappalli", "Mysore", "Thrissur", "Jamshedpur", "Udaipur",
            "Dehradun", "Hubli", "Dharwad", "Nellore", "Thane", "Panaji", "Shimla", "Mangalore",
            "Bareilly", "Salem", "Aligarh", "Bhavnagar", "Kolhapur", "Ajmer", "Belgaum", "Tirupati",
            "Rourkela", "Bilaspur", "Anantapur", "Silchar", "Kochi", "Thiruvananthapuram"
        ];

        while (start < 1000) {
            const url = `https://nttdata.eightfold.ai/careers?pid=563327923692371&sort_by=hot&start=${start}`;

            console.log(`🌐 Navigating to Page ${pageCount} -> ${url}`);
            await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
            await delay(5000);

            await this.page.waitForSelector('div[data-test-id="job-listing"]', { timeout: 10000 });
            const cards = await this.page.$$('div[data-test-id="job-listing"]');
            const cardsCount = cards.length;

            if (cardsCount === 0) {
                console.log('✅ No more job cards found. Stopping pagination.');
                break;
            }

            for (let i = 0; i < cardsCount; i++) {
                const freshCards = await this.page.$$('div[data-test-id="job-listing"]');
                const card = freshCards[i];

                console.log(`📝 Processing job ${i + 1}/${cardsCount} on Page ${pageCount}`);

                try {
                    const jobData = await this.extractJobDetailsFromCard(card);
                    if (jobData.title && jobData.description && jobData.location && jobData.url) {
                        const jobLocation = jobData.location.toLowerCase();
                        const isIndianCity = indianCities.some(city => jobLocation.includes(city.toLowerCase()));
                        if (isIndianCity) {
                            this.allJobs.push(jobData);
                        }
                    }
                } catch (err) {
                    console.warn(`⚠️ Failed to extract job ${i + 1}:`, err.message);
                }

                await delay(1000);
            }

            start += 10;
            pageCount++;
        }

        console.log('✅ Completed scraping all pages.');
    }

    cleanJobDescription(description, company = 'NTT Data') {
        if (!description) return 'Description not available\n';
        
        let cleaned = description.trim();
        
        // 1. Remove company boilerplate and legal text
        cleaned = cleaned
            // Remove company intro paragraphs
            .replace(/^[^.]*strives to hire[^.]*\.\s*/gi, '')
            .replace(/^[^.]*currently seeking[^.]*\.\s*/gi, '')
            .replace(/^[^.]*looking for[^.]*\.\s*/gi, '')
            
            // Remove "About [Company]" sections
            .replace(/About\s+[A-Za-z\s]+\s*[A-Za-z\s]*\$[\d.]+[^.]*\./gi, '')
            .replace(/About\s+[A-Za-z\s]+\s*[A-Za-z\s]*[^.]*Visit us at[^.]*\./gi, '')
            .replace(/About\s+[A-Za-z\s]+\s*[A-Za-z\s]*[^.]*\./gi, '')
            
            // Remove EEO and legal disclaimers
            .replace(/Whenever possible[^.]*\./gi, '')
            .replace(/NTT DATA recruiters[^.]*\./gi, '')
            .replace(/NTT DATA endeavors[^.]*\./gi, '')
            .replace(/NTT DATA is an equal opportunity[^.]*\./gi, '')
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
            .replace(/^Reference:\s*\w+\s*/gi, '');
        
        // 2. Clean up job title and location repetition
        cleaned = cleaned
            .replace(/Position is for[^.]*\./gi, '')
            .replace(/join our team in[^.]*\./gi, '')
            .replace(/based in[^.]*\./gi, '')
            .replace(/located in[^.]*\./gi, '');
        
        // 3. Standardize section headers
        cleaned = cleaned
            .replace(/Job Responsibilities?:\s*/gi, '\n\nResponsibilities:\n')
            .replace(/External Skills Required:\s*/gi, '\n\nRequirements:\n')
            .replace(/Qualifications\s*[–-]\s*/gi, '\n\nQualifications:\n')
            .replace(/Skills Required:\s*/gi, '\n\nSkills:\n')
            .replace(/Technical Skills:\s*/gi, '\n\nTechnical Skills:\n')
            .replace(/Key Responsibilities?:\s*/gi, '\n\nResponsibilities:\n')
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
        const sections = this.extractSections(cleaned);
        cleaned = this.restructureContent(sections);
        
        // 6. Final cleanup
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
            experience: ''
        };
        
        // Extract overview (first paragraph)
        const overviewMatch = text.match(/^([^•\n]+?)(?=\n\n|Responsibilities|Requirements|Skills)/s);
        if (overviewMatch) {
            sections.overview = overviewMatch[1].trim();
        }
        
        // Extract responsibilities
        const respMatch = text.match(/Responsibilities:\s*\n((?:•[^\n]+\n?)+)/i);
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
        
        return result.trim();
    }

    extractExperience(description) {
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
    }

    async extractJobDetailsFromCard(cardHandle) {
        await cardHandle.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        await delay(500);
        await cardHandle.click();
        await delay(2000);

        const rawData = await this.page.evaluate(() => {
            const getText = sel => document.querySelector(sel)?.innerText.trim() || '';
            return {
                title: getText('.position-title-3TPtN'),
                location: getText('.position-location-12ZUO'),
                summaryText: getText('div.container-3Gm1a'),
                url: window.location.href
            };
        });

        const cleanedDescription = this.cleanJobDescription(rawData.summaryText);
        const experience = this.extractExperience(cleanedDescription);

        return {
            title: rawData.title,
            company: 'NTT Data',
            location: rawData.location,
            description: cleanedDescription,
            experience: experience,
            url: rawData.url
        };
    }

    async saveResults() {
        //writeFileSync('./scrappedJobs/paypalJobs.json', JSON.stringify(this.allJobs, null, 2));
        console.log(`💾 Saved ${this.allJobs.length} jobs to scrappedJobs/NTTDataJobs.json`);
    }

    async close() {
        if (this.browser) await this.browser.close();
    }

    async run() {
        try {
            await this.initialize();
            await this.navigateToJobsPage();
            await this.loadAndScrapeAllPages();
            await this.saveResults();
        } catch (err) {
            console.error('❌ Scraper failed:', err);
        } finally {
            await this.close();
        }
    }
}

const runNTTDataScraper = async ({ headless = true } = {}) => {
    const scraper = new NttDataJobsScraper(headless);
    await scraper.run();
    return scraper.allJobs;
};

export default runNTTDataScraper;

// Allow direct CLI execution for testing
if (import.meta.url === `file://${process.argv[1]}`) {
    const headlessArg = process.argv.includes('--headless=false') ? false : true;
    (async () => {
        await runNTTDataScraper({ headless: headlessArg });
    })();
}
