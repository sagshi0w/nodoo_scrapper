## Update Skills Script (utils/updateSkills.js)

This script recalculates the `skills` field for jobs in MongoDB using the stored job `description` and the extractor in `utils/extractData.js`.

### Prerequisites
- Node 18+
- Env vars (via `.env` or CLI flags):
  - `MONGO_URI`
  - `MONGO_DB_NAME`
  - `MONGO_DB_COLLECTION_NAME`

You can override these per-run with flags: `--uri`, `--db`, `--col`.

### Install deps
```bash
npm install
```

### Single job modes

1) By MongoDB _id
```bash
node utils/updateSkills.js --id <hexObjectId> \
  --uri "<MONGO_URI>" --db "<DB_NAME>" --col "<COLLECTION_NAME>"
```

2) By title only (case-insensitive, exact or contains)
```bash
node utils/updateSkills.js "<job title>" \
  --uri "<MONGO_URI>" --db "<DB_NAME>" --col "<COLLECTION_NAME>"
```

3) By title + company
```bash
node utils/updateSkills.js "<job title>" "<company name>" \
  --uri "<MONGO_URI>" --db "<DB_NAME>" --col "<COLLECTION_NAME>"
```

Notes:
- The script tries: exact → case-insensitive exact → contains → tokenized search.
- Company can also match `companyName` if present.

### Bulk mode (all jobs)

Process the whole collection (uses stored descriptions):
```bash
node utils/updateSkills.js --all \
  --uri "<MONGO_URI>" --db "<DB_NAME>" --col "<COLLECTION_NAME>"
```

Optional filters (contains, case-insensitive):
```bash
# Only titles containing "UX" or "UI"
node utils/updateSkills.js --all --title "UX|UI" \
  --uri "<MONGO_URI>" --db "<DB_NAME>" --col "<COLLECTION_NAME>"

# Only a company (or companyName) containing "Google"
node utils/updateSkills.js --all --company "Google" \
  --uri "<MONGO_URI>" --db "<DB_NAME>" --col "<COLLECTION_NAME>"
```

Progress logs are printed every 100 documents and a final summary is shown:
```
Progress: processed=1200, updated=1163, unchanged=37
Done. processed=9298, updated=8572, unchanged=726
```

### Behavior
- Reads the existing `description` from each job.
- Computes skills via `extractSkillsAndExperience` (exact word matches first, then controlled morphological fallbacks).
- Updates the document only if `skills` changed.
- Case-insensitive de-duplication (e.g., `Jira` vs `JIRA`).
- Safeguards reduce false positives (e.g., “Go” as a verb).

### Examples
```bash
# Specific job by id
node utils/updateSkills.js --id 68b9f18d36233d441a7b80d9 --uri "..." --db test --col jobs

# Title + company
node utils/updateSkills.js "Sr. UX Designer" "MotivityLabs" --uri "..." --db test --col jobs

# Bulk: all Salesforce roles
node utils/updateSkills.js --all --title "Salesforce|SFDC" --uri "..." --db test --col jobs
```

### Tips
- If a job isn’t found by title, the script prints nearby matches to help refine inputs.
- To dry-run, you can comment out the `updateOne` line in the script temporarily.


