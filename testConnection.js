#!/usr/bin/env node

import { testBackendConnection, fetchAllJobs, fetchAllUsers } from './utils/backendApi.js';
import { extractUserSkills, extractUserExperienceYears } from './utils/profileMatching.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testConnection() {
  try {
    console.log('🔍 Testing Backend API Connection and Data Access...');
    console.log('===================================================');
    
    // Test backend connectivity
    console.log('\n🌐 Testing Backend API Connectivity...');
    const isConnected = await testBackendConnection();
    if (!isConnected) {
      throw new Error('Backend API is not accessible');
    }
    console.log('✅ Backend API is accessible');
    
    // Test jobs API
    console.log('\n📋 Testing Jobs API...');
    const jobs = await fetchAllJobs();
    console.log(`✅ Jobs API accessible - Found ${jobs.length} jobs`);
    
    // Test users API
    console.log('\n👥 Testing Users API...');
    const users = await fetchAllUsers();
    console.log(`✅ Users API accessible - Found ${users.length} users`);
    
    // Test profile matching functions
    console.log('\n🧠 Testing Profile Matching Functions...');
    
    // Get a sample user with skills
    const sampleUser = users.find(user => 
      (user.profileData && user.profileData.skills && user.profileData.skills.length > 0) ||
      (user.resumeData && user.resumeData.skills && user.resumeData.skills.length > 0)
    );
    
    if (sampleUser) {
      console.log(`✅ Found sample user: ${sampleUser.name || sampleUser.email || 'Unknown'}`);
      
      const skills = extractUserSkills(sampleUser);
      const experience = extractUserExperienceYears(sampleUser);
      
      console.log(`✅ Skills extracted: ${skills.length} skills found`);
      console.log(`✅ Experience extracted: ${experience} years`);
      
      if (skills.length > 0) {
        console.log(`   Sample skills: ${skills.slice(0, 3).join(', ')}${skills.length > 3 ? '...' : ''}`);
      }
    } else {
      console.log('⚠️ No user with skills found for testing');
    }
    
    // Test a sample job
    console.log('\n💼 Testing Sample Job...');
    if (jobs.length > 0) {
      const sampleJob = jobs[0];
      console.log(`✅ Found sample job: ${sampleJob.title || 'Unknown Title'}`);
      console.log(`   Company: ${sampleJob.company || 'Unknown'}`);
      console.log(`   Experience: ${sampleJob.experience || 'Not specified'}`);
    } else {
      console.log('⚠️ No jobs found for testing');
    }
    
    console.log('\n✅ All tests passed! Backend API connection and data access working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
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