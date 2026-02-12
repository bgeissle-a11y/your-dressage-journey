import { useEffect } from 'react';

/**
 * Disables browser autofill on all text inputs, selects, and textareas within a form.
 * Chromium browsers ignore form-level autocomplete="off", so this sets
 * the attribute directly on each individual element after every render.
 */
export default function useDisableAutofill(formRef) {
  useEffect(() => {
    if (!formRef.current) return;
    formRef.current.querySelectorAll(
      'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]), select, textarea'
    ).forEach(el => {
      el.setAttribute('autocomplete', 'off');
    });
  });
}
