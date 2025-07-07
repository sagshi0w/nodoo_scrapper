import axios from "axios";

// Update the URL to your backend POST route
const API_URL = "http://localhost:5000/api/jobs/bulk-replace";

/**
 * Send an array of jobs to the backend in bulk.
 * @param {Array} jobs - Array of job objects to send.
 */
export default async function sendToBackend(jobs) {
  if (!Array.isArray(jobs)) {
    throw new Error("Input to sendToBackend must be an array of jobs.");
  }
  try {
    const response = await axios.post(API_URL, jobs);
    console.log(`✅ Sent ${jobs.length} jobs to backend. Response:`, response.data);
  } catch (err) {
    console.error("❌ Error sending jobs to backend:", err.message);
  }
}
