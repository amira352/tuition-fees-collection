import express from "express";

import {
  receiptForPayment,
  receiptByNumber
} from "../controllers/receipt.controller.js";

import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate(), requireRole("back_office", "admin"));

// this one first, or "payment" would be read as a receipt number
router.get("/payment/:paymentId", receiptForPayment);
router.get("/:receiptNumber", receiptByNumber);

export default router;
