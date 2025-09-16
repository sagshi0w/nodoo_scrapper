export function buildInsertedJobsEmailHTML(jobs = [], summary = null) {
  const inserted = (summary && Array.isArray(summary.insertedJobs)) ? summary.insertedJobs : [];

  const rows = inserted.map(j => `
    <tr>
      <td style="border:1px solid #ddd;padding:8px;">${j.company || ''}</td>
      <td style="border:1px solid #ddd;padding:8px;">${j.title || ''}</td>
    </tr>
  `).join('');

  const totals = summary || {
    totalScraped: jobs.length,
    totalUnique: jobs.length,
    totalInserted: inserted.length
  };

  const totalsTable = `
    <table style="border-collapse:collapse;width:100%;margin-top:16px;">
      <thead>
        <tr>
          <th style="border:1px solid #ddd;padding:8px;text-align:left;">Metric</th>
          <th style="border:1px solid #ddd;padding:8px;text-align:left;">Count</th>
        </tr>
      </thead>
      <tbody>
        <tr><td style="border:1px solid #ddd;padding:8px;">Total Scraped</td><td style="border:1px solid #ddd;padding:8px;">${totals.totalScraped}</td></tr>
        <tr><td style="border:1px solid #ddd;padding:8px;">Total Unique (by Name and Company)</td><td style="border:1px solid #ddd;padding:8px;">${totals.totalUnique}</td></tr>
        <tr><td style="border:1px solid #ddd;padding:8px;">Total Jobs Inserted to DB</td><td style="border:1px solid #ddd;padding:8px;">${totals.totalInserted}</td></tr>
      </tbody>
    </table>`;

  return `
    <div style="font-family:Arial, sans-serif;">
      <h3 style="margin:0 0 8px 0;">Newly Inserted Jobs</h3>
      <table style="border-collapse:collapse;width:100%;">
        <thead>
          <tr>
            <th style="border:1px solid #ddd;padding:8px;text-align:left;">Company</th>
            <th style="border:1px solid #ddd;padding:8px;text-align:left;">Job Title</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="2" style="border:1px solid #ddd;padding:8px;">No new jobs inserted</td></tr>'}
        </tbody>
      </table>
      <h3 style="margin:16px 0 8px 0;">Summary</h3>
      ${totalsTable}
    </div>
  `;
}


