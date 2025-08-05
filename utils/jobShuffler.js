export default function shuffleJobsAvoidStackingSameCompany(jobs) {
  if (!Array.isArray(jobs)) return [];

  // Group jobs by company
  const companyMap = new Map();
  for (const job of jobs) {
    const company = job.company;
    if (!companyMap.has(company)) companyMap.set(company, []);
    companyMap.get(company).push(job);
  }

  // Create a list of companies (keys) and shuffle them
  const companyQueue = Array.from(companyMap.keys());
  shuffleArray(companyQueue);

  const result = [];
  let lastCompany = null;

  while (result.length < jobs.length) {
    let inserted = false;

    for (let i = 0; i < companyQueue.length; i++) {
      const company = companyQueue[i];
      if (company === lastCompany) continue;

      const jobList = companyMap.get(company);
      if (jobList && jobList.length > 0) {
        const job = jobList.shift();
        result.push(job);
        lastCompany = company;
        inserted = true;

        // Move this company to the end
        companyQueue.splice(i, 1);
        companyQueue.push(company);
        break;
      }
    }

    // Fallback: allow stacking if unavoidable
    if (!inserted) {
      for (const company of companyQueue) {
        const jobList = companyMap.get(company);
        if (jobList && jobList.length > 0) {
          const job = jobList.shift();
          result.push(job);
          lastCompany = company;
          break;
        }
      }
    }
  }

  return result;
}

/**
 * In-place Fisher-Yates shuffle
 */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
