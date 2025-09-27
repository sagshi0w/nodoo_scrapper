#!/usr/bin/env node

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGO_URI;

async function listDatabases() {
  try {
    console.log('🔍 Listing All Available Databases...');
    console.log('=====================================');
    console.log('URI:', uri);
    
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB via Mongoose');
    console.log('Current database:', mongoose.connection.db.databaseName);
    
    // List all databases
    const adminDb = mongoose.connection.db.admin();
    const result = await adminDb.listDatabases();
    
    console.log('\n📋 Available Databases:');
    result.databases.forEach(db => {
      console.log(`- ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    
    // Check each database for jobs and users collections
    console.log('\n🔍 Checking each database for jobs and users...');
    
    for (const dbInfo of result.databases) {
      if (dbInfo.name === 'admin' || dbInfo.name === 'local' || dbInfo.name === 'config') {
        continue; // Skip system databases
      }
      
      try {
        const db = mongoose.connection.client.db(dbInfo.name);
        
        const jobsCount = await db.collection('jobs').countDocuments();
        const usersCount = await db.collection('users').countDocuments();
        
        console.log(`\n📁 Database: ${dbInfo.name}`);
        console.log(`   Jobs: ${jobsCount} documents`);
        console.log(`   Users: ${usersCount} documents`);
        
        if (jobsCount > 0 || usersCount > 0) {
          console.log(`   ✅ Found data in ${dbInfo.name}!`);
        }
      } catch (error) {
        console.log(`   ❌ Error checking ${dbInfo.name}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected');
  }
}

listDatabases();
