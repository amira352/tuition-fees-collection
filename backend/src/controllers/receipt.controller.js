import {
  getReceiptForPayment,
  getReceiptByNumber,
  searchReceiptsByNationalId
} from "../services/receipt.service.js";

// Paging comes off the query string, so it is whatever someone typed in a URL.
// Anything that is not a sensible number falls back rather than erroring - a
// bad ?limit is not worth failing a search over. The cap is there so nobody
// can ask for the whole table in one request.
const readLimit = (raw) => {
  const value = Number.parseInt(raw, 10);

  if (!Number.isInteger(value) || value < 1) {
    return 20;
  }

  return Math.min(value, 100);
};

const readOffset = (raw) => {
  const value = Number.parseInt(raw, 10);

  if (!Number.isInteger(value) || value < 0) {
    return 0;
  }

  return value;
};

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

export const searchReceipts = async (req, res, next) => {
  try {
    const result = await searchReceiptsByNationalId({
      nationalId: String(req.query.nationalId || "").trim(),
      bankEmployeeId: req.user.userId,
      limit: readLimit(req.query.limit),
      offset: readOffset(req.query.offset)
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
