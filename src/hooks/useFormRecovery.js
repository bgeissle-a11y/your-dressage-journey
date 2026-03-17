import { useEffect, useRef, useState, useCallback } from 'react';

const DEBOUNCE_MS = 2000;

/**
 * Auto-saves form data to localStorage and offers recovery when the user
 * returns to a form after a failed save or accidental navigation.
 *
 * @param {string} storageKey - Unique key for this form (e.g., 'ydj-debrief-recovery')
 * @param {object} formData - Current form state
 * @param {function} setFormData - State setter to restore recovered data
 * @returns {{ hasRecovery: boolean, applyRecovery: () => void, dismissRecovery: () => void, clearRecovery: () => void }}
 */
export default function useFormRecovery(storageKey, formData, setFormData) {
  const [hasRecovery, setHasRecovery] = useState(false);
  const recoveredRef = useRef(null);
  const timerRef = useRef(null);
  const initializedRef = useRef(false);

  // On mount, check for saved recovery data
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed._savedAt) {
          // Only offer recovery if saved within last 24 hours
          const age = Date.now() - parsed._savedAt;
          if (age < 24 * 60 * 60 * 1000) {
            recoveredRef.current = parsed;
            delete recoveredRef.current._savedAt;
            setHasRecovery(true);
          } else {
            localStorage.removeItem(storageKey);
          }
        }
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
    initializedRef.current = true;
  }, [storageKey]);

  // Auto-save form data on changes (debounced)
  useEffect(() => {
    if (!initializedRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        const toSave = { ...formData, _savedAt: Date.now() };
        localStorage.setItem(storageKey, JSON.stringify(toSave));
      } catch { /* localStorage full or unavailable — ignore */ }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [storageKey, formData]);

  // Apply recovered data to the form
  const applyRecovery = useCallback(() => {
    if (recoveredRef.current) {
      setFormData(prev => ({ ...prev, ...recoveredRef.current }));
    }
    setHasRecovery(false);
    recoveredRef.current = null;
  }, [setFormData]);

  // Dismiss without applying
  const dismissRecovery = useCallback(() => {
    setHasRecovery(false);
    recoveredRef.current = null;
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  // Clear recovery data (call on successful save)
  const clearRecovery = useCallback(() => {
    setHasRecovery(false);
    recoveredRef.current = null;
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { hasRecovery, applyRecovery, dismissRecovery, clearRecovery };
}
