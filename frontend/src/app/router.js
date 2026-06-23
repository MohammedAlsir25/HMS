export const CLINIC_ROUTES = {
  medicine: '/clinic/medicine',
  ent: '/clinic/ent',
  dental: '/clinic/dental',
  retina: '/clinic/retina',
  glaucoma: '/clinic/glaucoma',
  orbit: '/clinic/orbit',
  'pediatrics-ophth': '/clinic/pediatrics-ophth',
  'general-ophth': '/clinic/general-ophth',
  optometry: '/clinic/optometry',
};

export const CLINIC_LABELS = {
  medicine: 'Medicine Clinic',
  ent: 'ENT Clinic',
  dental: 'Dental Clinic',
  retina: 'Retina Clinic',
  glaucoma: 'Glaucoma Clinic',
  orbit: 'Orbit Clinic',
  'pediatrics-ophth': 'Pediatrics Ophthalmology',
  'general-ophth': 'General Ophthalmology',
  optometry: 'Optometry Clinic',
};

export const CLINIC_ICONS = {
  medicine: 'activity',
  ent: 'ear',
  dental: 'tooth',
  retina: 'eye',
  glaucoma: 'eye',
  orbit: 'eye',
  'pediatrics-ophth': 'eye',
  'general-ophth': 'eye',
  optometry: 'eye',
};

export const LAB_ROUTE = '/lab';

export function getClinicRoute(clinicSlug) {
  return CLINIC_ROUTES[clinicSlug] || '/dashboard';
}
