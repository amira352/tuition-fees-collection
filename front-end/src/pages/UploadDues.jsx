import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { CheckCircleIcon } from "../components/Icons";
import { Icon } from "./institution/icons";
import { getUser, getToken } from "../lib/auth";
import "./UploadDues.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// Mirrors backend/src/middleware/upload.middleware.js's multer limits.fileSize.
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

// Mirrors backend/src/services/institutionFeeUpload.service.js's REQUIRED_COLUMNS,
// in the order the backend documents them.
const REQUIRED_COLUMNS = [
  { key: "parent_national_id", description: "Parent national ID" },
  { key: "student_code", description: "Student code" },
  { key: "amount", description: "Fee amount" },
  { key: "currency", description: "Currency (EGP, USD, etc.)" },
  { key: "parent_name", description: "Parent name" },
  { key: "student_name", description: "Student name" },
  { key: "fee_type", description: "Fee type (Tuition, Transport, etc.)" },
  { key: "period", description: "Academic period" },
];
const REQUIRED_HEADERS = REQUIRED_COLUMNS.map((c) => c.key);

const IMPORTANT_NOTES = [
  "Use the provided template to ensure the correct column structure.",
  "Do not modify or remove column headers.",
  "Make sure all required fields are filled.",
  "The file must be in .xlsx format.",
  "Maximum file size is 5 MB.",
];

// Mirrors backend/src/services/institutionFeeUpload.service.js's validateRow().
const NATIONAL_ID_RE = /^\d{14}$/;

