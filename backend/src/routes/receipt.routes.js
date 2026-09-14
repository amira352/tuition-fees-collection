import express from "express";

import {
  receiptForPayment,
  receiptByNumber,
  searchReceipts
} from "../controllers/receipt.controller.js";

import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate(), requireRole("back_office", "admin"));

// the two fixed paths first, or "search" and "payment" get read as receipt
// numbers and you get "No receipt with number search"
router.get("/search", searchReceipts);
router.get("/payment/:paymentId", receiptForPayment);
router.get("/:receiptNumber", receiptByNumber);

export default router;
