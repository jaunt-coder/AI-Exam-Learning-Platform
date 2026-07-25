/**
 * UserProfile LocalStorage store (Coach Phase C1)
 * Key: userProfile — additive; does not rename existing keys.
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';
import { createUserProfile, validateUserProfile, nowIso } from './models.js';

const KEY = STORAGE_KEYS.USER_PROFILE;

/**
 * @returns {object}
 */
export function loadUserProfile() {
  const raw = getItem(KEY, null);
  if (!raw) {
    return createUserProfile();
  }
  const profile = createUserProfile(raw);
  const { ok, errors } = validateUserProfile(profile);
  if (!ok) {
    console.warn('[Coach] Invalid userProfile in storage, resetting defaults:', errors);
    return createUserProfile({ userId: profile.userId || '001' });
  }
  return profile;
}

/**
 * @param {object} profile
 * @returns {{ ok: boolean, errors: string[], profile?: object }}
 */
export function saveUserProfile(profile) {
  const next = createUserProfile({ ...profile, updatedAt: nowIso() });
  const result = validateUserProfile(next);
  if (!result.ok) {
    return result;
  }
  const written = setItem(KEY, next);
  if (!written) {
    return { ok: false, errors: ['LocalStorage write failed'] };
  }
  return { ok: true, errors: [], profile: next };
}

/**
 * Seed from mock JSON shape (browser fetch or preloaded object).
 * @param {object} mock
 * @returns {{ ok: boolean, errors: string[], profile?: object }}
 */
export function seedUserProfileFromMock(mock) {
  return saveUserProfile(createUserProfile(mock));
}
