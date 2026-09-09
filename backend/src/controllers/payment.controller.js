import { createPayment } from "../services/payment.service.js";

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
