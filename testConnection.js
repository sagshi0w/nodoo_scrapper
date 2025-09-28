#!/usr/bin/env node

import { connectToDatabase, getJobsCollection, getProfilesCollection, closeDatabase } from './utils/database.js';
import { extractUserSkills, extractUserExperienceYears } from './utils/profileMatching.js';
import JobMatching from './models/JobMatching.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testConnection() {
  try {
    console.log('🔍 Testing MongoDB Connection and Data Access...');
    console.log('===============================================');
    
    // Test jobs collection
    console.log('\n📋 Testing Jobs Collection...');
    const jobsCollection = await getJobsCollection();
    const jobsCount = await jobsCollection.countDocuments();
    console.log(`✅ Jobs collection accessible - Found ${jobsCount} documents`);
    
    // Test profiles collection
    console.log('\n👥 Testing Profiles Collection...');
    const profilesCollection = await getProfilesCollection();
    const profilesCount = await profilesCollection.countDocuments();
    console.log(`✅ Profiles collection accessible - Found ${profilesCount} documents`);
    
    // Test JobMatching model
    console.log('\n🔗 Testing JobMatching Model...');
    const jobMatchingCount = await JobMatching.countDocuments();
    console.log(`✅ JobMatching model accessible - Found ${jobMatchingCount} documents`);
    
    // Test profile matching functions
    console.log('\n🧠 Testing Profile Matching Functions...');
    
    // Get a sample profile with skills
    const sampleProfile = await profilesCollection.findOne({
      $or: [
        { 'profileData.skills': { $exists: true, $ne: [] } },
        { 'resumeData.skills': { $exists: true, $ne: [] } }
      ]
    });
    
    if (sampleProfile) {
      console.log(`✅ Found sample profile: ${sampleProfile.name || sampleProfile.email || 'Unknown'}`);
      
      const skills = extractUserSkills(sampleProfile);
      const experience = extractUserExperienceYears(sampleProfile);
      
      console.log(`✅ Skills extracted: ${skills.length} skills found`);
      console.log(`✅ Experience extracted: ${experience} years`);
      
      if (skills.length > 0) {
        console.log(`   Sample skills: ${skills.slice(0, 3).join(', ')}${skills.length > 3 ? '...' : ''}`);
      }
    } else {
      console.log('⚠️ No profile with skills found for testing');
    }
    
    // Test a sample job
    console.log('\n💼 Testing Sample Job...');
    const sampleJob = await jobsCollection.findOne({});
    if (sampleJob) {
      console.log(`✅ Found sample job: ${sampleJob.title || 'Unknown Title'}`);
      console.log(`   Company: ${sampleJob.company || 'Unknown'}`);
      console.log(`   Experience: ${sampleJob.experience || 'Not specified'}`);
    } else {
      console.log('⚠️ No jobs found for testing');
    }
    
    console.log('\n✅ All tests passed! MongoDB connection and data access working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await closeDatabase();
  }
}

// Run the test
testConnection()
  .then(() => {
    console.log('\n🎉 Connection test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Connection test failed:', error.message);
    process.exit(1);
  });