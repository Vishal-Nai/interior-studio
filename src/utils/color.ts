import * as THREE from 'three';

/** Lighten (positive) or darken (negative) a hex color by a lightness delta. */
export function shade(hex: string, delta: number): string {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + delta)));
  return `#${c.getHexString()}`;
}

export function isDark(hex: string): boolean {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  return hsl.l < 0.45;
}
