/**
 * Normalize an unordered image pair so storage and lookup are deterministic.
 * Returns { a, b } such that a < b (string comparison on UUID).
 */
export function normalizeImagePair(x: string, y: string): { a: string; b: string } {
  return x < y ? { a: x, b: y } : { a: y, b: x };
}
