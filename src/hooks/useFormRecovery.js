import { useEffect, useRef, useState, useCallback } from 'react';

const DEBOUNCE_MS = 2000;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Auto-saves form data to localStorage and offers recovery when the user
 * returns to the SAME form (same record) after an accidental navigation.
 *
 * The storage key is scoped per record (`${baseKey}:${recordId || 'new'}`),
 * so a draft abandoned on one record cannot offer to restore itself onto a
 * different record. Recovery is only offered when the saved blob's
 * recordId matches the caller's recordId.
 *
 * @param {string} baseKey - Stable prefix for this form (e.g., 'ydj-debrief-recovery')
 * @param {string|null|undefined} recordId - Document id when editing, falsy for "new"
 * @param {object} formData - Current form state
 * @param {function} setFormData - State setter to restore recovered data
 */
export default function useFormRecovery(baseKey, recordId, formData, setFormData) {
  const recordKey = recordId || 'new';
  const storageKey = `${baseKey}:${recordKey}`;

  const [hasRecovery, setHasRecovery] = useState(false);
  const recoveredRef = useRef(null);
  const timerRef = useRef(null);
  const initializedRef = useRef(false);

  // On mount (and on recordId change), check for saved recovery data scoped
  // to this exact record. Only offer recovery if the saved blob is fresh AND
  // its recordKey matches — defends against any cross-record bleed.
  useEffect(() => {
    initializedRef.current = false;
    setHasRecovery(false);
    recoveredRef.current = null;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const fresh = parsed && typeof parsed === 'object'
          && parsed._savedAt
          && parsed._recordKey === recordKey
          && (Date.now() - parsed._savedAt) < MAX_AGE_MS;
        if (fresh) {
          const { _savedAt, _recordKey, ...payload } = parsed;
          recoveredRef.current = payload;
          setHasRecovery(true);
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    } catch {
      localStorage.removeItem(storageKey);
    }

    // Mark initialized AFTER the first render's auto-save effect has had its
    // chance to bail; we don't want to overwrite a freshly-detected recovery
    // blob with a half-mounted formData on the very first paint.
    initializedRef.current = true;
  }, [storageKey, recordKey]);

  // Auto-save form data on changes (debounced). Always stamps the recordKey
  // so a later mount on the same record can validate identity before applying.
  useEffect(() => {
    if (!initializedRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        const toSave = { ...formData, _savedAt: Date.now(), _recordKey: recordKey };
        localStorage.setItem(storageKey, JSON.stringify(toSave));
      } catch { /* localStorage full or unavailable — ignore */ }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [storageKey, recordKey, formData]);

  const applyRecovery = useCallback(() => {
    if (recoveredRef.current) {
      setFormData(prev => ({ ...prev, ...recoveredRef.current }));
    }
    setHasRecovery(false);
    recoveredRef.current = null;
  }, [setFormData]);

  const dismissRecovery = useCallback(() => {
    setHasRecovery(false);
    recoveredRef.current = null;
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const clearRecovery = useCallback(() => {
    setHasRecovery(false);
    recoveredRef.current = null;
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { hasRecovery, applyRecovery, dismissRecovery, clearRecovery };
}

/**
 * One-time sweep of legacy unscoped recovery keys from earlier versions of
 * this hook. Run once at app boot. Safe to call repeatedly — it only acts on
 * keys that match the legacy unscoped pattern and removes them unconditionally
 * (their data shape is no longer trusted by the per-record-scoped hook).
 */
export function purgeLegacyRecoveryKeys() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const LEGACY_KEYS = [
    'ydj-debrief-recovery',
    'ydj-rider-assessment-recovery',
    'ydj-physical-assessment-recovery',
    'ydj-lesson-note-recovery',
    'ydj-technical-philosophical-recovery',
  ];
  for (const k of LEGACY_KEYS) {
    try {
      if (localStorage.getItem(k) !== null) {
        localStorage.removeItem(k);
      }
    } catch { /* ignore */ }
  }
}
