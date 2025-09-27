import { parseExperienceRange } from "./formatTime.js";

/**
 * Normalizes skills from various formats (array, string, etc.) to a consistent lowercase array
 * @param {any} skills - Skills in any format
 * @returns {string[]} Normalized array of skills
 */
export const normalizeSkills = (skills) => {
  if (!skills) return [];
  if (Array.isArray(skills)) {
    return skills
      .map((s) => (typeof s === "string" ? s.toLowerCase().trim() : `${s}`.toLowerCase().trim()))
      .filter(Boolean);
  }
  return `${skills}`
    .split(/[,;\n]+/)
    .map((s) => s.toLowerCase().trim())
    .filter(Boolean);
};

/**
 * Extracts total experience years from user profile data
 * @param {Object} profile - User profile object
 * @returns {number} Total experience years
 */
export const extractUserExperienceYears = (profile) => {
  if (!profile) return 0;
  
  // Prefer resumeData.totalExperienceYears if present
  const years = profile?.resumeData?.totalExperienceYears;
  if (typeof years === "number" && !Number.isNaN(years)) return years;
  
  // Fallback: compute from profileData.experience items with start/end
  const exp = profile?.profileData?.experience;
  if (!Array.isArray(exp)) return 0;
  
  const total = exp.reduce((sum, item) => {
    const start = item?.startDate ? new Date(item.startDate) : null;
    const end = item?.present ? new Date() : item?.endDate ? new Date(item.endDate) : null;
    if (!start || !end || Number.isNaN(start) || Number.isNaN(end)) return sum;
    const years = (end - start) / (1000 * 60 * 60 * 24 * 365.25);
    return sum + Math.max(0, years);
  }, 0);
  
  return Math.round(total * 10) / 10;
};

/**
 * Extracts skills from user profile data
 * @param {Object} profile - User profile object
 * @returns {string[]} Array of normalized skills
 */
export const extractUserSkills = (profile) => {
  if (!profile) return [];
  const skills = profile?.profileData?.skills?.length 
    ? profile.profileData.skills 
    : profile?.resumeData?.skills;
  return normalizeSkills(skills);
};

/**
 * Computes profile match percentage between a job and user profile
 * @param {Object} job - Job object
 * @param {Object} profile - User profile object
 * @returns {number|null} Match percentage (0-100) or null if no match possible
 */
export const computeMatchPercent = (job, profile) => {
  if (!job || !profile) return null;

  // First validate that the matching use case is valid
  // 1. The job must have a description
  if (!job.description || job.description.trim() === '') return null;

  // 2. At least one of job experience or job skills must be present
  const jobRange = parseExperienceRange(job.experience);
  const jobSkillsArr = normalizeSkills(
    Array.isArray(job.skills) 
      ? job.skills 
      : job.skills 
        ? job.skills.split(",") 
        : []
  );
  const jobHasAnySignal = Boolean(jobRange) || jobSkillsArr.length > 0;
  if (!jobHasAnySignal) return null;

  // 3. At least one of user experience or user skills must be present
  const userYears = extractUserExperienceYears(profile);
  const userSkillsSet = new Set(extractUserSkills(profile));
  const userHasAnySignal = (typeof userYears === "number" && userYears > 0) || userSkillsSet.size > 0;
  if (!userHasAnySignal) return null;

  // Compute experience score
  let expScore = 0; // Default to 0 if job experience is missing or invalid
  if (jobRange && typeof userYears === "number" && userYears >= 0) {
    const min = jobRange.min ?? 0;
    const max = jobRange.max === Infinity ? min + 10 : jobRange.max;
    
    if (userYears >= min && userYears <= max) {
      // If user experience is within the job range → expScore = 100
      expScore = 100;
    } else if (userYears < min) {
      // If user experience is below the minimum → expScore = max(0, 100 - (min - userYears) * 20)
      const gap = min - userYears;
      expScore = Math.max(0, 100 - (gap * 20));
    } else if (userYears > max) {
      // If user experience exceeds the maximum → expScore = max(60, 100 - (userYears - max) * 5)
      const over = userYears - max;
      expScore = Math.max(60, 100 - (over * 5));
    }
  }

  // Compute skills score
  let skillsScore = 0; // Default to 0 if no skills match
  if (jobSkillsArr.length > 0 && userSkillsSet.size > 0) {
    // Calculate skill coverage: matched skills divided by total job skills, multiplied by 100
    const matches = jobSkillsArr.filter((s) => userSkillsSet.has(s)).length;
    const coverage = matches / jobSkillsArr.length;
    skillsScore = Math.round(coverage * 100);
  }

  // Apply weights: 30% experience, 70% skills
  const experienceWeight = 0.3;
  const skillsWeight = 0.7;

  // Calculate the weighted average and return an integer percentage between 0 and 100
  const weighted = Math.round(
    (expScore * experienceWeight) + (skillsScore * skillsWeight)
  );
  return Math.max(0, Math.min(100, weighted));
};

/**
 * Computes skills matching data for a job and user profile
 * @param {Object} job - Job object
 * @param {Object} profile - User profile object
 * @returns {Object} Skills matching data
 */
export const computeSkillsMatchingData = (job, profile) => {
  if (!job?.skills || !profile) {
    return { matchedSkillCount: 0, totalJobSkills: 0, normalizedJobSkills: [] };
  }

  const selectedJobSkills = Array.isArray(job.skills) 
    ? job.skills 
    : job.skills.split(',').map(skill => skill.trim());
  
  const normalizedJobSkills = normalizeSkills(selectedJobSkills);
  const userSkills = extractUserSkills(profile);
  const userSkillsSet = new Set(userSkills);
  const matchedSkillCount = normalizedJobSkills.filter(skill => userSkillsSet.has(skill)).length;
  const totalJobSkills = normalizedJobSkills.length;

  return { matchedSkillCount, totalJobSkills, normalizedJobSkills };
};

/**
 * Fetches user profile from API
 * @param {string} token - Authentication token
 * @returns {Promise<Object|null>} User profile or null
 */
export const fetchUserProfile = async (token) => {
  try {
    const response = await fetch('https://api.nodoo.in/api/user/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.success && data?.user) {
        return data.user;
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};