export default function UploadDues() {
  const fileInputRef = useRef(null);

  // Flow states: 'idle' | 'validating' | 'validation_error' | 'validated' | 'importing' | 'success' | 'partial'
  const [status, setStatus] = useState("idle");

  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState("");

  // Validation state details
  const [validationErrors, setValidationErrors] = useState([]);
  const [validRecords, setValidRecords] = useState([]);
  const [totalRecordsCount, setTotalRecordsCount] = useState(0);

  // Import error message if API fails
  const [apiError, setApiError] = useState("");

  // Real result returned by the backend after it parses + imports the file.
  const [importResult, setImportResult] = useState(null);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportError, setReportError] = useState("");

  // ----------------------------------------------------
  // 1. Download Static Excel Template File
  // ----------------------------------------------------
  function handleDownloadTemplate() {
    const link = document.createElement("a");
    link.href = "/institution_fees_template.xlsx";
    link.download = "institution_fees_template.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ----------------------------------------------------
  // 2. File Selection & Drag & Drop Handling
  // ----------------------------------------------------
  function resetState() {
    setSelectedFile(null);
    setFileError("");
    setValidationErrors([]);
    setValidRecords([]);
    setTotalRecordsCount(0);
    setApiError("");
    setImportResult(null);
    setReportError("");
    setStatus("idle");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFileSelect(file) {
    setFileError("");
    setApiError("");

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setFileError("Invalid file type. Please upload an Excel file ending with .xlsx");
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setFileError("File is too large. Maximum allowed size is 5 MB.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setStatus("idle");
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileSelect(file);
    }
  }

  // ----------------------------------------------------
  // 3. Excel Parsing & Validation Logic (client-side pre-check;
  //    the backend re-validates every row for real on import)
  // ----------------------------------------------------
  async function handleValidateFile() {
    if (!selectedFile) return;

    setStatus("validating");
    setFileError("");
    setValidationErrors([]);
    setApiError("");

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        setFileError("The uploaded Excel workbook contains no sheets.");
        setStatus("idle");
        return;
      }

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

      if (!rawRows || rawRows.length === 0) {
        setFileError("The uploaded Excel file is empty.");
        setStatus("idle");
        return;
      }

      // Header row check (Excel Row 1)
      const headers = rawRows[0].map((h) => String(h || "").trim());

      if (headers.length === 0 || headers.every((h) => h === "")) {
        setFileError("The Excel file header row is empty.");
        setStatus("idle");
        return;
      }

      // Validate header count and names
      const headerMismatchErrors = [];
      if (headers.length !== REQUIRED_HEADERS.length) {
        setFileError(
          `Header count mismatch: Expected exactly ${REQUIRED_HEADERS.length} columns in order (${REQUIRED_HEADERS.join(", ")}), but found ${headers.length} columns.`
        );
        setStatus("idle");
        return;
      }

      for (let i = 0; i < REQUIRED_HEADERS.length; i++) {
        const expected = REQUIRED_HEADERS[i];
        const actual = headers[i];
        if (actual !== expected) {
          headerMismatchErrors.push(
            `Column ${i + 1} expected '${expected}', but found '${actual || "(empty)"}'`
          );
        }
      }

      if (headerMismatchErrors.length > 0) {
        setFileError(
          `Invalid column structure: ${headerMismatchErrors.join("; ")}. Please use the exact template headers.`
        );
        setStatus("idle");
        return;
      }

      // Row-level data validation
      const errors = [];
      const validRows = [];
      let nonCountedRows = 0;

      for (let r = 1; r < rawRows.length; r++) {
        const excelRowNumber = r + 1; // 1-indexed Excel row
        const row = rawRows[r];

        // Skip completely blank rows
        const isBlank = row.every((c) => String(c || "").trim() === "");
        if (isBlank) {
          nonCountedRows++;
          continue;
        }

        const rowData = {
          parent_national_id: String(row[0] || "").trim(),
          parent_name: String(row[1] || "").trim(),
          student_code: String(row[2] || "").trim(),
          student_name: String(row[3] || "").trim(),
          fee_type: String(row[4] || "").trim(),
          period: String(row[5] || "").trim(),
          amount: row[6],
          currency: String(row[7] || "").trim(),
        };

        const rowErrors = [];

        if (!NATIONAL_ID_RE.test(rowData.parent_national_id)) {
          rowErrors.push({
            row: excelRowNumber,
            field: "parent_national_id",
            error: "Parent national ID must contain exactly 14 digits",
          });
        }

        if (!rowData.parent_name) {
          rowErrors.push({
            row: excelRowNumber,
            field: "parent_name",
            error: "Parent name is required",
          });
        }

        if (!rowData.student_code) {
          rowErrors.push({
            row: excelRowNumber,
            field: "student_code",
            error: "Student code is required",
          });
        }

        if (!rowData.student_name) {
          rowErrors.push({
            row: excelRowNumber,
            field: "student_name",
            error: "Student name is required",
          });
        }

        if (!rowData.fee_type) {
          rowErrors.push({
            row: excelRowNumber,
            field: "fee_type",
            error: "Fee type is required",
          });
        }

        if (!rowData.period) {
          rowErrors.push({
            row: excelRowNumber,
            field: "period",
            error: "Period is required",
          });
        }

        // Amount validation
        const rawAmt = rowData.amount;
        const numAmt = Number(rawAmt);
        if (rawAmt === "" || rawAmt === null || rawAmt === undefined) {
          rowErrors.push({
            row: excelRowNumber,
            field: "amount",
            error: "Amount is required",
          });
        } else if (isNaN(numAmt)) {
          rowErrors.push({
            row: excelRowNumber,
            field: "amount",
            error: "Amount must be a valid number",
          });
        } else if (numAmt <= 0) {
          rowErrors.push({
            row: excelRowNumber,
            field: "amount",
            error: "Amount must be greater than 0",
          });
        }

        if (!rowData.currency) {
          rowErrors.push({
            row: excelRowNumber,
            field: "currency",
            error: "Currency is required",
          });
        }

        if (rowErrors.length > 0) {
          errors.push(...rowErrors);
        } else {
          validRows.push({
            ...rowData,
            amount: numAmt,
          });
        }
      }

      const totalDataRows = rawRows.length - 1 - nonCountedRows;

      if (totalDataRows <= 0) {
        setFileError("The uploaded Excel file contains no data rows to import.");
        setStatus("idle");
        return;
      }

      setTotalRecordsCount(totalDataRows);
      setValidRecords(validRows);
      setValidationErrors(errors);

      if (errors.length > 0) {
        setStatus("validation_error");
      } else {
        setStatus("validated");
      }
    } catch (err) {
      setFileError("Failed to parse Excel file: " + err.message);
      setStatus("idle");
    }
  }

  // ----------------------------------------------------
  // 4. Import Dues Flow — backend parses, validates and imports for real,
  //    and is the source of truth for what actually got saved.
  // ----------------------------------------------------
  async function handleImportDues() {
    if (!selectedFile) return;

    const user = getUser();
    const institutionId = user?.id;
    if (!institutionId) {
      setApiError("Could not determine institution ID. Please log out and log in again.");
      return;
    }

    setStatus("importing");
    setApiError("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const token = getToken();
      const res = await fetch(
        `${API_URL}/institutions/${institutionId}/fees/upload`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        }
      );

      let data = null;
      try { data = await res.json(); } catch { /* no body */ }

      if (!res.ok) {
        const msg = data?.message || `Upload failed (${res.status}). Please try again.`;
        const error = new Error(msg);
        error.status = res.status;
        throw error;
      }

      const result = data?.data || null;
      setImportResult(result);
      setStatus(result?.rejected_rows > 0 ? "partial" : "success");
    } catch (err) {
      setApiError(err.message || "Failed to import dues. Please try again.");
      setStatus("validated");
    }
  }

  // ----------------------------------------------------
  // 5. Download the backend's per-row error report for a partial import
  // ----------------------------------------------------
  async function handleDownloadErrorReport() {
    const user = getUser();
    const institutionId = user?.id;
    if (!institutionId || !importResult?.upload_id) return;

    setDownloadingReport(true);
    setReportError("");

    try {
      const token = getToken();
      const res = await fetch(
        `${API_URL}/institutions/${institutionId}/uploads/${importResult.upload_id}/errors`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (!res.ok) {
        let msg = `Could not download the error report (${res.status}).`;
        try {
          const data = await res.json();
          msg = data?.message || msg;
        } catch { /* no json body */ }
        throw new Error(msg);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `upload_errors_${importResult.upload_id}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setReportError(err.message || "Could not download the error report.");
    } finally {
      setDownloadingReport(false);
    }
  }

  function formatFileSize(bytes) {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  return (
    <div className="upload-page">
      <div className="page-header">
        <span className="page-header-icon"><Icon.upload /></span>
        <h1 className="title">Upload Dues</h1>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* STATE 1: IDLE / SELECT FILE / VALIDATING                           */}
      {/* ------------------------------------------------------------------ */}
      {(status === "idle" || status === "validating") && (
        <div className="upload-flow">
          {/* Step progress bar */}
          <div className="steps-progress">
            <div className="steps-progress-item">
              <span className="steps-progress-circle is-current">1</span>
              <span className="steps-progress-title">Download Template</span>
            </div>
            <span className="steps-progress-line" />
            <div className="steps-progress-item">
              <span className="steps-progress-circle">2</span>
              <span className="steps-progress-title">Fill the Template</span>
            </div>
            <span className="steps-progress-line" />
            <div className="steps-progress-item">
              <span className="steps-progress-circle">3</span>
              <span className="steps-progress-title">Upload File</span>
            </div>
          </div>

          <div className="upload-layout">
            {/* Main card: 3 numbered sections stacked */}
            <div className="upload-main-card">
              <section className="upload-section">
                <div className="upload-section-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <div className="upload-section-body">
                  <h2 className="upload-section-title">1. Download Template</h2>
                  <button
                    type="button"
                    className="step-btn secondary"
                    onClick={handleDownloadTemplate}
                  >
                    <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Excel Template
                  </button>
                </div>
              </section>

              <section className="upload-section">
                <div className="upload-section-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="upload-section-body">
                  <div className="upload-section-title-row">
                    <h2 className="upload-section-title">2. Required Columns</h2>
                    <span className="upload-section-tag">{REQUIRED_HEADERS.length} required</span>
                  </div>
                  <div className="column-tags">
                    {REQUIRED_HEADERS.map((h) => (
                      <span key={h} className="col-tag">{h}</span>
                    ))}
                  </div>
                </div>
              </section>

              <section className="upload-section">
                <div className="upload-section-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div className="upload-section-body">
                  <h2 className="upload-section-title">3. Upload File</h2>

                  {/* Drag and Drop Zone */}
                  <div
                    className={`dropzone ${isDragOver ? "drag-over" : ""} ${selectedFile ? "has-file" : ""}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !selectedFile && fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      className="file-input-hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFileSelect(e.target.files[0]);
                        }
                      }}
                    />

                    {!selectedFile ? (
                      <div className="dropzone-content">
                        <div className="dropzone-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <p className="dropzone-primary-text">
                          Drag & Drop Excel file here
                        </p>
                        <p className="dropzone-secondary-text">or <span className="browse-link">Browse Files</span></p>
                        <span className="format-tag">Supported format: .xlsx &nbsp;|&nbsp; Maximum file size: 5 MB</span>
                      </div>
                    ) : (
                      <div className="selected-file-card">
                        <div className="file-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="file-details">
                          <span className="file-name">{selectedFile.name}</span>
                          <span className="file-size">{formatFileSize(selectedFile.size)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons for Step 3 */}
                  {selectedFile && (
                    <div className="file-actions">
                      <button
                        type="button"
                        className="action-btn outline"
                        onClick={resetState}
                        disabled={status === "validating"}
                      >
                        Remove File
                      </button>
                      <button
                        type="button"
                        className="action-btn primary"
                        onClick={handleValidateFile}
                        disabled={status === "validating"}
                      >
                        {status === "validating" ? (
                          <>
                            <span className="spinner" />
                            Validating…
                          </>
                        ) : (
                          "Validate & Upload"
                        )}
                      </button>
                    </div>
                  )}

                  {/* File Error Alert */}
                  {fileError && (
                    <div className="alert danger-alert" role="alert">
                      <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{fileError}</span>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Sidebar: Important Notes + Template Columns */}
            <aside className="upload-sidebar">
              <div className="notes-card">
                <div className="notes-card-head">
                  <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
                    <path strokeLinecap="round" strokeWidth="1.8" d="M12 8h.01M11 12h1v4h1" />
                  </svg>
                  <h3>Important Notes</h3>
                </div>
                <ul className="notes-list">
                  {IMPORTANT_NOTES.map((note) => (
                    <li key={note}>
                      <span className="notes-list-icon"><CheckCircleIcon /></span>
                      {note}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="columns-card">
                <div className="notes-card-head">
                  <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3>Template Columns</h3>
                </div>
                <div className="columns-table-wrap">
                  <table className="columns-table">
                    <thead>
                      <tr>
                        <th>Column Name</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {REQUIRED_COLUMNS.map((c) => (
                        <tr key={c.key}>
                          <td><code>{c.key}</code></td>
                          <td>{c.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STATE 2: VALIDATION ERRORS FOUND                                   */}
      {/* ------------------------------------------------------------------ */}
      {status === "validation_error" && (
        <div className="result-card error-state">
          <div className="result-header danger">
            <div className="status-badge danger">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="result-title">File contains errors</h2>
              <p className="result-subtitle">
                Found {validationErrors.length} error{validationErrors.length > 1 ? "s" : ""} across{" "}
                {new Set(validationErrors.map((e) => e.row)).size} row{new Set(validationErrors.map((e) => e.row)).size > 1 ? "s" : ""}. Please correct the Excel file and upload again.
              </p>
            </div>
          </div>

          {/* Error Table */}
          <div className="table-wrapper">
            <table className="error-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Field</th>
                  <th>Error Description</th>
                </tr>
              </thead>
              <tbody>
                {validationErrors.map((err, idx) => (
                  <tr key={idx}>
                    <td className="row-cell">
                      <span className="row-tag">Row {err.row}</span>
                    </td>
                    <td className="field-cell">
                      <code>{err.field}</code>
                    </td>
                    <td className="msg-cell">{err.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="result-footer">
            <button type="button" className="action-btn primary" onClick={resetState}>
              Upload Corrected File
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STATE 3: VALIDATED SUCCESSFULLY                                    */}
      {/* ------------------------------------------------------------------ */}
      {(status === "validated" || status === "importing") && (
        <div className="result-card success-preview-state">
          <div className="result-header success">
            <div className="status-badge success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="result-title">File validated successfully</h2>
              <p className="result-subtitle">
                All records passed validation and are ready to be imported into the system.
              </p>
            </div>
          </div>

          {/* Summary Stats Grid */}
          <div className="stats-grid">
            <div className="stat-box">
              <span className="stat-value">{totalRecordsCount}</span>
              <span className="stat-label">Records Found</span>
            </div>
            <div className="stat-box valid">
              <span className="stat-value">{validRecords.length}</span>
              <span className="stat-label">Valid Records</span>
            </div>
            <div className="stat-box zero-errors">
              <span className="stat-value">0</span>
              <span className="stat-label">Errors</span>
            </div>
          </div>

          {apiError && (
            <div className="alert danger-alert" role="alert">
              {apiError}
            </div>
          )}

          <div className="result-footer actions-row">
            <button
              type="button"
              className="action-btn outline"
              onClick={resetState}
              disabled={status === "importing"}
            >
              Select Different File
            </button>
            <button
              type="button"
              className="action-btn primary lg"
              onClick={handleImportDues}
              disabled={status === "importing"}
            >
              {status === "importing" ? (
                <>
                  <span className="spinner" />
                  Importing Dues…
                </>
              ) : (
                "Import Dues"
              )}
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STATE 4: SUCCESS CONFIRMATION (backend accepted every row)         */}
      {/* ------------------------------------------------------------------ */}
      {status === "success" && importResult && (
        <div className="result-card success-final-state">
          <div className="success-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="final-title">Dues uploaded successfully</h2>
          <p className="final-subtitle">
            The tuition fees dues have been validated and processed into the system.
          </p>

          <div className="stats-grid">
            <div className="stat-box valid">
              <span className="stat-value">{importResult.accepted_rows}</span>
              <span className="stat-label">Dues Uploaded</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">{importResult.total_rows}</span>
              <span className="stat-label">Records Processed</span>
            </div>
            <div className="stat-box zero-errors">
              <span className="stat-value">{importResult.rejected_rows}</span>
              <span className="stat-label">Errors</span>
            </div>
          </div>

          <div className="result-footer center">
            <button type="button" className="action-btn primary lg" onClick={resetState}>
              Upload Another File
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STATE 5: PARTIAL IMPORT (backend rejected some rows)               */}
      {/* ------------------------------------------------------------------ */}
      {status === "partial" && importResult && (
        <div className="result-card error-state">
          <div className="result-header danger">
            <div className="status-badge danger">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="result-title">Some rows could not be imported</h2>
              <p className="result-subtitle">
                The server processed the file but rejected {importResult.rejected_rows} of{" "}
                {importResult.total_rows} row{importResult.total_rows > 1 ? "s" : ""}. Download the error
                report to see exactly what to fix.
              </p>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-box valid">
              <span className="stat-value">{importResult.accepted_rows}</span>
              <span className="stat-label">Imported</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">{importResult.total_rows}</span>
              <span className="stat-label">Total Rows</span>
            </div>
            <div className="stat-box danger">
              <span className="stat-value">{importResult.rejected_rows}</span>
              <span className="stat-label">Rejected</span>
            </div>
          </div>

          {reportError && (
            <div className="alert danger-alert" role="alert">{reportError}</div>
          )}

          <div className="result-footer actions-row">
            <button type="button" className="action-btn outline" onClick={resetState}>
              Upload Another File
            </button>
            {importResult.error_report_available && (
              <button
                type="button"
                className="action-btn primary lg"
                onClick={handleDownloadErrorReport}
                disabled={downloadingReport}
              >
                {downloadingReport ? (
                  <>
                    <span className="spinner" />
                    Downloading…
                  </>
                ) : (
                  "Download Error Report"
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
