/** LocalHands platform pricing (Gambia MVP)
 * Total platform fee 10%, split evenly:
 * - Client pays budget + 5%
 * - Worker receives budget − 5%
 * - LocalHands keeps 10% of budget overall
 */
export const PLATFORM_FEE_PERCENT = 10;
export const CLIENT_FEE_PERCENT = 5;
export const WORKER_FEE_PERCENT = 5;

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
    /** Total platform take (clientFee + workerFee) */
    fee,
    clientFee,
    workerFee,
    /** What the client should send (Wave / record payment) */
    clientPays,
    /** What the worker should receive after fee */
    workerGets,
    feePercent: PLATFORM_FEE_PERCENT,
  };
}

export function formatGmd(n: number) {
  return `GMD ${Number(n).toLocaleString()}`;
}
