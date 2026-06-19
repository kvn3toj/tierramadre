// Ambassador Data and Storage
//
// NOTE: Real asesores load dynamically from Google Sheets via the `get-asesores`
// API (see AsesorProfilePage). The sample arrays below are intentionally EMPTY —
// previous demo profiles (fake names, WhatsApp numbers, emails, sales stats and
// testimonials) were removed to avoid showing mock data in production.
// The loader/storage helpers are kept for backward-compatibility with components
// that still import them (e.g. AmbassadorProfile.tsx -> loadTestimonials).

import {
  AmbassadorProfile,
  Testimonial
} from '../types/ambassador';

// Storage key
const AMBASSADORS_STORAGE_KEY = 'tierra_madre_ambassadors';
const TESTIMONIALS_STORAGE_KEY = 'tierra_madre_testimonials';

/**
 * Sample Ambassadors — empty by design. Real data comes from Google Sheets.
 */
export const SAMPLE_AMBASSADORS: AmbassadorProfile[] = [];

/**
 * Sample Testimonials — empty by design. Real testimonials come from the backend.
 */
export const SAMPLE_TESTIMONIALS: Testimonial[] = [];

/**
 * Storage Functions
 */
export function loadAmbassadors(): AmbassadorProfile[] {
  try {
    const stored = localStorage.getItem(AMBASSADORS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // Initialize with sample data
    saveAmbassadors(SAMPLE_AMBASSADORS);
    return SAMPLE_AMBASSADORS;
  } catch {
    return SAMPLE_AMBASSADORS;
  }
}

export function saveAmbassadors(ambassadors: AmbassadorProfile[]): void {
  try {
    localStorage.setItem(AMBASSADORS_STORAGE_KEY, JSON.stringify(ambassadors));
  } catch (error) {
    console.error('Failed to save ambassadors:', error);
  }
}

export function getAmbassadorBySlug(slug: string): AmbassadorProfile | undefined {
  const ambassadors = loadAmbassadors();
  return ambassadors.find(a => a.slug === slug);
}

export function getAmbassadorById(id: string): AmbassadorProfile | undefined {
  const ambassadors = loadAmbassadors();
  return ambassadors.find(a => a.id === id);
}

export function updateAmbassador(updated: AmbassadorProfile): void {
  const ambassadors = loadAmbassadors();
  const index = ambassadors.findIndex(a => a.id === updated.id);
  if (index >= 0) {
    ambassadors[index] = { ...updated, lastActive: new Date().toISOString() };
    saveAmbassadors(ambassadors);
  }
}

export function loadTestimonials(ambassadorId?: string): Testimonial[] {
  try {
    const stored = localStorage.getItem(TESTIMONIALS_STORAGE_KEY);
    if (stored) {
      const all = JSON.parse(stored) as Testimonial[];
      return ambassadorId ? all.filter(t => t.ambassadorId === ambassadorId) : all;
    }
    // Initialize with sample data
    localStorage.setItem(TESTIMONIALS_STORAGE_KEY, JSON.stringify(SAMPLE_TESTIMONIALS));
    return ambassadorId ? SAMPLE_TESTIMONIALS.filter(t => t.ambassadorId === ambassadorId) : SAMPLE_TESTIMONIALS;
  } catch {
    return ambassadorId ? SAMPLE_TESTIMONIALS.filter(t => t.ambassadorId === ambassadorId) : SAMPLE_TESTIMONIALS;
  }
}

/**
 * Get ambassadors sorted by rating
 */
export function getAmbassadorsByRating(): AmbassadorProfile[] {
  return loadAmbassadors()
    .filter(a => a.status === 'active')
    .sort((a, b) => (b.reputation?.averageRating || 0) - (a.reputation?.averageRating || 0));
}

/**
 * Get ambassadors filtered by specialty
 */
export function getAmbassadorsBySpecialty(specialty: string): AmbassadorProfile[] {
  return loadAmbassadors()
    .filter(a => a.status === 'active')
    .filter(a => a.specialties.some(s => s.name.toLowerCase().includes(specialty.toLowerCase())));
}

/**
 * Get ambassadors filtered by price range
 */
export function getAmbassadorsByPriceRange(priceRange: AmbassadorProfile['priceRange']): AmbassadorProfile[] {
  return loadAmbassadors()
    .filter(a => a.status === 'active')
    .filter(a => a.priceRange === priceRange || a.priceRange === 'all');
}
