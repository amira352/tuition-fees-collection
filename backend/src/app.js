import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import bankRoutes from "./routes/searchByid.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(cors());

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Tuition Fees API is running"
  });
});

app.use("/api/auth", authRoutes);

app.use("/api/bank", bankRoutes);

app.use(errorHandler);

export default app;