export const requireWebhookSecret = (req, res, next) => {
  const secret = req.headers["x-webhook-secret"];
  if (!secret || secret !== process.env.EXTERNAL_TRANSFER_WEBHOOK_SECRET) {
    const error = new Error("Valid X-Webhook-Secret header required");
    error.statusCode = 401;
    error.code = "UNAUTHORIZED_WEBHOOK";
    return next(error);
  }
  next();
};
