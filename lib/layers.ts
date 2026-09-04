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
 * Kalapurusha, the limbs of the zodiacal man, counted from Aries as the fixed
 * anatomical baseline rather than from the Moon's sign.
 *
 * Corrected against Narasimha Rao section 2.2.1, which follows Parasara: Cancer
 * is the heart and Leo the stomach and navel. The popular Western assignment has
 * these the other way round, and this module carried that error until now. Virgo
 * is the hip in the limb scheme even though Virgo governs the intestines in the
 * disease scheme - both are kept, since the layers are read together.
 */
export const KALAPURUSHA_REGIONS: Record<SignName, RegionId[]> = {
  Aries: ['head'],
  Taurus: ['face', 'throat'],
  Gemini: ['arms', 'chest'],
  Cancer: ['heart', 'chest'],
  Leo: ['stomach', 'thoracic'],
  Virgo: ['intestines', 'lumbar'],
  Libra: ['kidneys', 'lumbar'],
  Scorpio: ['pelvis'],
  Sagittarius: ['lumbar', 'knees'],
  Capricorn: ['knees'],
  Aquarius: ['feet', 'blood'],
  Pisces: ['feet', 'nerves'],
};

/**
 * Sapta dhatu - the seven tissues, one per graha.
 *
 * Corrected against Narasimha Rao section 3.2.12, which gives Parasara's
 * assignment: Sun bones, Moon blood, Mars marrow, Mercury skin, Jupiter fat,
 * Venus semen and the reproductive system, Saturn muscle. This module previously
 * used a different circulating attribution - Sun to the heart, Mars to blood,
 * Jupiter to the liver - which is a common popular scheme but not the classical
 * one, and it was shifting scores across the whole body map.
 */
export const DHATU_REGIONS: Record<PlanetName, RegionId[]> = {
  Sun: ['knees'],                          // asthi - bones and the skeletal frame
  Moon: ['blood'],                         // rakta - blood and the fluids
  Mars: ['blood', 'knees'],                // majja - marrow, held inside bone
  Mercury: ['skin'],                       // twak - skin
  Jupiter: ['liver', 'endocrine'],         // medas - fat and its metabolism
  Venus: ['pelvis'],                       // shukra - the reproductive system
  Saturn: ['nerves', 'lumbar'],            // mamsa and snayu - muscle and sinew
  /* The nodes govern no dhatu. Per the practitioner's decision they are read
     spatially by occupied house, which the bhava layer already covers; skin and
     undiagnosed complaints are the conventional exception. */
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
