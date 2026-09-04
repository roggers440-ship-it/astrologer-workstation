/**
 * The twenty body regions.
 *
 * Sixteen anatomical, four body-wide. The systemic four exist because
 * Mercury-and-nerves or Saturn-and-bone are not places on a diagram, and forcing
 * them onto anatomy loses them entirely.
 *
 * `screening` names the ordinary test a doctor would order anyway. It is never a
 * diagnosis and never a condition - the entire point of this module is to route a
 * client toward a routine check rather than toward worry, and naming a disease
 * would do the opposite.
 */

export type RegionId =
  | 'head' | 'face' | 'throat' | 'arms' | 'chest' | 'heart' | 'stomach'
  | 'liver' | 'intestines' | 'pelvis' | 'knees' | 'feet'
  | 'cervical' | 'thoracic' | 'kidneys' | 'lumbar'
  | 'skin' | 'nerves' | 'endocrine' | 'blood';

export interface Region {
  id: RegionId;
  name: string;
  view: 'front' | 'back' | 'systemic';
  /** Plain-language anatomy, for the client-facing view. */
  plain: string;
  /** The routine screening a GP would order. Never a diagnosis. */
  screening: string;
}

export const REGIONS: Region[] = [
  { id: 'head',       name: 'Head and brain',            view: 'front', plain: 'head, skull, brain',                screening: 'Blood pressure check, and an eye test if headaches are frequent.' },
  { id: 'face',       name: 'Eyes, face, sinuses',       view: 'front', plain: 'eyes, sinuses, teeth',              screening: 'Standard optometry check; ENT review if sinus symptoms persist.' },
  { id: 'throat',     name: 'Throat, thyroid, neck',     view: 'front', plain: 'throat, thyroid, voice',            screening: 'Thyroid function panel.' },
  { id: 'arms',       name: 'Shoulders, arms, hands',    view: 'front', plain: 'shoulders, arms, hands',            screening: 'Musculoskeletal assessment if pain or numbness persists.' },
  { id: 'chest',      name: 'Chest, lungs, breath',      view: 'front', plain: 'lungs and breathing',               screening: 'Chest examination or spirometry if breathlessness.' },
  { id: 'heart',      name: 'Heart',                     view: 'front', plain: 'heart and blood pressure',          screening: 'Blood pressure and lipid profile.' },
  { id: 'stomach',    name: 'Stomach, upper abdomen',    view: 'front', plain: 'stomach and digestion',             screening: 'Routine GI review if reflux or pain is recurrent.' },
  { id: 'liver',      name: 'Liver, gallbladder, spleen',view: 'front', plain: 'liver and gallbladder',             screening: 'Liver function tests.' },
  { id: 'intestines', name: 'Intestines, colon',         view: 'front', plain: 'gut and bowel',                     screening: 'Standard colorectal screening at the usual age for the person.' },
  { id: 'pelvis',     name: 'Pelvis, bladder, reproductive', view: 'front', plain: 'bladder and reproductive organs', screening: 'Routine urology or gynaecology screening as appropriate.' },
  { id: 'knees',      name: 'Knees, joints, bones',      view: 'front', plain: 'knees and joints',                  screening: 'Vitamin D level, and bone density if otherwise indicated.' },
  { id: 'feet',       name: 'Ankles, feet',              view: 'front', plain: 'ankles and feet',                   screening: 'Circulation and foot examination if numbness or swelling.' },
  { id: 'cervical',   name: 'Cervical spine, upper back',view: 'back',  plain: 'neck and upper back',               screening: 'Physiotherapy assessment for persistent neck pain.' },
  { id: 'thoracic',   name: 'Thoracic spine, mid back',  view: 'back',  plain: 'mid back and posture',              screening: 'Posture and spine assessment.' },
  { id: 'kidneys',    name: 'Kidneys, adrenals',         view: 'back',  plain: 'kidneys',                           screening: 'Basic metabolic panel including creatinine.' },
  { id: 'lumbar',     name: 'Lumbar, sacrum, sciatic',   view: 'back',  plain: 'lower back',                        screening: 'Lower back assessment and physiotherapy referral.' },
  { id: 'skin',       name: 'Skin and hair',             view: 'systemic', plain: 'skin',                           screening: 'Annual skin check.' },
  { id: 'nerves',     name: 'Nervous system, sleep',     view: 'systemic', plain: 'sleep and nerves',                screening: 'Sleep review. Neurology referral only if there are actual symptoms.' },
  { id: 'endocrine',  name: 'Endocrine, metabolism',     view: 'systemic', plain: 'hormones and metabolism',         screening: 'Fasting glucose and HbA1c.' },
  { id: 'blood',      name: 'Blood and circulation',     view: 'systemic', plain: 'blood and circulation',           screening: 'Full blood count and lipid profile.' },
];

export const regionById = (id: RegionId) => REGIONS.find((r) => r.id === id)!;
