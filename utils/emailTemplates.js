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


