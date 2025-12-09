export function buildInsertedJobsEmailHTML(jobs = [], summary = null) {
  const perCompany = (summary && summary.perCompany) ? summary.perCompany : {};
  const insertedJobs = (summary && Array.isArray(summary.insertedJobs)) ? summary.insertedJobs : [];

  const companySet = new Set([
    ...Object.keys(perCompany),
    ...insertedJobs.map(j => j.company || 'Unknown')
  ].filter(Boolean));

  const companyRows = Array.from(companySet).sort().map((companyName, index) => {
    const stats = perCompany[companyName] || { scraped: 0, unique: 0 };
    const insertedCount = insertedJobs.filter(j => (j.company || 'Unknown') === companyName).length;
    return `
      <tr>
        <td style="border:1px solid #ddd;padding:8px;">${index + 1}</td>
        <td style="border:1px solid #ddd;padding:8px;">${companyName}</td>
        <td style="border:1px solid #ddd;padding:8px;">${stats.scraped}</td>
        <td style="border:1px solid #ddd;padding:8px;">${stats.unique}</td>
        <td style="border:1px solid #ddd;padding:8px;">${insertedCount}</td>
      </tr>`;
  }).join('');

  const bodyRows = companyRows || '<tr><td colspan="5" style="border:1px solid #ddd;padding:8px;">No companies to display</td></tr>';

  return `
    <div style="font-family:Arial, sans-serif;">
      <h3 style="margin:0 0 8px 0;">Job Insert Summary</h3>
      <table style="border-collapse:collapse;width:100%;">
        <thead>
          <tr>
            <th style="border:1px solid #ddd;padding:8px;text-align:left;">SR No</th>
            <th style="border:1px solid #ddd;padding:8px;text-align:left;">Company</th>
            <th style="border:1px solid #ddd;padding:8px;text-align:left;">Total Scraped</th>
            <th style="border:1px solid #ddd;padding:8px;text-align:left;">Total Unique</th>
            <th style="border:1px solid #ddd;padding:8px;text-align:left;">Total Inserted</th>
          </tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Build HTML table for actively hiring companies
 * @param {Array} activelyHiringCompanies - Array of company objects with name, recentJobsCount, totalJobs
 * @returns {string} HTML string with table
 */
export function buildActivelyHiringEmailHTML(activelyHiringCompanies = []) {
  const companyRows = activelyHiringCompanies.length > 0
    ? activelyHiringCompanies.map((company, index) => `
      <tr>
        <td style="border:1px solid #ddd;padding:8px;">${index + 1}</td>
        <td style="border:1px solid #ddd;padding:8px;">${company.name || 'Unknown'}</td>
        <td style="border:1px solid #ddd;padding:8px;">${company.recentJobsCount || 0}</td>
        <td style="border:1px solid #ddd;padding:8px;">${company.totalJobs || 0}</td>
      </tr>`).join('')
    : '<tr><td colspan="4" style="border:1px solid #ddd;padding:8px;text-align:center;">No companies actively hiring</td></tr>';

  return `
    <div style="font-family:Arial, sans-serif;">
      <h3 style="margin:0 0 8px 0;">Actively Hiring Companies</h3>
      <table style="border-collapse:collapse;width:100%;">
        <thead>
          <tr>
            <th style="border:1px solid #ddd;padding:8px;text-align:left;background-color:#f2f2f2;">SR No</th>
            <th style="border:1px solid #ddd;padding:8px;text-align:left;background-color:#f2f2f2;">Company Name</th>
            <th style="border:1px solid #ddd;padding:8px;text-align:left;background-color:#f2f2f2;">Recent Jobs (48hrs)</th>
            <th style="border:1px solid #ddd;padding:8px;text-align:left;background-color:#f2f2f2;">Total Jobs</th>
          </tr>
        </thead>
        <tbody>
          ${companyRows}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Build HTML table for job matching users with their details
 * @param {Array} usersWithMatches - Array of user objects with userId, name, skills, jobCount
 * @returns {string} HTML string with table
 */
export function buildJobMatchingUsersEmailHTML(usersWithMatches = []) {
  const userRows = usersWithMatches.length > 0
    ? usersWithMatches.map((user, index) => `
      <tr>
        <td style="border:1px solid #ddd;padding:8px;">${index + 1}</td>
        <td style="border:1px solid #ddd;padding:8px;">${user.name || 'Unknown'}</td>
        <td style="border:1px solid #ddd;padding:8px;">${user.skills || 'N/A'}</td>
        <td style="border:1px solid #ddd;padding:8px;">${user.jobCount || 0}</td>
      </tr>`).join('')
    : '<tr><td colspan="4" style="border:1px solid #ddd;padding:8px;text-align:center;">No users with matches</td></tr>';

  return `
    <div style="font-family:Arial, sans-serif;">
      <h3 style="margin:0 0 8px 0;">Users with Job Matches</h3>
      <table style="border-collapse:collapse;width:100%;">
        <thead>
          <tr>
            <th style="border:1px solid #ddd;padding:8px;text-align:left;background-color:#f2f2f2;">SR No</th>
            <th style="border:1px solid #ddd;padding:8px;text-align:left;background-color:#f2f2f2;">User Name</th>
            <th style="border:1px solid #ddd;padding:8px;text-align:left;background-color:#f2f2f2;">Skills</th>
            <th style="border:1px solid #ddd;padding:8px;text-align:left;background-color:#f2f2f2;">Jobs Found</th>
          </tr>
        </thead>
        <tbody>
          ${userRows}
        </tbody>
      </table>
    </div>
  `;
}


