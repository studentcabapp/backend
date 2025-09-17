const MAX_FAILED = 5;
const LOCK_MS = 30 * 60 * 1000; // 30 minutes

export const failedAttempts = new Map();

export const isLocked = (key) => {
  const rec = failedAttempts.get(key);
  if (!rec) return false;
  if (rec.lockedUntil && Date.now() < rec.lockedUntil) return true;
  if (rec.lockedUntil && Date.now() >= rec.lockedUntil) {
    failedAttempts.delete(key);
    return false;
  }
  return false;
};

export const markFailed = (key) => {
  const rec = failedAttempts.get(key) || { count: 0 };
  rec.count++;
  if (rec.count >= MAX_FAILED) rec.lockedUntil = Date.now() + LOCK_MS;
  failedAttempts.set(key, rec);
};

export const resetFailed = (key) => failedAttempts.delete(key);
