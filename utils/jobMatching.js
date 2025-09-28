import { connectToDatabase, getJobsCollection, getProfilesCollection, closeDatabase } from './database.js';
import { computeMatchPercent, computeSkillsMatchingData, extractUserSkills, extractUserExperienceYears } from './profileMatching.js';
import JobMatching from '../models/JobMatching.js';

/**
 * Fetch all jobs from the database
 * @returns {Promise<Array>} Array of job objects
 */
export async function fetchAllJobs() {
  try {
    const jobsCollection = await getJobsCollection();
    const jobs = await jobsCollection.find({}).toArray();
    console.log(`Fetched ${jobs.length} jobs from database`);
    return jobs;
  } catch (error) {
    console.error('Error fetching jobs:', error);
    throw error;
  }
}

/**
 * Fetch all profiles from the database
 * @returns {Promise<Array>} Array of profile objects
 */
export async function fetchAllProfiles() {
  try {
    const profilesCollection = await getProfilesCollection();
    const profiles = await profilesCollection.find({}).toArray();
    console.log(`Fetched ${profiles.length} profiles from database`);
    return profiles;
  } catch (error) {
    console.error('Error fetching profiles:', error);
    throw error;
  }
}

/**
 * Extract user skills and experience from profile using existing profileMatching functions
 * @param {Object} profile - Profile object
 * @returns {Object} Object containing skills and experience
 */
export function extractUserSkillsAndExperience(profile) {
  const skills = extractUserSkills(profile);
  const experience = extractUserExperienceYears(profile);
  
  return {
    skills: skills,
    experience: experience,
    userId: profile._id || profile.userId || profile.id,
    profileId: profile._id || profile.id,
    profile: profile // Keep the full profile for computeMatchPercent
  };
}

/**
 * Calculate matching score between job and profile using existing profileMatching functions
 * @param {Object} job - Job object
 * @param {Object} userData - User skills and experience data
 * @returns {Object} Matching score and details
 */
export function calculateMatchingScore(job, userData) {
  const { skills: userSkills, experience: userExperience, profile } = userData;
  
  // Use the existing computeMatchPercent function from profileMatching.js
  const overallScore = computeMatchPercent(job, profile);
  
  // If no match is possible, return null scores
  if (overallScore === null) {
    return {
      overallScore: 0,
      skillMatchPercentage: 0,
      experienceMatch: 0,
      matchedSkills: [],
      jobSkills: [],
      userSkills: userSkills,
      userExperience: userExperience,
      jobMinExperience: 0,
      jobMaxExperience: null,
      isGoodMatch: false,
      isExcellentMatch: false,
      isMatchPossible: false
    };
  }
  
  // Get skills matching data
  const skillsData = computeSkillsMatchingData(job, profile);
  
  // Extract experience range for display
  let jobMinExp = 0;
  let jobMaxExp = null;
  
  // Try to get experience from parsed range or direct fields
  if (job.miniExperience !== undefined) {
    jobMinExp = job.miniExperience;
    jobMaxExp = job.maxExperience;
  } else if (job.minExperience !== undefined) {
    jobMinExp = job.minExperience;
    jobMaxExp = job.maxExperience;
  }
  
  return {
    overallScore: overallScore,
    skillMatchPercentage: skillsData.totalJobSkills > 0 
      ? Math.round((skillsData.matchedSkillCount / skillsData.totalJobSkills) * 100)
      : 0,
    experienceMatch: 0, // Will be calculated internally by computeMatchPercent
    matchedSkills: skillsData.normalizedJobSkills.filter(skill => 
      userSkills.some(userSkill => userSkill.toLowerCase().includes(skill.toLowerCase()))
    ),
    jobSkills: skillsData.normalizedJobSkills,
    userSkills: userSkills,
    userExperience: userExperience,
    jobMinExperience: jobMinExp,
    jobMaxExperience: jobMaxExp,
    isGoodMatch: overallScore >= 70,
    isExcellentMatch: overallScore >= 85,
    isMatchPossible: true
  };
}

