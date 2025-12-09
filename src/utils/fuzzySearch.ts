/**
 * Fuzzy Search Utility for Tierra Madre Studio
 * Allows finding products even with typos or similar names
 */

/**
 * Normalize a string: remove accents, lowercase, trim
 */
export const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .trim();
};

/**
 * Calculate Levenshtein distance between two strings
 * (minimum edits needed to transform one string into another)
 */
const levenshteinDistance = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

/**
 * Calculate similarity score (0-1) between two strings
 */
export const similarityScore = (str1: string, str2: string): number => {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);

  return 1 - distance / maxLength;
};

/**
 * Check if any word in text starts with search term
 */
const anyWordStartsWith = (text: string, search: string): boolean => {
  const words = normalizeString(text).split(/\s+/);
  const normalizedSearch = normalizeString(search);
  return words.some(word => word.startsWith(normalizedSearch));
};

/**
 * Fuzzy match check with multiple strategies
 * Returns true if the search term matches the text with tolerance for typos
 */
export const fuzzyMatch = (
  text: string,
  search: string,
  threshold: number = 0.6
): boolean => {
  if (!search || !text) return !search;

  const normalizedText = normalizeString(text);
  const normalizedSearch = normalizeString(search);

  // Exact match (normalized)
  if (normalizedText === normalizedSearch) return true;

  // Contains match (normalized)
  if (normalizedText.includes(normalizedSearch)) return true;

  // Any word starts with search
  if (anyWordStartsWith(text, search)) return true;

  // For very short searches (1-2 chars), only use exact/contains matching
  if (normalizedSearch.length <= 2) return false;

  // Check similarity for each word in the text
  const words = normalizedText.split(/\s+/);
  for (const word of words) {
    // Skip very short words
    if (word.length < 2) continue;

    // Check if word is similar enough to search term
    const score = similarityScore(word, search);
    if (score >= threshold) return true;

    // Also check if search is a prefix of the word with typos
    if (word.length >= normalizedSearch.length) {
      const prefix = word.substring(0, normalizedSearch.length + 1);
      const prefixScore = similarityScore(prefix, search);
      if (prefixScore >= threshold) return true;
    }
  }

  // Check full text similarity for multi-word searches
  if (normalizedSearch.includes(' ')) {
    const fullScore = similarityScore(normalizedText, normalizedSearch);
    if (fullScore >= threshold) return true;
  }

  return false;
};

/**
 * Search items with fuzzy matching and return sorted by relevance
 */
export const fuzzySearchItems = <T>(
  items: T[],
  search: string,
  getSearchableFields: (item: T) => string[],
  threshold: number = 0.6
): T[] => {
  if (!search.trim()) return items;

  const normalizedSearch = normalizeString(search);

  // Score each item
  const scored = items.map(item => {
    const fields = getSearchableFields(item);
    let maxScore = 0;

    for (const field of fields) {
      if (!field) continue;

      const normalizedField = normalizeString(field);

      // Exact match gets highest score
      if (normalizedField === normalizedSearch) {
        maxScore = 1;
        break;
      }

      // Starts with gets high score
      if (normalizedField.startsWith(normalizedSearch)) {
        maxScore = Math.max(maxScore, 0.95);
        continue;
      }

      // Contains gets good score
      if (normalizedField.includes(normalizedSearch)) {
        maxScore = Math.max(maxScore, 0.85);
        continue;
      }

      // Word starts with
      if (anyWordStartsWith(field, search)) {
        maxScore = Math.max(maxScore, 0.8);
        continue;
      }

      // Fuzzy match
      const score = similarityScore(field, search);
      maxScore = Math.max(maxScore, score);
    }

    return { item, score: maxScore };
  });

  // Filter and sort by score
  return scored
    .filter(({ score }) => score >= threshold)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
};
