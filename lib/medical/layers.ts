import type { HouseNumber, PlanetName, SignName } from '@/types/astrology';
import type { RegionId } from './regions';

/**
 * The mapping tables. Six independent layers, each pointing at regions from a
 * different tradition. They are deliberately data, not logic - disagreeing with a
 * lineage means editing one row here, never touching the scorer.
 *
 * Layer weights encode how much each tradition is trusted. Bhava and dusthana
 * carry the most because the whole application is lagna-anchored; Kalapurusha
 * sits underneath as an overlay, per the practitioner's decision to keep the
 * zodiacal man counted from Aries as a fixed anatomical baseline.
 */
export const LAYER_WEIGHT = {
  bhava: 3,
  dusthana: 3,
  kalapurusha: 2,
  dhatu: 2,
  d6: 2,
  d30: 1,
} as const;

export type LayerName = keyof typeof LAYER_WEIGHT;

export const LAYER_LABEL: Record<LayerName, string> = {
  bhava: 'House from lagna',
  dusthana: '6th / 8th / 12th link',
  kalapurusha: 'Kalapurusha sign',
  dhatu: 'Tissue governed',
  d6: 'D6 confirmation',
  d30: 'D30 affliction',
};

/** Houses counted from the lagna, head downward. The primary spatial layer. */
export const BHAVA_REGIONS: Record<HouseNumber, RegionId[]> = {
  1: ['head', 'nerves'],
  2: ['face', 'throat'],
  3: ['arms', 'cervical', 'chest'],
  4: ['chest', 'heart'],
  5: ['stomach', 'thoracic', 'heart'],
  6: ['intestines', 'liver', 'endocrine'],
  7: ['pelvis', 'kidneys', 'lumbar'],
  8: ['pelvis', 'lumbar'],
  9: ['lumbar', 'liver'],
  10: ['knees'],
  11: ['feet', 'blood'],
  12: ['feet', 'nerves', 'skin'],
};

/**
 * Kalapurusha, counted from Aries as the fixed anatomical baseline rather than
 * from the Moon's sign. Chosen for consistency: the zodiacal man represents
 * universal anatomy and does not move with the native.
 */
export const KALAPURUSHA_REGIONS: Record<SignName, RegionId[]> = {
  Aries: ['head'],
  Taurus: ['face', 'throat'],
  Gemini: ['arms', 'chest'],
  Cancer: ['chest', 'stomach'],
  Leo: ['heart', 'thoracic'],
  Virgo: ['intestines', 'liver'],
  Libra: ['kidneys', 'lumbar'],
  Scorpio: ['pelvis'],
  Sagittarius: ['lumbar', 'knees'],
  Capricorn: ['knees'],
  Aquarius: ['feet', 'blood'],
  Pisces: ['feet', 'nerves'],
};

/** Dhatu: the tissue each graha governs, independent of where it sits. */
export const DHATU_REGIONS: Record<PlanetName, RegionId[]> = {
  Sun: ['heart', 'face', 'head'],
  Moon: ['stomach', 'blood', 'chest'],
  Mars: ['blood', 'liver'],
  Mercury: ['nerves', 'skin', 'arms'],
  Jupiter: ['liver', 'endocrine'],
  Venus: ['pelvis', 'kidneys', 'skin'],
  Saturn: ['knees', 'nerves', 'lumbar'],
  /* The nodes govern no tissue in the classical scheme; per the practitioner's
     decision they are read spatially by occupied house instead, which the bhava
     layer already covers. Skin and undiagnosed complaints are the exception. */
  Rahu: ['skin'],
  Ketu: ['skin', 'nerves'],
};

/** The character axis. Which dusthana a signal comes through changes the advice. */
export const DUSTHANA_CHARACTER = {
  6: {
    label: 'Acute',
    meaning: 'Shows up fast and gets noticed. Treatable once seen. Lowest concern of the three.',
  },
  8: {
    label: 'Chronic',
    meaning: 'Slow, silent, found late. This is the one where waiting for symptoms is the mistake - screen on schedule.',
  },
  12: {
    label: 'Depleting',
    meaning: 'Immunity, sleep, energy. Presents as run-down rather than as a named complaint, so it gets dismissed.',
  },
} as const;

export type DusthanaHouse = keyof typeof DUSTHANA_CHARACTER;
