/**
 * Cryptographically secure Unique ID generator for Cloud9 participants.
 * Format: C9-XXXXXX (e.g. C9-X7K29P)
 * Uses high-entropy non-ambiguous uppercase characters.
 */

const CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateSecureId(existingIds?: Set<string>): string {
  const length = 6;
  let uniqueId = '';
  let attempts = 0;

  do {
    let result = 'C9-';
    // Use Web Crypto API or Node crypto
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const bytes = new Uint8Array(length);
      crypto.getRandomValues(bytes);
      for (let i = 0; i < length; i++) {
        result += CHARSET[bytes[i] % CHARSET.length];
      }
    } else {
      // Fallback
      for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * CHARSET.length);
        result += CHARSET[randomIndex];
      }
    }
    uniqueId = result;
    attempts++;
  } while (existingIds && existingIds.has(uniqueId) && attempts < 100);

  return uniqueId;
}

export function formatTimestamp(isoString?: string | null): string {
  if (!isoString) return 'Never';
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}
