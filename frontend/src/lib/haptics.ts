/**
 * Micro-haptic vibration feedback for mobile interactions
 */
export function triggerHaptic(type: 'light' | 'medium' | 'success' | 'warning' = 'light') {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;
  try {
    if (type === 'light') {
      navigator.vibrate(10);
    } else if (type === 'medium') {
      navigator.vibrate(22);
    } else if (type === 'success') {
      navigator.vibrate([10, 40, 15]);
    } else if (type === 'warning') {
      navigator.vibrate([25, 40, 25]);
    }
  } catch {
    // Ignore if not supported or restricted by browser
  }
}
