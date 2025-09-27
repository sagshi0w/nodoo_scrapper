#!/usr/bin/env node

import { getProfilesCollection, closeDatabase } from './utils/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function findUsersWithProfiles() {
  try {
    console.log('🔍 Finding Users with Profile Data...');
    console.log('=====================================');
    
    const usersCollection = await getProfilesCollection();
    
    // Find users with profileData
    const usersWithProfileData = await usersCollection.find({
      "profileData": { $exists: true }
    }).toArray();
    
    console.log(`\n📊 Found ${usersWithProfileData.length} users with profileData`);
    
    // Find users with resumeData
    const usersWithResumeData = await usersCollection.find({
      "resumeData": { $exists: true }
    }).toArray();
    
    console.log(`📊 Found ${usersWithResumeData.length} users with resumeData`);
    
    // Find users with skills
    const usersWithSkills = await usersCollection.find({
      $or: [
        { "profileData.skills": { $exists: true, $ne: [] } },
        { "resumeData.skills": { $exists: true, $ne: [] } }
      ]
    }).toArray();
    
    console.log(`📊 Found ${usersWithSkills.length} users with skills`);
    
    if (usersWithSkills.length > 0) {
      console.log('\n👥 Users with skills:');
      
      usersWithSkills.forEach((user, index) => {
        console.log(`\n👤 User ${index + 1}: ${user.name}`);
        console.log(`ID: ${user._id}`);
        
        if (user.profileData && user.profileData.skills && user.profileData.skills.length > 0) {
          console.log(`✅ Profile Skills: ${user.profileData.skills.join(', ')}`);
        }
        
        if (user.resumeData && user.resumeData.skills && user.resumeData.skills.length > 0) {
          console.log(`✅ Resume Skills: ${user.resumeData.skills.join(', ')}`);
        }
        
        if (user.profileData && user.profileData.experience && user.profileData.experience.length > 0) {
          console.log(`✅ Profile Experience: ${user.profileData.experience.length} entries`);
        }
        
        if (user.resumeData && user.resumeData.experience && user.resumeData.experience.length > 0) {
          console.log(`✅ Resume Experience: ${user.resumeData.experience.length} entries`);
        }
      });
    } else {
      console.log('\n⚠️ No users found with skills data');
      console.log('This means the job matching will not find any matches.');
    }
    
  } catch (error) {
    console.error('Error finding users with profiles:', error);
  } finally {
    await closeDatabase();
  }
}

findUsersWithProfiles();
