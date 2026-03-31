export type NormalizedIp = {
  outs: number;
  innings: number;
  valid: boolean;
};

export function normalizeIp(ip: number): NormalizedIp {
  if (!Number.isFinite(ip) || ip < 0) {
    return { outs: 0, innings: 0, valid: false };
  }

  const whole = Math.floor(ip);
  const fraction = ip - whole;
  const epsilon = 1e-6;
  const isZero = Math.abs(fraction) < epsilon;
  const isOne = Math.abs(fraction - 0.1) < epsilon;
  const isTwo = Math.abs(fraction - 0.2) < epsilon;

  if (!isZero && !isOne && !isTwo) {
    return { outs: 0, innings: 0, valid: false };
  }

  const fracDigit = isOne ? 1 : isTwo ? 2 : 0;
  const outs = whole * 3 + fracDigit;
  return { outs, innings: outs / 3, valid: true };
}

export function isValidBaseballIp(ip: number): boolean {
  return normalizeIp(ip).valid;
}
