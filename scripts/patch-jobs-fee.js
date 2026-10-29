/** Apply 5% client / 5% worker fee copy + payment amount on restored jobs page. */
module.exports = function patchJobsFeeSplit(text) {
  text = text.replace(/amount: fees\.amount,/g, "amount: fees.clientPays,");
  text = text.replace(
    /Client pays \{formatGmd\(fees\.amount\)\}/g,
    "Client pays {formatGmd(fees.clientPays)}"
  );
  text = text.replace(
    /Send \{formatGmd\(fees\.amount\)\} via Wave/g,
    "Send {formatGmd(fees.clientPays)} via Wave"
  );
  text = text.replace(
    /Current offer: \{formatGmd\(fees\.amount\)\} \(worker gets/g,
    "Budget {formatGmd(fees.amount)} · client pays {formatGmd(fees.clientPays)} · worker gets"
  );
  text = text.replace(
    /LocalHands keeps\{\s*" "\s*\}\n\s*\{PLATFORM_FEE_PERCENT\}% \(\{formatGmd\(fees\.fee\)\}\)/g,
    "LocalHands 10% (split 5/5) ({formatGmd(fees.fee)})"
  );
  return text;
};
