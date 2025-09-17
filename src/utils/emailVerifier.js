// utils/emailVerifier.js
import Institution from '../models/institution.model.js';

export const checkStudentEmail = async (email) => {
  const domain = email.split('@')[1]?.toLowerCase() || '';

  // Layer 1: ends with .ac.in or .edu.in
  if (domain.endsWith('.ac.in') || domain.endsWith('.edu.in')) {
    const institution = await Institution.findOne({ domain_whitelist: domain }).lean();
    return { valid: true, reason: 'tld', institution };
  }

  // Layer 2: explicit whitelist
  const institution = await Institution.findOne({ domain_whitelist: domain }).lean();
  if (institution) {
    return { valid: true, reason: 'whitelist', institution };
  }

  // Not acceptable
  return { valid: false, reason: 'not-allowed', domain };
};
