/**
 * Shared type definitions for JH Hospital ERP
 */

/**
 * @typedef {Object} LoginRequest
 * @property {string} email
 * @property {string} password
 */

/**
 * @typedef {Object} LoginResponse
 * @property {string} token
 * @property {string} refreshToken
 * @property {Object} user
 * @property {string} user.id
 * @property {string} user.email
 * @property {string} user.fullName
 * @property {string} user.role
 * @property {Object} user.clinic
 * @property {string[]} user.permissions
 */

/**
 * @typedef {Object} ApiError
 * @property {string} message
 * @property {number} statusCode
 * @property {string} [code]
 */

export const CLINIC_SLUGS = {
  MEDICINE: 'medicine',
  ENT: 'ent',
  DENTAL: 'dental',
  RETINA: 'retina',
  GLAUCOMA: 'glaucoma',
  ORBIT: 'orbit',
  PEDS_OPHTH: 'pediatrics-ophth',
  GEN_OPHTH: 'general-ophth',
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
};
