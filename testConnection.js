#!/usr/bin/env node

import { getJobsCollection, getProfilesCollection } from './utils/database.js';
import { closeDatabase } from './utils/database.js';
import { extractUserSkills, extractUserExperienceYears } from './utils/profileMatching.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testConnection() {
  try {
    console.log('🔍 Testing Database Connection and Data Access...');
    console.log('================================================');
    
    // Test jobs collection
    console.log('\n📋 Testing Jobs Collection...');
    const jobsCollection = await getJobsCollection();
    const jobsCount = await jobsCollection.countDocuments();
    console.log(`✅ Jobs collection accessible - Found ${jobsCount} documents`);
    
    // Get a sample job to see the structure
    const sampleJob = await jobsCollection.findOne({});
    if (sampleJob) {
      console.log('\n📄 Sample Job Structure:');
      console.log(`Title: ${sampleJob.title || 'N/A'}`);
      console.log(`Company: ${sampleJob.company || 'N/A'}`);
      console.log(`Skills: ${JSON.stringify(sampleJob.skills) || 'N/A'}`);
      console.log(`Experience: ${sampleJob.experience || 'N/A'}`);
      console.log(`Min Experience: ${sampleJob.miniExperience || sampleJob.minExperience || 'N/A'}`);
      console.log(`Max Experience: ${sampleJob.maxExperience || 'N/A'}`);
    }
    
    // Test users collection
    console.log('\n👥 Testing Users Collection...');
    const usersCollection = await getProfilesCollection();
    const usersCount = await usersCollection.countDocuments();
    console.log(`✅ Users collection accessible - Found ${usersCount} documents`);
    
    // Get a sample user to see the structure
    const sampleUser = await usersCollection.findOne({});
    if (sampleUser) {
      console.log('\n👤 Sample User Structure:');
      console.log(`User ID: ${sampleUser._id}`);
      console.log(`Skills: ${JSON.stringify(sampleUser.skills) || 'N/A'}`);
      console.log(`Experience: ${sampleUser.experience || 'N/A'}`);
      console.log(`Technical Skills: ${JSON.stringify(sampleUser.technicalSkills) || 'N/A'}`);
      console.log(`Years of Experience: ${sampleUser.yearsOfExperience || 'N/A'}`);
      console.log(`Total Experience: ${sampleUser.totalExperience || 'N/A'}`);
      
      // Test profileMatching functions
      console.log('\n🔍 Testing Profile Matching Functions:');
      const extractedSkills = extractUserSkills(sampleUser);
      const extractedExperience = extractUserExperienceYears(sampleUser);
      console.log(`Extracted Skills: ${JSON.stringify(extractedSkills)}`);
      console.log(`Extracted Experience: ${extractedExperience} years`);
      
      // Show all available fields
      console.log('\n📋 Available User Fields:');
      console.log(Object.keys(sampleUser));
    }
    
    // Test job matching collection creation
    console.log('\n🔗 Testing Job Matching Collection...');
    const { connectToDatabase } = await import('./utils/database.js');
    await connectToDatabase();
    
    const JobMatching = (await import('./models/JobMatching.js')).default;
    const matchingCount = await JobMatching.countDocuments();
    console.log(`✅ Job Matching collection accessible - Currently has ${matchingCount} documents`);
    
    console.log('\n🎉 All database connections successful!');
    console.log('\n📊 Summary:');
    console.log(`- Jobs: ${jobsCount} documents`);
    console.log(`- Users: ${usersCount} documents`);
    console.log(`- Existing Job Matching Records: ${matchingCount} documents`);
    
    if (usersCount === 0) {
      console.log('\n⚠️ Warning: No users found in the users collection.');
      console.log('Please ensure your user data is properly stored in the users collection.');
    }
    
    if (jobsCount === 0) {
      console.log('\n⚠️ Warning: No jobs found in the jobs collection.');
      console.log('Please ensure your job data is properly stored in the jobs collection.');
    }
    
  } catch (error) {
    console.error('\n❌ Database connection test failed:');
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

// Run the test
testConnection();
