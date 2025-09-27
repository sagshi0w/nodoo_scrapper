#!/usr/bin/env node

import { connectToDatabase, closeDatabase } from './utils/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkCollections() {
  try {
    console.log('🔍 Checking All Collections in Database...');
    console.log('==========================================');
    
    await connectToDatabase();
    
    // Get all collection names
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    console.log(`\n📋 Found ${collections.length} collections:`);
    
    for (const collection of collections) {
      console.log(`\n📁 Collection: ${collection.name}`);
      
      try {
        const count = await mongoose.connection.db.collection(collection.name).countDocuments();
        console.log(`   Documents: ${count}`);
        
        if (count > 0) {
          // Get a sample document
          const sample = await mongoose.connection.db.collection(collection.name).findOne({});
          console.log(`   Sample fields: ${Object.keys(sample || {}).join(', ')}`);
          
          // If this looks like it might contain user data, show more details
          if (collection.name.toLowerCase().includes('user') || 
              collection.name.toLowerCase().includes('profile') ||
              (sample && (sample.skills || sample.experience || sample.profileData || sample.resumeData))) {
            console.log(`   🔍 Potential user/profile data found!`);
            console.log(`   Sample: ${JSON.stringify(sample, null, 2).substring(0, 500)}...`);
          }
        }
      } catch (error) {
        console.log(`   ❌ Error accessing collection: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Error checking collections:', error);
  } finally {
    await closeDatabase();
  }
}

checkCollections();
