import { connectToDatabase, getJobsCollection, closeDatabase } from './database.js';
import Company from '../models/Company.js';

/**
 * Escape special regex characters in a string
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Fetch all companies from the database
 * @returns {Promise<Array>} Array of company objects
 */
export async function fetchAllCompanies() {
  try {
    await connectToDatabase();
    const companies = await Company.find({}).lean();
    console.log(`Fetched ${companies.length} companies from database`);
    return companies;
  } catch (error) {
    console.error('Error fetching companies:', error);
    throw error;
  }
}

/**
 * Get jobs for a specific company created in the last 48 hours
 * @param {string} companyName - Name of the company
 * @returns {Promise<Array>} Array of job objects created in last 48 hours
 */
export async function getRecentJobsForCompany(companyName) {
  try {
    const jobsCollection = await getJobsCollection();
    
    // Calculate date 48 hours ago
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    
    // Query jobs for this company created in last 48 hours
    // Jobs might have 'company' field (string) or 'companyName' field
    // Check createdAt field (MongoDB timestamps)
    // Use case-insensitive matching for company name
    const escapedCompanyName = escapeRegex(companyName);
    const companyNameRegex = new RegExp(`^${escapedCompanyName}$`, 'i');
    const jobs = await jobsCollection.find({
      $and: [
        {
          $or: [
            { company: companyNameRegex },
            { companyName: companyNameRegex }
          ]
        },
        {
          createdAt: { $gte: fortyEightHoursAgo }
        }
      ]
    }).toArray();
    
    return jobs;
  } catch (error) {
    console.error(`Error fetching recent jobs for company ${companyName}:`, error);
    throw error;
  }
}

/**
 * Get total job count for a company
 * @param {string} companyName - Name of the company
 * @returns {Promise<number>} Total number of jobs for the company
 */
export async function getTotalJobsForCompany(companyName) {
  try {
    const jobsCollection = await getJobsCollection();
    
    // Use case-insensitive matching for company name
    const escapedCompanyName = escapeRegex(companyName);
    const companyNameRegex = new RegExp(`^${escapedCompanyName}$`, 'i');
    const count = await jobsCollection.countDocuments({
      $or: [
        { company: companyNameRegex },
        { companyName: companyNameRegex }
      ]
    });
    
    return count;
  } catch (error) {
    console.error(`Error counting jobs for company ${companyName}:`, error);
    throw error;
  }
}

/**
 * Update company's actively hiring status and job count
 * @param {string} companyId - Company MongoDB _id
 * @param {boolean} isActivelyHiring - Whether company is actively hiring
 * @param {number} numberOfJobs - Total number of jobs for the company
 * @returns {Promise<void>}
 */
export async function updateCompanyHiringStatus(companyId, isActivelyHiring, numberOfJobs) {
  try {
    await Company.findByIdAndUpdate(
      companyId,
      {
        isActivelyHiring: isActivelyHiring,
        numberOfJobs: numberOfJobs,
        updatedAt: new Date()
      },
      { new: true }
    );
  } catch (error) {
    console.error(`Error updating company ${companyId}:`, error);
    throw error;
  }
}

/**
 * Check if company has jobs added in last 48 hours
 * @param {Object} company - Company object
 * @returns {Promise<Object>} Object with hiring status and job count
 */
export async function checkCompanyHiringStatus(company) {
  try {
    const companyName = company.name;
    
    // Get recent jobs (last 48 hours)
    const recentJobs = await getRecentJobsForCompany(companyName);
    
    // Get total job count
    const totalJobs = await getTotalJobsForCompany(companyName);
    
    // Company is actively hiring if it has jobs added in last 48 hours
    const isActivelyHiring = recentJobs.length > 0;
    
    return {
      companyId: company._id,
      companyName: companyName,
      isActivelyHiring: isActivelyHiring,
      numberOfJobs: totalJobs,
      recentJobsCount: recentJobs.length
    };
  } catch (error) {
    console.error(`Error checking hiring status for company ${company.name}:`, error);
    throw error;
  }
}

/**
 * Main function to orchestrate actively hiring detection process
 * @returns {Promise<Object>} Summary of processing results
 */
export async function performActivelyHiringUpdate() {
  try {
    console.log('Starting actively hiring detection process...');
    
    // Fetch all companies
    const companies = await fetchAllCompanies();
    
    if (companies.length === 0) {
      console.log('No companies found in database');
      return { 
        totalCompanies: 0, 
        companiesUpdated: 0, 
        activelyHiringCount: 0,
        notActivelyHiringCount: 0
      };
    }
    
    console.log(`Processing ${companies.length} companies...`);
    
    let companiesUpdated = 0;
    let activelyHiringCount = 0;
    let notActivelyHiringCount = 0;
    let errors = 0;
    const activelyHiringCompanies = [];
    
    // Process each company
    for (const company of companies) {
      try {
        const hiringStatus = await checkCompanyHiringStatus(company);
        
        // Update company in database
        await updateCompanyHiringStatus(
          hiringStatus.companyId,
          hiringStatus.isActivelyHiring,
          hiringStatus.numberOfJobs
        );
        
        companiesUpdated++;
        
        if (hiringStatus.isActivelyHiring) {
          activelyHiringCount++;
          activelyHiringCompanies.push({
            name: hiringStatus.companyName,
            recentJobsCount: hiringStatus.recentJobsCount,
            totalJobs: hiringStatus.numberOfJobs
          });
          console.log(
            `✅ ${hiringStatus.companyName}: Actively hiring (${hiringStatus.recentJobsCount} jobs in last 48hrs, ${hiringStatus.numberOfJobs} total jobs)`
          );
        } else {
          notActivelyHiringCount++;
          console.log(
            `⏸️  ${hiringStatus.companyName}: Not actively hiring (${hiringStatus.numberOfJobs} total jobs, none in last 48hrs)`
          );
        }
      } catch (error) {
        errors++;
        console.error(`❌ Error processing company ${company.name}:`, error.message);
      }
    }
    
    const summary = {
      totalCompanies: companies.length,
      companiesUpdated: companiesUpdated,
      activelyHiringCount: activelyHiringCount,
      notActivelyHiringCount: notActivelyHiringCount,
      errors: errors,
      activelyHiringCompanies: activelyHiringCompanies
    };
    
    console.log('Actively hiring detection completed successfully!');
    console.log('Summary:', summary);
    
    return summary;
    
  } catch (error) {
    console.error('Error in actively hiring detection process:', error);
    throw error;
  }
}

