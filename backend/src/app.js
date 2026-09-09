import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import bankRoutes from "./routes/searchByid.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import receiptRoutes from "./routes/receipt.routes.js";
import eppRoutes from "./routes/epp.routes.js"; // ADDED — BE-3 items 5, 6, 7
import reportRoutes from "./routes/report.routes.js"; // ADDED — BE-3 item 8
import { errorHandler } from "./middleware/errorHandler.js";
import institutionFeeUploadRoutes from "./routes/institutionFeeUpload.routes.js";

const app = express();

app.use(cors());

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Tuition Fees API is running"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/receipts", receiptRoutes);

app.use("/api/bank", bankRoutes);
app.use("/api/institutions", institutionFeeUploadRoutes);

app.use("/api/epp", eppRoutes); // ADDED

// reportRoutes defines its own full /institutions/:id/reports/daily path
// (see BE-3 item 8), so it's mounted at /api directly, not a sub-prefix.
app.use("/api", reportRoutes); // ADDED

app.use(errorHandler);

export default app;
