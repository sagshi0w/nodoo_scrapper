import axios from "axios";
import dotenv from 'dotenv';

dotenv.config();

const BACKEND_URL = process.env.BACKEND_URL;

// Configure axios defaults
axios.defaults.timeout = 30000; // 30 seconds timeout
axios.defaults.headers.common['Content-Type'] = 'application/json';

/**
 * Fetch all jobs from the backend API
 */
export async function fetchAllJobs() {
  if (!BACKEND_URL) {
    throw new Error('BACKEND_URL environment variable is not set');
  }

  try {
    console.log('📡 Fetching all jobs from backend API...');
    const response = await axios.get(`${BACKEND_URL}/api/jobs`);
    
    if (response.data && Array.isArray(response.data)) {
      console.log(`✅ Successfully fetched ${response.data.length} jobs from backend`);
      return response.data;
    } else if (response.data && response.data.jobs && Array.isArray(response.data.jobs)) {
      console.log(`✅ Successfully fetched ${response.data.jobs.length} jobs from backend`);
      return response.data.jobs;
    } else {
      throw new Error('Invalid response format from jobs API');
    }
  } catch (error) {
    console.error('❌ Failed to fetch jobs from backend:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * Fetch all users from the backend API
 */
export async function fetchAllUsers() {
  if (!BACKEND_URL) {
    throw new Error('BACKEND_URL environment variable is not set');
  }

  try {
    console.log('📡 Fetching all users from backend API...');
    const response = await axios.get(`${BACKEND_URL}/api/users`);
    
    if (response.data && Array.isArray(response.data)) {
      console.log(`✅ Successfully fetched ${response.data.length} users from backend`);
      return response.data;
    } else if (response.data && response.data.users && Array.isArray(response.data.users)) {
      console.log(`✅ Successfully fetched ${response.data.users.length} users from backend`);
      return response.data.users;
    } else {
      throw new Error('Invalid response format from users API');
    }
  } catch (error) {
    console.error('❌ Failed to fetch users from backend:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * Save job matching results to the backend API
 */
export async function saveJobMatchingResults(userId, jobIds) {
  if (!BACKEND_URL) {
    throw new Error('BACKEND_URL environment variable is not set');
  }

  try {
    console.log(`💾 Saving job matching results for user ${userId}...`);
    const response = await axios.post(`${BACKEND_URL}/api/job-matching`, {
      userId,
      recommendations: jobIds
    });
    
    console.log(`✅ Successfully saved job matching results for user ${userId}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to save job matching results for user ${userId}:`, error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * Get job matching results for a specific user from the backend API
 */
export async function getJobMatchingResults(userId) {
  if (!BACKEND_URL) {
    throw new Error('BACKEND_URL environment variable is not set');
  }

  try {
    console.log(`📡 Fetching job matching results for user ${userId}...`);
    const response = await axios.get(`${BACKEND_URL}/api/job-matching/${userId}`);
    
    console.log(`✅ Successfully fetched job matching results for user ${userId}`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log(`ℹ️ No job matching results found for user ${userId}`);
      return null;
    }
    console.error(`❌ Failed to fetch job matching results for user ${userId}:`, error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * Test backend API connectivity
 */
export async function testBackendConnection() {
  if (!BACKEND_URL) {
    throw new Error('BACKEND_URL environment variable is not set');
  }

  try {
    console.log('🔍 Testing backend API connectivity...');
    const response = await axios.get(`${BACKEND_URL}/api/health`);
    console.log('✅ Backend API is accessible');
    return true;
  } catch (error) {
    console.error('❌ Backend API is not accessible:', error.message);
    return false;
  }
}
