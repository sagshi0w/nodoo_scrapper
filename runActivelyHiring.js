#!/usr/bin/env node

import { performActivelyHiringUpdate } from './utils/activelyHiring.js';
import { closeDatabase } from './utils/database.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  try {
    console.log('🚀 Starting Actively Hiring Detection Process...');
    console.log('================================================');
    
    const startTime = Date.now();
    
    // Perform actively hiring detection
    const results = await performActivelyHiringUpdate();
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log('\n📊 Actively Hiring Detection Results Summary:');
    console.log('=============================================');
    console.log(`Total Companies Processed: ${results.totalCompanies}`);
    console.log(`Companies Updated: ${results.companiesUpdated}`);
    console.log(`Actively Hiring: ${results.activelyHiringCount}`);
    console.log(`Not Actively Hiring: ${results.notActivelyHiringCount}`);
    console.log(`Errors: ${results.errors}`);
    console.log(`Processing Time: ${duration} seconds`);
    
    if (results.companiesUpdated > 0) {
      console.log('\n✅ Actively hiring detection completed successfully!');
      console.log(`💾 Results saved to Company collection in database`);
    } else {
      console.log('\n⚠️ No companies were updated. Please check your data.');
    }
    
  } catch (error) {
    console.error('\n❌ Error during actively hiring detection process:');
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

