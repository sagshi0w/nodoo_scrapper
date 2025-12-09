import { connectToDatabase, getJobsCollection, closeDatabase } from './database.js';
import moment from 'moment-timezone';

/**
 * Delete jobs older than 3 months from the database
 * @returns {Promise<Object>} Object with deletion statistics
 */
export async function deleteOldJobs() {
  try {
    await connectToDatabase();
    const jobsCollection = await getJobsCollection();

    // Calculate date 3 months ago
    const threeMonthsAgo = moment().subtract(3, 'months').toDate();
    
    console.log(`🗑️  Looking for jobs older than ${moment(threeMonthsAgo).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss")} IST`);

    // Build query to find old jobs
    // Check multiple possible date fields: createdAt, created_at, postedAt
    // Jobs will be deleted if ANY of these date fields indicates they're older than 3 months
    const query = {
      $or: [
        { createdAt: { $lt: threeMonthsAgo } },
        { created_at: { $lt: threeMonthsAgo } },
        { postedAt: { $lt: threeMonthsAgo } }
      ]
    };

    // Count jobs that will be deleted (for reporting)
    const jobsToDeleteCount = await jobsCollection.countDocuments(query);

    console.log(`📊 Found ${jobsToDeleteCount} jobs older than 3 months`);

    if (jobsToDeleteCount === 0) {
      console.log('✅ No old jobs to delete');
      return {
        totalJobsDeleted: 0,
        cutoffDate: threeMonthsAgo,
        cutoffDateFormatted: moment(threeMonthsAgo).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
        message: 'No jobs older than 3 months found'
      };
    }

    // Delete jobs older than 3 months
    const deleteResult = await jobsCollection.deleteMany(query);

    const deletedCount = deleteResult.deletedCount || 0;

    console.log(`✅ Successfully deleted ${deletedCount} jobs older than 3 months`);

    return {
      totalJobsDeleted: deletedCount,
      cutoffDate: threeMonthsAgo,
      cutoffDateFormatted: moment(threeMonthsAgo).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
      message: `Successfully deleted ${deletedCount} jobs older than 3 months`
    };

  } catch (error) {
    console.error('❌ Error deleting old jobs:', error);
    throw error;
  }
}

/**
 * Main function to perform old job deletion
 * @returns {Promise<Object>} Object with deletion statistics and timing info
 */
export async function performOldJobDeletion() {
  const startTime = Date.now();
  const startTimeFormatted = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
  
  console.log(`🚀 [${startTimeFormatted}] Starting old job deletion process...`);
  
  try {
    const results = await deleteOldJobs();
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    const endTimeFormatted = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
    
    // Add timing info to results
    results.startTime = startTimeFormatted;
    results.endTime = endTimeFormatted;
    results.duration = duration;
    
    console.log(`✅ [${endTimeFormatted}] Old job deletion completed successfully!`);
    console.log(`📊 Summary:`);
    console.log(`   - Jobs Deleted: ${results.totalJobsDeleted}`);
    console.log(`   - Cutoff Date: ${results.cutoffDateFormatted}`);
    console.log(`   - Processing Time: ${results.duration} seconds`);
    
    return results;
    
  } catch (error) {
    const endTimeFormatted = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
    console.error(`❌ [${endTimeFormatted}] Old job deletion failed:`, error);
    throw error;
  }
}

