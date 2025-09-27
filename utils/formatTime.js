/**
 * Parses experience range from various formats
 * @param {string|number} experience - Experience string or number
 * @returns {Object|null} Object with min and max years, or null if invalid
 */
export const parseExperienceRange = (experience) => {
  if (!experience) return null;
  
  // If it's already a number, treat it as exact years
  if (typeof experience === 'number') {
    return { min: experience, max: experience };
  }
  
  const str = String(experience).toLowerCase().trim();
  
  // Handle patterns like "2-4 years", "5+ years", "3-5", "2+", etc.
  
  // Pattern: "X-Y" (e.g., "2-4", "3-5 years")
  const rangeMatch = str.match(/(\d+)\s*-\s*(\d+)/);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1]);
    const max = parseInt(rangeMatch[2]);
    return { min, max };
  }
  
  // Pattern: "X+" (e.g., "5+", "3+ years")
  const plusMatch = str.match(/(\d+)\s*\+/);
  if (plusMatch) {
    const min = parseInt(plusMatch[1]);
    return { min, max: Infinity };
  }
  
  // Pattern: single number (e.g., "2", "3 years")
  const singleMatch = str.match(/(\d+)/);
  if (singleMatch) {
    const years = parseInt(singleMatch[1]);
    return { min: years, max: years };
  }
  
  return null;
};
