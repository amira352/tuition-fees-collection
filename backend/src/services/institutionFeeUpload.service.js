import crypto from "crypto";
import XLSX from "xlsx";
import { createNationalIdHmac } from "../utils/hmac.js";
import { encryptNationalId } from "../utils/encryption.js";

import { findInstitutionById } from "../repositories/institution.repository.js";

import {
  findParentByNationalIdHmac,
  createParent
} from "../repositories/parent.repository.js";

import {
  findChildByStudentCode,
  createChild
} from "../repositories/children.repository.js";

import { upsertFee } from "../repositories/fee.repository.js";

import {
  findUploadByContentHash,
  createCsvUpload,
  findCsvUploadById
} from "../repositories/csvUpload.repository.js";


const REQUIRED_COLUMNS = [
  "parent_national_id",
  "parent_name",
  "student_code",
  "student_name",
  "fee_type",
  "period",
  "amount",
  "currency"
];


const parseXlsxFile = (fileBuffer) => {
  try {
    const workbook = XLSX.read(fileBuffer, {
      type: "buffer"
    });

    const sheetName = workbook.SheetNames[0];

    const worksheet = workbook.Sheets[sheetName];

    const records = XLSX.utils.sheet_to_json(
      worksheet,
      {
        defval: "",
        raw: false
      }
    );

    return records;

  } catch (error) {

    const err = new Error("Invalid XLSX file");

    err.statusCode = 400;

    throw err;
  }
};


const validateColumns = (records) => {

  if (!records.length) {
    const error = new Error(
      "CSV file is empty"
    );

    error.statusCode = 400;

    throw error;
  }

  const actualColumns =
    Object.keys(records[0]);

  const missingColumns =
    REQUIRED_COLUMNS.filter(
      column =>
        !actualColumns.includes(column)
    );

  if (missingColumns.length > 0) {

    const error = new Error(
      `Missing required columns: ${missingColumns.join(", ")}`
    );

    error.statusCode = 400;

    throw error;
  }
};


const validateRow = (row, rowNumber) => {
  const errors = [];

  // National ID must contain exactly 14 digits
  if (!row.parent_national_id || !/^\d{14}$/.test(row.parent_national_id)) {
    errors.push("parent_national_id must contain exactly 14 digits");
  }

  if (!row.parent_name || row.parent_name.trim() === "") {
    errors.push("parent_name is required");
  }

  if (!row.student_code || row.student_code.trim() === "") {
    errors.push("student_code is required");
  }

  if (!row.student_name || row.student_name.trim() === "") {
    errors.push("student_name is required");
  }

  if (!row.fee_type || row.fee_type.trim() === "") {
    errors.push("fee_type is required");
  }

  if (!row.period || row.period.trim() === "") {
    errors.push("period is required");
  }

  const amount = Number(row.amount);

  if (
    !row.amount ||
    Number.isNaN(amount) ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    errors.push("amount must be a positive number");
  }

  if (!row.currency || row.currency.trim() === "") {
    errors.push("currency is required");
  }

  return {
    valid: errors.length === 0,
    errors,
    rowNumber
  };
};


const processValidRow = async ({
  row,
  institutionId
}) => {

  const nationalIdHmac =
    createNationalIdHmac(
      row.parent_national_id
    );

  let parent =
    await findParentByNationalIdHmac(
      nationalIdHmac
    );

  if (!parent) {

    const nationalIdEncrypted =
      encryptNationalId(
        row.parent_national_id
      );

    parent =
      await createParent({
        nationalIdHmac,
        nationalIdEncrypted,
        name: row.parent_name
      });
  }

  let child =
    await findChildByStudentCode({
      institutionId,
      studentCode: row.student_code
    });

  if (!child) {

    child = await createChild({
      parentId: parent.id,
      institutionId,
      name: row.student_name,
      studentCode: row.student_code
    });
  }

  await upsertFee({
    childId: child.id,
    feeType:
      row.fee_type,
    period: row.period,
    amount: Number(row.amount),
    currency: row.currency
  });
};


export const uploadInstitutionFeesCsv = async ({
  institutionId,
  file
}) => {

  const institution =
    await findInstitutionById(
      institutionId
    );

  if (!institution) {

    const error = new Error(
      "Institution not found"
    );

    error.statusCode = 404;

    throw error;
  }

  const contentHash =
    crypto
      .createHash("sha256")
      .update(file.buffer)
      .digest("hex");

  const existingUpload =
    await findUploadByContentHash(
      institutionId,
      contentHash
    );

  if (existingUpload) {

    const error = new Error(
      "This CSV file has already been uploaded"
    );

    error.statusCode = 409;

    throw error;
  }

  const records =
    parseXlsxFile(file.buffer);

  validateColumns(records);

  const rowErrors = [];

  let acceptedRows = 0;
  let rejectedRows = 0;

  for (
    let index = 0;
    index < records.length;
    index++
  ) {

    const row = records[index];

    const rowNumber =
      index + 2;

    const validation =
      validateRow(
        row,
        rowNumber
      );

    if (!validation.valid) {

      rejectedRows++;

      rowErrors.push({
        row_number: rowNumber,
        row,
        errors: validation.errors
      });

      continue;
    }

    try {

      await processValidRow({
        row,
        institutionId
      });

      acceptedRows++;

    } catch (error) {

      rejectedRows++;

      rowErrors.push({
        row_number: rowNumber,
        row,
        errors: [
          error.message
        ]
      });
    }
  }

  const upload =
    await createCsvUpload({
      institutionId,
      filename: file.originalname,
      contentHash,
      totalRows: records.length,
      acceptedRows,
      rejectedRows,
      errors: rowErrors
    });

  return {
    upload_id: upload.id,
    filename: file.originalname,
    total_rows: records.length,
    accepted_rows: acceptedRows,
    rejected_rows: rejectedRows,
    error_report_available:
      rejectedRows > 0
  };
};


export const getUploadErrors = async ({
  uploadId,
  institutionId
}) => {

  const upload =
    await findCsvUploadById(
      uploadId,
      institutionId
    );

  if (!upload) {

    const error = new Error(
      "Upload not found"
    );

    error.statusCode = 404;

    throw error;
  }

  return {
    filename: upload.filename,
    errors: upload.errors_json || []
  };
};