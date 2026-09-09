import express from "express";

import { payFees, handleExternalTransferWebhook } from "../controllers/payment.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";
import { requireWebhookSecret } from "../middleware/webhookAuth.middleware.js"; // ADDED

const router = express.Router();

// The webhook route below is called by an external system, not a
// logged-in employee — it needs to skip the normal auth entirely and use
// its own shared-secret check instead. Everything else on this router
// still requires the usual login + role.
router.use((req, res, next) => {
  if (req.path === "/external-transfers/webhook") return next();
  return authenticate()(req, res, () => requireRole("back_office", "admin")(req, res, next));
});

router.post("/", payFees);

// ADDED — BE-3 item 4
router.post("/external-transfers/webhook", requireWebhookSecret, handleExternalTransferWebhook);

export default router;
