/**
 * Asesor name normalization and matching utilities.
 * Extracted from useAsesores to avoid circular imports (utils → hooks).
 */

/** Normalize name for comparison (uppercase, keep only ASCII letters) */
export const normalizeName = (name: string): string => {
  let result = '';
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    // Keep only A-Z (65-90) and a-z (97-122)
    if ((char >= 65 && char <= 90) || (char >= 97 && char <= 122)) {
      result += name[i].toUpperCase();
    }
  }
  return result;
};

/**
 * Smart asesor name matching that handles abbreviated names.
 * Handles patterns like "JM.Escobar" matching "Juan Manuel Escobar Ramirez"
 */
export const matchesAsesorName = (itemAsesor: string, asesorFullName: string): boolean => {
  if (!itemAsesor || !asesorFullName) return false;

  // 1. Exact normalized match
  const normalizedItem = normalizeName(itemAsesor);
  const normalizedFull = normalizeName(asesorFullName);
  if (normalizedItem === normalizedFull) return true;

  // 2. Flexible match for abbreviated names (e.g., "JM.Escobar" → "Juan Manuel Escobar Ramirez")
  const itemParts = itemAsesor.replace(/\./g, ' ').trim().split(/\s+/).filter(Boolean);
  const fullParts = asesorFullName.trim().split(/\s+/).filter(Boolean);
  if (itemParts.length < 1 || fullParts.length < 2) return false;

  // Extract surname from abbreviated name (last word)
  const itemSurname = normalizeName(itemParts[itemParts.length - 1]);
  if (itemSurname.length < 3) return false;

  // Check if surname exists in any part of the full name
  const fullPartsNorm = fullParts.map(p => normalizeName(p));
  if (!fullPartsNorm.some(part => part === itemSurname)) return false;

  // If there's a prefix before the surname, verify it matches initials or first name
  if (itemParts.length > 1) {
    const prefix = normalizeName(itemParts[0]);

    if (prefix.length <= 3) {
      // Initials mode: "JM" → check J matches "Juan"[0], M matches "Manuel"[0]
      for (let i = 0; i < prefix.length; i++) {
        if (i >= fullParts.length) return false;
        if (normalizeName(fullParts[i])[0] !== prefix[i]) return false;
      }
    } else {
      // Full first name: check it matches the first part of the full name
      if (fullPartsNorm[0] !== prefix) return false;
    }
  }

  return true;
};
