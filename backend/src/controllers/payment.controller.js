import { createPayment, confirmExternalTransfer } from "../services/payment.service.js";

export const payFees = async (req, res, next) => {
  try {
    const { parentId, items, tenders, paymentType } = req.body;

    const payment = await createPayment(
      {
        parentId,
        items,
        tenders,
        paymentType,
        idempotencyKey: req.get("Idempotency-Key")
      },
      req.user.userId
    );

    return res.status(201).json({
      message: "Payment completed",
      payment
    });
  } catch (error) {
    next(error);
  }
};

// ADDED — BE-3 item 4: HTTP entry point onto confirmExternalTransfer().
// A polling job (if BE-2 builds one instead of relying purely on this
// webhook) would call confirmExternalTransfer() directly, not this route.
export const handleExternalTransferWebhook = async (req, res, next) => {
  try {
    const { payment_id, tender_id, provider_ref, outcome } = req.body;

    const payment = await confirmExternalTransfer({
      paymentId: payment_id,
      tenderId: tender_id,
      providerRef: provider_ref,
      outcome
    });

    return res.json(payment);
  } catch (error) {
    next(error);
  }
};
