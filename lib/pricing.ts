/** LocalHands platform pricing (Gambia MVP) */
export const PLATFORM_FEE_PERCENT = 10;

export function calcFees(budget: number) {
  const amount = Math.max(0, Number(budget) || 0);
  const fee = Math.round((amount * PLATFORM_FEE_PERCENT) / 100);
  const workerGets = amount - fee;
  return { amount, fee, workerGets, feePercent: PLATFORM_FEE_PERCENT };
}

export function formatGmd(n: number) {
  return `GMD ${Number(n).toLocaleString()}`;
}
