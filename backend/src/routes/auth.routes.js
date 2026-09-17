import express from "express";

import {
  loginUser,
  changeUserPassword,
  currentUser
} from "../controllers/auth.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/loginUser", loginUser);

// Reachable with a password_change token, so a user who was just created by
// an admin can set their own password before doing anything else.
router.post(
  "/change-password",
  authenticate({ allowPasswordChangeScope: true }),
  changeUserPassword
);

// A full token only. Somebody who still has to set their password is sent
// straight to that screen, not to their profile - so there is no reason for
// a password_change token to reach this.
router.get("/me", authenticate(), currentUser);

export default router;
