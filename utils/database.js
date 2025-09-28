import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGO_URI;
const dbName = 'test'; // Force to use 'test' database where the data is located
const collectionName = process.env.MONGO_DB_COLLECTION_NAME || 'jobs'; // Default to 'jobs' if not specified

let isConnected = false;

export async function connectToDatabase() {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }
  
  // Validate MongoDB URI
  if (!uri) {
    throw new Error('MONGO_URI environment variable is not set');
  }
  
  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    throw new Error(`Invalid MongoDB URI format. Expected to start with "mongodb://" or "mongodb+srv://", but got: ${uri ? uri.substring(0, 20) + '...' : 'undefined'}`);
  }
  
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        dbName: dbName // Connect to the correct database
      });
    }
    
    // Wait for connection to be ready
    await new Promise((resolve, reject) => {
      if (mongoose.connection.readyState === 1) {
        resolve();
      } else {
        mongoose.connection.once('open', resolve);
        mongoose.connection.once('error', reject);
      }
    });
    
    isConnected = true;
    console.log(`Connected to MongoDB via Mongoose (database: ${dbName})`);
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function getJobsCollection() {
  await connectToDatabase();
  return mongoose.connection.db.collection(collectionName);
}

export async function getProfilesCollection() {
  await connectToDatabase();
  return mongoose.connection.db.collection('users'); // Using 'users' collection as per your database structure
}

export async function closeDatabase() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('Disconnected from MongoDB');
  }
}
