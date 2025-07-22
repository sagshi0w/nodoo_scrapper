import axios from "axios";
import dotenv from 'dotenv';
dotenv.config();

const BACKEND_URL = process.env.BACKEND_URL;

const API_URL = `${BACKEND_URL}/api/jobs/bulk-replace`;
console.log("API_URL", API_URL);

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;
const BATCH_SIZE = 100; // Adjust based on your backend’s limit

axios.defaults.timeout = 10000;
axios.defaults.headers.common['Content-Type'] = 'application/json';

export default async function sendToBackend(jobs) {
  if (!Array.isArray(jobs)) {
    throw new Error("Input to sendToBackend must be an array of jobs.");
  }

  if (jobs.length === 0) {
    console.warn("⚠️ No jobs to send - empty array provided");
    return;
  }

  // Deduplicate jobs by URL
  const uniqueJobs = Array.from(new Map(jobs.map(job => [job.url, job])).values());
  console.log(`📦 Preparing to send ${uniqueJobs.length} jobs in batches of ${BATCH_SIZE}...`);

  let totalSent = 0;

  for (let i = 0; i < uniqueJobs.length; i += BATCH_SIZE) {
    const batch = uniqueJobs.slice(i, i + BATCH_SIZE);
    const requestConfig = {
      url: API_URL,
      method: 'POST',
      data: batch,
    };

    console.log(`📤 Sending batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} jobs`);

    try {
      const response = await retryableRequest(requestConfig);
      console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} success:`, response.data);
      totalSent += batch.length;
    } catch (error) {
      console.error(`❌ Failed to send batch ${Math.floor(i / BATCH_SIZE) + 1}`);

      if (error.response) {
        console.error('Server responded with:', {
          status: error.response.status,
          data: error.response.data
        });
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Request setup error:', error.message);
      }

      // Optional: continue to next batch instead of throwing
      // throw new Error(`Failed to send jobs: ${error.message}`);
    }
  }

  console.log(`✅ Finished sending jobs: ${totalSent}/${uniqueJobs.length}`);
}

async function retryableRequest(config, retriesLeft = MAX_RETRIES, delay = INITIAL_RETRY_DELAY) {
  try {
    return await axios(config);
  } catch (error) {
    if (shouldRetry(error) && retriesLeft > 0) {
      console.warn(`⚠️ Retrying in ${delay}ms... (${MAX_RETRIES - retriesLeft + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryableRequest(config, retriesLeft - 1, delay * 2);
    }
    throw error;
  }
}

function shouldRetry(error) {
  if (!error.response) return true;
  const status = error.response.status;
  return status >= 500 && status < 600;
}
