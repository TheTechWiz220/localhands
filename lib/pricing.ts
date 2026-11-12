/** LocalHands platform pricing (Gambia MVP)
 *
 * PILOT (locked): 5% total, charged to the client only.
 * - Client pays budget + 5%
 * - Worker receives 100% of the agreed budget
 * - LocalHands keeps 5% of budget
 *
 * Applies to all marketplace jobs during the pilot window.
 * Company subscription / placement fees are separate commercial terms.
 */
export const PLATFORM_FEE_PERCENT = 5;
export const CLIENT_FEE_PERCENT = 5;
export const WORKER_FEE_PERCENT = 0;

export function calcFees(budget: number) {
  const amount = Math.max(0, Number(budget) || 0);
  const clientFee = Math.round((amount * CLIENT_FEE_PERCENT) / 100);
  const workerFee = Math.round((amount * WORKER_FEE_PERCENT) / 100);
  const fee = clientFee + workerFee;
  const clientPays = amount + clientFee;
  const workerGets = amount - workerFee;
  return {
    /** Agreed job budget (stored on job_requests.budget) */
    amount,
    /** Total platform take */
    fee,
    clientFee,
    workerFee,
    /** What the client should send (Wave / record payment) */
    clientPays,
    /** What the worker receives (full budget under pilot) */
    workerGets,
    feePercent: PLATFORM_FEE_PERCENT,
  };
}

export function formatGmd(n: number) {
  return `GMD ${Number(n).toLocaleString()}`;
}
