import {
  getReceiptForPayment,
  getReceiptByNumber
} from "../services/receipt.service.js";

export const receiptForPayment = async (req, res, next) => {
  try {
    const receipt = await getReceiptForPayment(req.params.paymentId);
    return res.status(200).json({ receipt });
  } catch (error) {
    next(error);
  }
};

export const receiptByNumber = async (req, res, next) => {
  try {
    const receipt = await getReceiptByNumber(req.params.receiptNumber);
    return res.status(200).json({ receipt });
  } catch (error) {
    next(error);
  }
};
