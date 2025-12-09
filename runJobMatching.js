#!/usr/bin/env node

import { performJobMatching } from './utils/jobMatching.js';
import { closeDatabase } from './utils/database.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  try {
    console.log('🚀 Starting Job Matching Process...');
    console.log('=====================================');
    
    const startTime = Date.now();
    
    // Perform job matching
    const results = await performJobMatching();
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log('\n📊 Job Matching Results Summary:');
    console.log('=================================');
    console.log(`Total Jobs Processed: ${results.totalJobs}`);
    console.log(`Total Profiles Processed: ${results.totalProfiles}`);
    console.log(`Total Matches Found: ${results.totalMatches}`);
    console.log(`Users with Matches: ${results.usersWithMatches}`);
    console.log(`Excellent Matches (≥85%): ${results.excellentMatches}`);
    console.log(`Good Matches (≥70%): ${results.goodMatches}`);
    console.log(`Average Recommendations per User: ${results.averageRecommendationsPerUser}`);
    console.log(`Processing Time: ${duration} seconds`);
    
    // Print user details if available
    if (results.usersWithMatchesDetails && results.usersWithMatchesDetails.length > 0) {
      console.log('\n=== Users with Matches Details ===');
      results.usersWithMatchesDetails.forEach((user, index) => {
        console.log(`User ${index + 1}: ${user.name} | Skills: ${user.skills} | Jobs: ${user.jobCount}`);
      });
    }
    
    if (results.totalMatches > 0) {
      console.log('\n✅ Job matching completed successfully!');
      console.log(`💾 Results saved to jobMatching collection in database (matches ≥40%)`);
    } else {
      console.log('\n⚠️ No matches found. Please check your data.');
    }
    
  } catch (error) {
    console.error('\n❌ Error during job matching process:');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    await closeDatabase();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the main function
main();
