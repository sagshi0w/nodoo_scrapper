import mongoose from 'mongoose';
import { connectToDatabase, getJobsCollection, getProfilesCollection } from './database.js';
import { calculateMatchingScore, extractUserSkillsAndExperience } from './jobMatching.js';
import JobMatching from '../models/JobMatching.js';

/**
 * Match jobs for a single user
 * @param {string} userId - The user ID to match jobs for
 * @returns {Object} Matching results for the user
 */
export async function matchJobsForUser(userId) {
  try {
    console.log(`🔍 Starting job matching for user: ${userId}`);
    
    // Get user profile
    const profilesCollection = await getProfilesCollection();
    const userProfile = await profilesCollection.findOne({ _id: new mongoose.Types.ObjectId(userId) });
    
    if (!userProfile) {
      throw new Error(`User profile not found for ID: ${userId}`);
    }
    
    // Extract user skills and experience
    const userData = extractUserSkillsAndExperience(userProfile);
    
    if (userData.skills.length === 0) {
      console.log(`⚠️ No skills found for user ${userId}, skipping job matching`);
      return {
        userId,
        totalJobs: 0,
        totalMatches: 0,
        recommendations: [],
        message: 'No skills found in profile'
      };
    }
    
    // Get all jobs
    const jobsCollection = await getJobsCollection();
    const jobs = await jobsCollection.find({}).toArray();
    
    console.log(`📊 Processing ${jobs.length} jobs for user ${userId}`);
    
    const recommendations = [];
    let totalMatches = 0;
    let excellentMatches = 0;
    let goodMatches = 0;
    
    // Match user against all jobs
    for (const job of jobs) {
      const matchingScore = calculateMatchingScore(job, userData);
      
      // Only save matches with score >= 40% and if match is possible
      if (matchingScore.overallScore >= 40 && matchingScore.isMatchPossible) {
        recommendations.push(job._id);
        totalMatches++;
        
        if (matchingScore.isExcellentMatch) {
          excellentMatches++;
        } else if (matchingScore.isGoodMatch) {
          goodMatches++;
        }
      }
    }
    
    // Save recommendations to database
    if (recommendations.length > 0) {
      await JobMatching.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(userId) },
        { 
          userId: new mongoose.Types.ObjectId(userId),
          recommendations: recommendations,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
      
      console.log(`✅ Saved ${recommendations.length} job recommendations for user ${userId}`);
    }
    
    const result = {
      userId,
      totalJobs: jobs.length,
      totalMatches,
      excellentMatches,
      goodMatches,
      recommendations: recommendations,
      averageScore: totalMatches > 0 ? Math.round(recommendations.reduce((sum, jobId) => {
        const job = jobs.find(j => j._id.toString() === jobId.toString());
        if (job) {
          const score = calculateMatchingScore(job, userData);
          return sum + score.overallScore;
        }
        return sum;
      }, 0) / totalMatches) : 0
    };
    
    console.log(`🎯 Job matching completed for user ${userId}: ${totalMatches} matches found`);
    return result;
    
  } catch (error) {
    console.error(`❌ Error matching jobs for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Match jobs for multiple users
 * @param {string[]} userIds - Array of user IDs to match jobs for
 * @returns {Object[]} Array of matching results for each user
 */
export async function matchJobsForUsers(userIds) {
  const results = [];
  
  for (const userId of userIds) {
    try {
      const result = await matchJobsForUser(userId);
      results.push(result);
    } catch (error) {
      console.error(`❌ Failed to match jobs for user ${userId}:`, error);
      results.push({
        userId,
        error: error.message,
        totalJobs: 0,
        totalMatches: 0,
        recommendations: []
      });
    }
  }
  
  return results;
}

/**
 * Get job recommendations for a user
 * @param {string} userId - The user ID
 * @returns {Object} User's job recommendations
 */
export async function getUserJobRecommendations(userId) {
  try {
    const jobMatching = await JobMatching.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    
    if (!jobMatching) {
      return {
        userId,
        recommendations: [],
        message: 'No job recommendations found. Profile may need to be processed.'
      };
    }
    
    // Get job details for the recommendations
    const jobsCollection = await getJobsCollection();
    const jobDetails = await jobsCollection.find({
      _id: { $in: jobMatching.recommendations }
    }).toArray();
    
    return {
      userId,
      recommendations: jobDetails,
      totalRecommendations: jobDetails.length,
      lastUpdated: jobMatching.updatedAt
    };
    
  } catch (error) {
    console.error(`❌ Error getting job recommendations for user ${userId}:`, error);
    throw error;
  }
}
