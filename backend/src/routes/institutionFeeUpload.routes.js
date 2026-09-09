import express from "express";

import {
  uploadFeesCsv,
  downloadUploadErrors
} from "../controllers/institutionFeeUpload.controller.js";

import {
  authenticate
} from "../middleware/auth.middleware.js";

import {
  authorizeRoles
} from "../middleware/role.middleware.js";

import {
  authorizeInstitutionAccess
} from "../middleware/institutionAccess.middleware.js";

import {
  uploadCsv
} from "../middleware/upload.middleware.js";


const router = express.Router();


router.post(
  "/:id/fees/upload",

  authenticate(),

  authorizeRoles("institution"),

  authorizeInstitutionAccess,

  uploadCsv.single("file"),

  uploadFeesCsv
);


router.get(
  "/:id/uploads/:uploadId/errors",

  authenticate(),

  authorizeRoles("institution"),

  authorizeInstitutionAccess,

  downloadUploadErrors
);


export default router;