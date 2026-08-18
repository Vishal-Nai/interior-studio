/** Format feet as ft'in" e.g. 10.5 -> 10'6" */
export function formatFeet(feet: number): string {
  const sign = feet < 0 ? '-' : '';
  const abs = Math.abs(feet);
  let ft = Math.floor(abs);
  let inches = Math.round((abs - ft) * 12);
  if (inches === 12) {
    ft += 1;
    inches = 0;
  }
  return inches === 0 ? `${sign}${ft}'0"` : `${sign}${ft}'${inches}"`;
}

export function formatSize(w: number, d: number): string {
  return `${formatFeet(w)} x ${formatFeet(d)}`;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
