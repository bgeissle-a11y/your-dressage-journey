import { useEffect, useState } from 'react';

/**
 * Returns true when the user is on iOS Safari (including iPadOS Safari
 * running in "desktop mode," which reports as MacIntel with touch support).
 * Used to surface platform-specific guidance about Safari's tendency to pause
 * network activity when the tab is backgrounded — see SaveConfirmation /
 * waitForPendingWrites readback flow.
 */
export default function useIsIOSSafari() {
  const [is, setIs] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    setIs(isIOS && isSafari);
  }, []);
  return is;
}
