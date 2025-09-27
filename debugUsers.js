#!/usr/bin/env node

import { getProfilesCollection, closeDatabase } from './utils/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function debugUsers() {
  try {
    console.log('🔍 Debugging User Data Structure...');
    console.log('====================================');
    
    const usersCollection = await getProfilesCollection();
    const users = await usersCollection.find({}).limit(5).toArray();
    
    console.log(`\nFound ${users.length} sample users:`);
    
    users.forEach((user, index) => {
      console.log(`\n👤 User ${index + 1}:`);
      console.log(`ID: ${user._id}`);
      console.log(`Name: ${user.name || 'N/A'}`);
      console.log(`Email: ${user.email || 'N/A'}`);
      
      // Check for nested profile data
      if (user.profileData) {
        console.log('✅ Has profileData:', Object.keys(user.profileData));
        if (user.profileData.skills && user.profileData.skills.length > 0) {
          console.log(`   Profile Skills: ${user.profileData.skills.join(', ')}`);
        }
        if (user.profileData.experience && user.profileData.experience.length > 0) {
          console.log(`   Profile Experience: ${user.profileData.experience.length} entries`);
        }
      }
      if (user.resumeData) {
        console.log('✅ Has resumeData:', Object.keys(user.resumeData));
        if (user.resumeData.skills && user.resumeData.skills.length > 0) {
          console.log(`   Resume Skills: ${user.resumeData.skills.join(', ')}`);
        }
        if (user.resumeData.experience && user.resumeData.experience.length > 0) {
          console.log(`   Resume Experience: ${user.resumeData.experience.length} entries`);
        }
      }
      
      // Show all top-level fields
      console.log('📋 All fields:', Object.keys(user));
      
      // Show full structure for first user
      if (index === 0) {
        console.log('\n📄 Full structure of first user:');
        console.log(JSON.stringify(user, null, 2));
      }
    });
    
  } catch (error) {
    console.error('Error debugging users:', error);
  } finally {
    await closeDatabase();
  }
}

debugUsers();
