import { GemologicalLab, ColombianRegion } from '../../../types';

export const LABS: GemologicalLab[] = ['GIA', 'IGI', 'CDTEC', 'AGL', 'Gübelin', 'SSEF', 'Other'];
export const REGIONS: ColombianRegion[] = ['Muzo', 'Chivor', 'Coscuez', 'Peñas Blancas', 'La Pita', 'Other'];
export const CLARITY_GRADES = ['FL', 'IF', 'VVS', 'VS', 'SI', 'I'] as const;
export const CUT_GRADES = ['EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIR'] as const;
export const TREATMENTS = ['NONE', 'OILED', 'RESIN', 'OTHER'] as const;
