/**
 * UUIDv4 Idempotency Key Generator
 * Generates a stable unique identifier per form session to prevent duplicate backend submissions on retry.
 */
export function generateIdempotencyKey(prefix?: string): string {
  const uuid =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
  return prefix ? `${prefix}-${uuid}` : uuid;
}
