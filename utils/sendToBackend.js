import axios from "axios";

const API_URL = "http://localhost:5000/api/jobs/bulk-replace";
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Configure default axios settings
axios.defaults.timeout = 10000; // 10 second timeout
axios.defaults.headers.common['Content-Type'] = 'application/json';

/**
 * Send an array of jobs to the backend in bulk with retry logic
 * @param {Array} jobs - Array of job objects to send
 * @returns {Promise<Object>} Response from the backend
 * @throws {Error} If request fails after all retries
 */
export default async function sendToBackend(jobs) {
  if (!Array.isArray(jobs)) {
    throw new Error("Input to sendToBackend must be an array of jobs.");
  }

  if (jobs.length === 0) {
    console.warn("⚠️ No jobs to send - empty array provided");
    return;
  }

  const requestConfig = {
    url: API_URL,
    method: 'POST',
    data: jobs
  };

  console.log(`📤 Attempting to send ${jobs.length} jobs to backend...`);
  console.debug("Request payload:", {
    url: API_URL,
    data: jobs.slice(0, 3), // Log first 3 jobs to avoid cluttering
    count: jobs.length
  });

  try {
    const response = await retryableRequest(requestConfig);
    console.log(`✅ Successfully sent ${jobs.length} jobs. Response:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to send jobs after ${MAX_RETRIES} attempts`);
    
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error('Server responded with:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request
      console.error('Request setup error:', error.message);
    }
    
    throw new Error(`Failed to send jobs: ${error.message}`);
  }
}

/**
 * Wrapper with retry logic for axios requests
 * @param {Object} config - Axios request config
 * @param {number} retriesLeft - Number of retries remaining
 * @param {number} delay - Current retry delay in ms
 * @returns {Promise<Object>} Axios response
 */
async function retryableRequest(config, retriesLeft = MAX_RETRIES, delay = INITIAL_RETRY_DELAY) {
  try {
    const response = await axios(config);
    return response;
  } catch (error) {
    if (shouldRetry(error) && retriesLeft > 0) {
      console.warn(`⚠️ Retrying (${MAX_RETRIES - retriesLeft + 1}/${MAX_RETRIES}) in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryableRequest(config, retriesLeft - 1, delay * 2); // Exponential backoff
    }
    throw error; // No retries left or non-retryable error
  }
}

/**
 * Determine if a request should be retried
 * @param {Error} error - Axios error
 * @returns {boolean} True if request should be retried
 */
function shouldRetry(error) {
  // Retry on network errors or 5xx server errors
  return !error.response || 
    (error.response.status >= 500 && error.response.status < 600);
}