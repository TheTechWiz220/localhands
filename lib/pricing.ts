/** LocalHands platform pricing (Gambia MVP)
 *
 * The client's initial offer / budget is what they pay (no extra markup).
 * Platform fee is 10% total of that offer, split for transparency:
 * - 5% client share of the fee
 * - 5% worker share of the fee
 * Both are taken from the offer pot, so the worker receives 90%.
 */
export const PLATFORM_FEE_PERCENT = 10;
export const CLIENT_FEE_PERCENT = 5;
export const WORKER_FEE_PERCENT = 5;

export function calcFees(budget: number) {
  const amount = Math.max(0, Number(budget) || 0);
  const clientFee = Math.round((amount * CLIENT_FEE_PERCENT) / 100);
  const workerFee = Math.round((amount * WORKER_FEE_PERCENT) / 100);
  const fee = clientFee + workerFee;
  /** Client pays their offer — nothing added on top */
  const clientPays = amount;
  /** Worker receives offer minus full 10% platform fee */
  const workerGets = amount - fee;
  return {
    /** Agreed job budget / client offer (stored on job_requests.budget) */
    amount,
    /** Total platform take (10%) */
    fee,
    clientFee,
    workerFee,
    /** What the client sends (same as budget) */
    clientPays,
    /** What the worker receives after fees */
    workerGets,
    feePercent: PLATFORM_FEE_PERCENT,
  };
}

export function formatGmd(n: number) {
  return `GMD ${Number(n).toLocaleString()}`;
}