/**
 * Save job matching results to database using the new schema
 * @param {Object} userRecommendations - Object mapping userId to array of jobIds
 * @returns {Promise<void>}
 */
export async function saveJobMatchingResults(userRecommendations) {
  try {
    await connectToDatabase();
    
    const savePromises = Object.entries(userRecommendations).map(async ([userId, jobIds]) => {
      if (jobIds.length === 0) return; // Skip if no recommendations
      
      try {
        // Use upsert to update existing record or create new one
        await JobMatching.findOneAndUpdate(
          { userId: userId },
          { 
            recommendations: jobIds,
            updatedAt: new Date()
          },
          { 
            upsert: true, 
            new: true 
          }
        );
        console.log(`Saved ${jobIds.length} job recommendations for user ${userId}`);
      } catch (error) {
        console.error(`Error saving recommendations for user ${userId}:`, error);
      }
    });
    
    await Promise.all(savePromises);
    console.log(`Saved job matching results for ${Object.keys(userRecommendations).length} users`);
  } catch (error) {
    console.error('Error saving job matching results:', error);
    throw error;
  }
}

/**
 * Main function to orchestrate job matching process
 * @returns {Promise<Object>} Summary of matching results
 */
export async function performJobMatching() {
  try {
    console.log('Starting job matching process...');
    
    // Fetch all jobs and profiles
    const [jobs, profiles] = await Promise.all([
      fetchAllJobs(),
      fetchAllProfiles()
    ]);
    
    if (jobs.length === 0) {
      console.log('No jobs found in database');
      return { totalJobs: 0, totalProfiles: 0, totalMatches: 0 };
    }
    
    if (profiles.length === 0) {
      console.log('No profiles found in database');
      return { totalJobs: jobs.length, totalProfiles: 0, totalMatches: 0 };
    }
    
    console.log(`Processing ${jobs.length} jobs against ${profiles.length} profiles...`);
    
    // Group recommendations by user
    const userRecommendations = {};
    let totalMatches = 0;
    let excellentMatches = 0;
    let goodMatches = 0;
    let usersWithMatches = 0;
    
    // Process each profile against all jobs
    for (const profile of profiles) {
      const userData = extractUserSkillsAndExperience(profile);
      const userId = userData.userId;
      
      if (userData.skills.length === 0) {
        console.log(`Skipping profile ${userData.profileId} - no skills found`);
        continue;
      }
      
      // Initialize recommendations array for this user
      userRecommendations[userId] = [];
      
      // Match this profile against all jobs
      for (const job of jobs) {
        const matchingScore = calculateMatchingScore(job, userData);
        
        // Only save matches with score >= 40% and if match is possible
        if (matchingScore.overallScore >= 40 && matchingScore.isMatchPossible) {
          // Add job ID to user's recommendations
          userRecommendations[userId].push(job._id);
          totalMatches++;
          
          if (matchingScore.isExcellentMatch) {
            excellentMatches++;
          } else if (matchingScore.isGoodMatch) {
            goodMatches++;
          }
        }
      }
      
      // Count users with matches
      if (userRecommendations[userId].length > 0) {
        usersWithMatches++;
        console.log(`User ${userId}: ${userRecommendations[userId].length} job recommendations`);
      }
    }
    
    // Save results to database
    await saveJobMatchingResults(userRecommendations);
    
    const summary = {
      totalJobs: jobs.length,
      totalProfiles: profiles.length,
      totalMatches: totalMatches,
      usersWithMatches: usersWithMatches,
      excellentMatches: excellentMatches,
      goodMatches: goodMatches,
      averageRecommendationsPerUser: usersWithMatches > 0 
        ? Math.round(totalMatches / usersWithMatches)
        : 0
    };
    
    console.log('Job matching completed successfully!');
    console.log('Summary:', summary);
    
    return summary;
    
  } catch (error) {
    console.error('Error in job matching process:', error);
    throw error;
  }
}
