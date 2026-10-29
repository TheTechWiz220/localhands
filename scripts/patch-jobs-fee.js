/** Fee copy on restored jobs page: client pays offer; worker gets 90%. */
module.exports = function patchJobsFeeSplit(text) {
  // Payment amount = what client sends = their offer (budget)
  text = text.replace(/amount: fees\.clientPays,/g, "amount: fees.clientPays,");
  text = text.replace(/amount: fees\.amount,/g, "amount: fees.clientPays,");

  text = text.replace(
    /Client pays \{formatGmd\(fees\.amount\)\}/g,
    "Client pays {formatGmd(fees.clientPays)}"
  );
  text = text.replace(
    /Client pays \{formatGmd\(fees\.clientPays\)\}/g,
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
    "Offer {formatGmd(fees.amount)} · client pays {formatGmd(fees.clientPays)} · worker gets"
  );
  text = text.replace(
    /Budget \{formatGmd\(fees\.amount\)\} · client pays \{formatGmd\(fees\.clientPays\)\} · worker gets/g,
    "Offer {formatGmd(fees.amount)} · client pays {formatGmd(fees.clientPays)} · worker gets"
  );

  text = text.replace(
    /Client pays \{formatGmd\(fees\.amount\)\} · LocalHands keeps/g,
    "You receive {formatGmd(fees.workerGets)} · Client pays {formatGmd(fees.clientPays)} · Fee"
  );

  return text;
};
