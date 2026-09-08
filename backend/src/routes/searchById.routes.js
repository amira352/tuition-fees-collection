import express from "express";

import {
  searchParent
} from "../controllers/searchById.controller.js";

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

  authorizeRoles("back_office"),

  searchParent
);


export default router;