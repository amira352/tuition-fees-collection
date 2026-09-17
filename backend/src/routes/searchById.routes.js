import express from "express";

import {
  searchParent
} from "../controllers/searchById.controller.js";

import { getAccounts } from "../controllers/bank.controller.js"; // ADDED — BE-3 item 1

import {
  authenticate
} from "../middleware/auth.middleware.js";

import {
  authorizeRoles
} from "../middleware/role.middleware.js";


const router = express.Router();


router.post(
  "/parents/search",

  authenticate(),

  authorizeRoles("back_office", "admin"),

  searchParent
);

// ADDED — BE-3 item 1. Reuses the same /api/bank namespace already mounted
// in app.js, per the ticket's instruction, rather than inventing a second one.
//
// Same roles as /parents/search above: the two are used by the same screen,
// so allowing one and not the other leaves an admin with a search that works
// and a customer panel that 403s.
router.get(
  "/customers/:nationalId/accounts",

  authenticate(),

  authorizeRoles("back_office", "admin"),

  getAccounts
);


export default router;
