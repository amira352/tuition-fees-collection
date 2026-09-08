import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import bankRoutes from "./routes/searchByid.routes.js";
import adminRoutes from "./routes/admin.routes.js";
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

app.use("/api/bank", bankRoutes);
app.use("/api/institutions", institutionFeeUploadRoutes);

app.use(errorHandler);

export default app;