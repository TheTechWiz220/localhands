/** Fee copy on restored jobs page: pilot 5% client-only. */
module.exports = function patchJobsFeeSplit(text) {
  text = text.replace(/amount: fees\.amount,/g, "amount: fees.clientPays,");
  text = text.replace(/amount: fees\.clientPays,/g, "amount: fees.clientPays,");

  text = text.replace(
    /Client pays \{formatGmd\(fees\.amount\)\}/g,
    "Client pays {formatGmd(fees.clientPays)}"
  );

  text = text.replace(
    /Send \{formatGmd\(fees\.amount\)\} via Wave/g,
    "Send {formatGmd(fees.clientPays)} via Wave"
  );
  text = text.replace(
    /Send \{formatGmd\(fees\.clientPays\)\} via Wave/g,
    "Send {formatGmd(fees.clientPays)} via Wave"
  );

  text = text.replace(
    /Current offer: \{formatGmd\(fees\.amount\)\} \(worker gets/g,
    "Budget {formatGmd(fees.amount)} \u00b7 client pays {formatGmd(fees.clientPays)} \u00b7 worker gets"
  );
  text = text.replace(
    /Offer \{formatGmd\(fees\.amount\)\} \u00b7 client pays \{formatGmd\(fees\.clientPays\)\} \u00b7 worker gets/g,
    "Budget {formatGmd(fees.amount)} \u00b7 client pays {formatGmd(fees.clientPays)} \u00b7 worker gets"
  );
  text = text.replace(
    /Budget \{formatGmd\(fees\.amount\)\} \u00b7 client pays \{formatGmd\(fees\.clientPays\)\} \u00b7 worker gets/g,
    "Budget {formatGmd(fees.amount)} \u00b7 client pays {formatGmd(fees.clientPays)} \u00b7 worker gets"
  );

  return text;
};
