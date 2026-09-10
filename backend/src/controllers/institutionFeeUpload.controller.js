import {
  uploadInstitutionFeesCsv,
  getUploadErrors
} from "../services/institutionFeeUpload.service.js";


export const uploadFeesCsv = async (
  req,
  res,
  next
) => {

  try {

    const institutionId =
      req.params.id;

    if (!req.file) {

      return res.status(400).json({
        message:
          "CSV file is required"
      });
    }

    const result =
      await uploadInstitutionFeesCsv({
        institutionId,
        file: req.file
      });

    res.status(201).json({
      message:
        "CSV processed successfully",
      data: result
    });

  } catch (error) {
    next(error);
  }
};


export const downloadUploadErrors = async (
  req,
  res,
  next
) => {

  try {

    const {
      id: institutionId,
      uploadId
    } = req.params;

    const result =
      await getUploadErrors({
        uploadId,
        institutionId
      });

    const errors = result.errors;

    if (!errors.length) {

      return res.status(404).json({
        message:
          "No errors found for this upload"
      });
    }

    const headers = [
      "row_number",
      "parent_national_id",
      "parent_name",
      "student_code",
      "student_name",
      "fee_type",
      "period",
      "amount",
      "currency",
      "errors"
    ];

    const csvRows = [
      headers.join(",")
    ];

    for (const item of errors) {

      const row = item.row;

      csvRows.push([
        item.row_number,
        row.parent_national_id,
        row.parent_name,
        row.student_code,
        row.student_name,
        row.fee_type,
        row.period,
        row.amount,
        row.currency,
        item.errors.join(" | ")
      ]
        .map(value => {
          const escaped =
            String(value ?? "")
              .replace(/"/g, '""');

          return `"${escaped}"`;
        })
        .join(",")
      );
    }

    const csvContent =
      csvRows.join("\n");

    res.setHeader(
      "Content-Type",
      "text/csv"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="upload_errors_${uploadId}.csv"`
    );

    res.send(csvContent);

  } catch (error) {
    next(error);
  }
};