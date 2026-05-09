/**
 * Voice Preferences
 *
 * Shared helpers for translating the rider's `defaultVoice` setting
 * into an initial active tab/index in any view that displays the four
 * coaching voices as tabs.
 *
 * Canonical render order is enforced elsewhere (see VOICE_META in
 * src/services/aiService.js). This module only governs which voice is
 * *active* on initial load — never order, content, or visibility.
 */

export const VALID_VOICES = ['classical', 'empathetic', 'technical', 'strategist'];

const VOICE_INDEX_BY_KEY = {
  classical: 0,
  empathetic: 1,
  technical: 2,
  strategist: 3,
};

/**
 * Map the rider's defaultVoice preference to a voice key for tabbed views.
 *
 * 'all', undefined, null, or any unrecognized value falls back to 'classical'
 * because tabbed views can only have one active tab at a time.
 */
export function getInitialActiveVoice(riderSettings) {
  const pref = riderSettings?.defaultVoice;
  return VALID_VOICES.includes(pref) ? pref : 'classical';
}

/**
 * Same fallback rules, but returned as a 0-based index matching VOICE_META.
 */
export function getInitialActiveVoiceIndex(riderSettings) {
  return VOICE_INDEX_BY_KEY[getInitialActiveVoice(riderSettings)];
}
