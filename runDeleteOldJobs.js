#!/usr/bin/env node

import { performOldJobDeletion } from './utils/deleteOldJobs.js';
import { closeDatabase } from './utils/database.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  try {
    console.log('🚀 Starting Old Job Deletion Process...');
    console.log('========================================');
    
    const startTime = Date.now();
    
    // Perform old job deletion
    const results = await performOldJobDeletion();
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log('\n📊 Old Job Deletion Results Summary:');
    console.log('====================================');
    console.log(`Total Jobs Deleted: ${results.totalJobsDeleted}`);
    console.log(`Cutoff Date: ${results.cutoffDateFormatted}`);
    console.log(`Processing Time: ${duration} seconds`);
    
    if (results.totalJobsDeleted > 0) {
      console.log('\n✅ Old job deletion completed successfully!');
      console.log(`💾 ${results.totalJobsDeleted} jobs older than 3 months have been removed from the database`);
    } else {
      console.log('\n⚠️ No old jobs found to delete.');
    }
    
  } catch (error) {
    console.error('\n❌ Error during old job deletion process:');
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

