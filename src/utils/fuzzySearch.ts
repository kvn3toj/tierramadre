/**
 * Fuzzy Search Utility for Tierra Madre Studio
 * Allows finding products even with typos or similar names
 * Optimized for precision - prefers exact matches over fuzzy
 */

/**
 * Normalize a string: remove accents, lowercase, trim
 */
export const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};

/**
 * Calculate Levenshtein distance between two strings
 */
const levenshteinDistance = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
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
 * Smart fuzzy match - precise matching with typo tolerance
 *
 * Strategy:
 * 1. Exact/contains match = always match
 * 2. Word starts with = always match
 * 3. Fuzzy only for searches 4+ chars, with high threshold
 * 4. Only check fuzzy against individual words, not random substrings
 */
export const fuzzyMatch = (
  text: string,
  search: string,
  _threshold: number = 0.7 // Default higher threshold
): boolean => {
  if (!search || !text) return !search;

  const normalizedText = normalizeString(text);
  const normalizedSearch = normalizeString(search);

  // 1. Exact match
  if (normalizedText === normalizedSearch) return true;

  // 2. Text contains search (primary match)
  if (normalizedText.includes(normalizedSearch)) return true;

  // 3. Any word starts with search
  if (anyWordStartsWith(text, search)) return true;

  // 4. For very short searches (1-3 chars), only use exact/contains/startsWith
  //    No fuzzy matching - too many false positives
  if (normalizedSearch.length <= 3) return false;

  // 5. For medium searches (4-5 chars), use strict fuzzy matching
  //    Only match if a word is very similar (1-2 typos max)
  const words = normalizedText.split(/\s+/);

  for (const word of words) {
    if (word.length < 3) continue;

    // Calculate max allowed distance based on word/search length
    const minLen = Math.min(word.length, normalizedSearch.length);
    const maxAllowedDistance = minLen <= 4 ? 1 : minLen <= 6 ? 2 : 3;

    const distance = levenshteinDistance(word, normalizedSearch);

    if (distance <= maxAllowedDistance) {
      return true;
    }

    // Also check if search is a typo-ed prefix of the word
    if (word.length > normalizedSearch.length) {
      const wordPrefix = word.substring(0, normalizedSearch.length);
      const prefixDistance = levenshteinDistance(wordPrefix, normalizedSearch);
      if (prefixDistance <= 1) {
        return true;
      }
    }
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
  threshold: number = 0.7
): T[] => {
  if (!search.trim()) return items;

  const normalizedSearch = normalizeString(search);

  const scored = items.map(item => {
    const fields = getSearchableFields(item);
    let maxScore = 0;

    for (const field of fields) {
      if (!field) continue;

      const normalizedField = normalizeString(field);

      // Exact match
      if (normalizedField === normalizedSearch) {
        maxScore = 1;
        break;
      }

      // Starts with
      if (normalizedField.startsWith(normalizedSearch)) {
        maxScore = Math.max(maxScore, 0.95);
        continue;
      }

      // Contains
      if (normalizedField.includes(normalizedSearch)) {
        maxScore = Math.max(maxScore, 0.85);
        continue;
      }

      // Word starts with
      if (anyWordStartsWith(field, search)) {
        maxScore = Math.max(maxScore, 0.8);
        continue;
      }

      // Fuzzy - only for 4+ char searches
      if (normalizedSearch.length >= 4) {
        const score = similarityScore(field, search);
        if (score >= threshold) {
          maxScore = Math.max(maxScore, score * 0.7); // Discount fuzzy matches
        }
      }
    }

    return { item, score: maxScore };
  });

  return scored
    .filter(({ score }) => score >= threshold * 0.7)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
};
