// BE-3 item 9: one error shape for the whole API — { code, message, field }.
// Existing code across the team only sets .message and .statusCode on
// thrown errors; .code and .field are optional additions from here on.
// Older throw sites keep working (code falls back to a generic one derived
// from the status), so this doesn't require retrofitting every existing
// file today — but new code should set .code explicitly.
const DEFAULT_CODES = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  402: "PAYMENT_DECLINED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "VALIDATION_ERROR",
  502: "UPSTREAM_ERROR"
};

export const errorHandler = (err, req, res, next) => {
  console.error(err);

  const statusCode = err.statusCode || 500;
  const code = err.code || DEFAULT_CODES[statusCode] || "INTERNAL_ERROR";

  return res.status(statusCode).json({
    code,
    message: statusCode === 500 ? "Internal server error" : err.message,
    field: err.field || null
  });
};
