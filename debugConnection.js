#!/usr/bin/env node

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGO_URI;

async function debugConnection() {
  try {
    console.log('🔍 Debugging MongoDB Connection...');
    console.log('==================================');
    console.log('URI:', uri);
    
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB via Mongoose');
    console.log('Connection state:', mongoose.connection.readyState);
    console.log('Database name:', mongoose.connection.db?.databaseName);
    console.log('Connection object:', mongoose.connection);
    
    // Test getting a collection
    const db = mongoose.connection.db;
    console.log('DB object:', db);
    
    if (db) {
      const usersCollection = db.collection('users');
      console.log('Users collection:', usersCollection);
      
      const count = await usersCollection.countDocuments();
      console.log(`Users count: ${count}`);
    } else {
      console.log('❌ DB object is undefined');
    }
    
  } catch (error) {
    console.error('❌ Connection error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected');
  }
}

debugConnection();
