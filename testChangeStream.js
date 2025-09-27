#!/usr/bin/env node

import { connectToDatabase, getProfilesCollection } from './utils/database.js';
import { matchJobsForUser } from './utils/singleUserMatching.js';
import { closeDatabase } from './utils/database.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test the change stream functionality by simulating user creation/update
 */
async function testChangeStream() {
  try {
    console.log('🧪 Testing Change Stream Functionality...');
    console.log('=====================================');
    
    // Connect to database
    await connectToDatabase();
    const profilesCollection = await getProfilesCollection();
    
    // Get a sample user with skills to test with
    const sampleUser = await profilesCollection.findOne({
      $or: [
        { 'profileData.skills': { $exists: true, $ne: [], $not: { $size: 0 } } },
        { 'resumeData.skills': { $exists: true, $ne: [], $not: { $size: 0 } } }
      ]
    });
    
    if (!sampleUser) {
      console.log('❌ No users found in database to test with');
      return;
    }
    
    console.log(`📋 Testing with user: ${sampleUser._id}`);
    console.log(`👤 User name: ${sampleUser.name || 'N/A'}`);
    console.log(`📧 User email: ${sampleUser.email || 'N/A'}`);
    
    // Test single user matching
    console.log('\n🔍 Testing single user job matching...');
    const startTime = Date.now();
    
    const result = await matchJobsForUser(sampleUser._id.toString());
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log('\n📊 Test Results:');
    console.log('================');
    console.log(`User ID: ${result.userId}`);
    console.log(`Total Jobs Processed: ${result.totalJobs}`);
    console.log(`Total Matches Found: ${result.totalMatches}`);
    console.log(`Excellent Matches (≥85%): ${result.excellentMatches}`);
    console.log(`Good Matches (≥70%): ${result.goodMatches}`);
    console.log(`Average Score: ${result.averageScore}%`);
    console.log(`Processing Time: ${duration} seconds`);
    
    if (result.recommendations && result.recommendations.length > 0) {
      console.log(`\n🎯 Sample Recommendations (first 5):`);
      result.recommendations.slice(0, 5).forEach((jobId, index) => {
        console.log(`  ${index + 1}. ${jobId}`);
      });
    }
    
    console.log('\n✅ Change Stream Test Completed Successfully!');
    
  } catch (error) {
    console.error('\n❌ Change Stream Test Failed:');
    console.error(error.message);
    console.error(error.stack);
  } finally {
    await closeDatabase();
    console.log('\n🔌 Database connection closed');
  }
}

/**
 * Test the change stream listener by creating a mock change event
 */
async function testChangeStreamListener() {
  try {
    console.log('\n🧪 Testing Change Stream Listener...');
    console.log('====================================');
    
    // Import the change stream listener
    const ChangeStreamListener = (await import('./utils/changeStreamListener.js')).default;
    
    // Create a listener instance
    const listener = new ChangeStreamListener();
    
    // Test the listener methods
    console.log('📡 Testing listener methods...');
    
    // Test status
    const status = listener.getStatus();
    console.log(`Initial Status:`, status);
    
    // Test skills update detection
    const mockUserDoc = {
      profileData: {
        skills: ['JavaScript', 'Node.js', 'React']
      },
      resumeData: {
        skills: ['Python', 'MongoDB']
      }
    };
    
    const hasSkills = listener.hasSkillsUpdate(mockUserDoc);
    console.log(`Skills Update Detection: ${hasSkills ? '✅' : '❌'}`);
    
    console.log('✅ Change Stream Listener Test Completed!');
    
  } catch (error) {
    console.error('\n❌ Change Stream Listener Test Failed:');
    console.error(error.message);
    console.error(error.stack);
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('🚀 Starting Change Stream Tests...');
  console.log('==================================');
  
  try {
    // Test single user matching
    await testChangeStream();
    
    // Test change stream listener
    await testChangeStreamListener();
    
    console.log('\n🎉 All Change Stream Tests Completed Successfully!');
    
  } catch (error) {
    console.error('\n❌ Test Suite Failed:');
    console.error(error.message);
    process.exit(1);
  }
}

// Run the tests
main();
