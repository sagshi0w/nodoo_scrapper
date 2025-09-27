# Job Matching System Setup Guide

## Overview
This system fetches all jobs and profiles from the database, calculates matching scores based on skills and experience, and saves the results in the `jobMatching` collection.

## Environment Variables Required

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
MONGO_URI=mongodb://localhost:27017/your_database_name
MONGO_DB_NAME=your_database_name
MONGO_DB_COLLECTION_NAME=jobs

# Backend API Configuration
BACKEND_URL=http://localhost:3000

# Email Configuration (for notifications)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_RECIPIENTS=recipient1@gmail.com,recipient2@gmail.com

# Scraping Configuration
HEADLESS=true
```

## Database Collections

### Jobs Collection
The system expects jobs to be stored in the collection specified by `MONGO_DB_COLLECTION_NAME` (default: "jobs").

Expected job fields:
- `_id`: Job ID
- `title`: Job title
- `company`: Company name
- `location`: Job location
- `url`: Job URL
- `skills`: Array of required skills (or string)
- `experience`: Experience requirement (string)
- `miniExperience` / `minExperience`: Minimum experience (number)
- `maxExperience`: Maximum experience (number)

### Users Collection
The system expects user profiles to be stored in a "users" collection.

Expected user fields:
- `_id`: User ID
- `skills`: Array of user skills (or string)
- `experience`: User experience (string or number)
- `technicalSkills`: Technical skills array (optional)
- `skillSet`: Alternative skills field (optional)
- `yearsOfExperience`: User experience in years (optional)
- `totalExperience`: Total experience (optional)

### JobMatching Collection
Results are saved to the "jobMatchings" collection (Mongoose model) with the following schema:

```javascript
{
  userId: ObjectId, // Reference to User model
  recommendations: [ObjectId], // Array of job IDs that match the user
  createdAt: Date, // Automatically added by timestamps
  updatedAt: Date // Automatically updated on each save
}
```

**Key Features:**
- **One record per user**: Each user has exactly one job matching record
- **Array of job IDs**: All matching jobs are stored as an array of ObjectIds
- **Efficient querying**: Indexed on userId and updatedAt for fast lookups
- **Upsert behavior**: Updates existing record or creates new one
- **Automatic timestamps**: createdAt and updatedAt managed by Mongoose

## Usage

### Run Job Matching Process (One-time)
```bash
npm run job-matching
```

### Run Job Matching Scheduler (Daily Cron Job)
```bash
# Start the daily scheduler (runs at 6:00 AM IST)
npm run job-matching-scheduler

# Test the scheduler by running immediately
npm run job-matching-test
```

### Using PM2 for Production
```bash
# Start the job matching scheduler with PM2
pm2 start jobMatchingScheduler.js --name job-matching-scheduler

# Stop the scheduler
pm2 stop job-matching-scheduler

# Restart the scheduler
pm2 restart job-matching-scheduler

# View logs
pm2 logs job-matching-scheduler

# Save PM2 configuration
pm2 save && pm2 startup
```

### Using GitHub Actions (Recommended)
The system includes GitHub Actions workflows for automated execution:

#### Main Job Matching Workflow
- **File**: `.github/workflows/jobMatching.yml`
- **Schedule**: Daily at 6:00 AM IST (00:30 UTC)
- **Manual Trigger**: Available via GitHub Actions UI
- **Features**: 
  - Automatic job matching execution
  - Email notifications on success/failure
  - Environment variable configuration via secrets

#### Test Workflow
- **File**: `.github/workflows/jobMatchingTest.yml`
- **Schedule**: Manual trigger only
- **Test Types**:
  - `connection`: Test database connectivity
  - `matching`: Test complete job matching process
- **Features**: Email notifications with test results

#### Required GitHub Secrets
Configure these secrets in your GitHub repository settings:
```
MONGO_URI - MongoDB connection string
MONGO_DB_NAME - Database name (e.g., "test")
MONGO_DB_COLLECTION_NAME - Jobs collection name (e.g., "jobs")
MAIL_USERNAME - Email username for notifications
MAIL_PASSWORD - Email password/app password
MAIL_RECIPIENTS - Comma-separated email recipients
```

### Import Functions in Your Code
```javascript
import { performJobMatching } from './utils/jobMatching.js';
import { fetchAllJobs, fetchAllProfiles } from './utils/jobMatching.js';

// Run complete matching process
const results = await performJobMatching();

// Or use individual functions
const jobs = await fetchAllJobs();
const profiles = await fetchAllProfiles();
```

## Matching Algorithm

This system uses the existing `utils/profileMatching.js` functions for consistent matching logic across your platform.

### Scoring System (from profileMatching.js)
- **Overall Score**: Weighted combination of skills (70%) and experience (30%)
- **Skills Matching**: Percentage of job skills that match user skills (normalized, case-insensitive)
- **Experience Matching**: Sophisticated logic handling ranges, overqualification, and underqualification

### Score Thresholds
- **Excellent Match**: ≥85% overall score
- **Good Match**: ≥70% overall score
- **Minimum Match**: ≥40% overall score (saved to database)

### Skills Matching Logic (from profileMatching.js)
- Normalizes skills from various formats (arrays, strings, comma-separated)
- Case-insensitive comparison
- Handles multiple skill field names (`skills`, `technicalSkills`, `skillSet`)
- Extracts skills from both `profileData.skills` and `resumeData.skills`

### Experience Matching Logic (from profileMatching.js)
- Parses experience ranges (e.g., "2-4 years", "5+ years", "3")
- Computes total experience from `resumeData.totalExperienceYears` or calculates from experience items
- Sophisticated scoring:
  - Within range: 100%
  - Underqualified: max(0, 100 - (gap × 20))
  - Overqualified: max(60, 100 - (overage × 5))

## Features

1. **Flexible Data Extraction**: Handles various field names and formats for skills and experience
2. **Comprehensive Matching**: Considers both technical skills and experience requirements
3. **Scalable Processing**: Efficiently processes large numbers of jobs and profiles
4. **Detailed Results**: Provides comprehensive matching details for analysis
5. **Database Integration**: Seamlessly integrates with existing MongoDB setup
6. **Automated Scheduling**: Daily cron job runs at 6:00 AM IST
7. **GitHub Actions Integration**: Automated workflows with scheduling and testing
8. **Email Notifications**: Sends success/failure notifications with detailed reports
9. **Graceful Error Handling**: Robust error handling and recovery
10. **PM2 Support**: Production-ready with PM2 process management
11. **Test Mode**: Ability to run immediately for testing
12. **Multiple Deployment Options**: Local, PM2, or GitHub Actions execution

## Error Handling

The system includes comprehensive error handling for:
- Database connection issues
- Missing or malformed data
- Processing errors
- Graceful cleanup and connection closure

## Performance Considerations

- Processes profiles against all jobs (O(profiles × jobs) complexity)
- Only saves matches with score ≥50% to reduce database size
- Uses efficient MongoDB queries and bulk operations
- Includes progress logging for monitoring large datasets
