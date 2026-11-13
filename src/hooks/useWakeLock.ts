import { useEffect } from 'react';

/**
 * Keeps the screen on while `enabled` (listening, metronome, reference tone), so the phone
 * does not dim in the middle of tuning. The browser drops the lock whenever the page is
 * hidden, so it is requested again when the page becomes visible.
 * Silently does nothing where the Screen Wake Lock API is missing.
 */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) {
          void lock.release();
          return;
        }
        sentinel = lock;
      } catch {
        // Denied (battery saver, permissions policy) or not allowed yet; retry on next visibility change
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (sentinel && !sentinel.released) void sentinel.release();
      sentinel = null;
    };
  }, [enabled]);
}
