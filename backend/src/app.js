import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";


const app = express();


// Middleware
app.use(cors());

app.use(express.json());


// Routes
app.use("/api/auth", authRoutes);


// Health check
app.get("/", (req, res) => {
  res.json({
    message: "Fee Payment System API is running"
  });
});


// Error handling
app.use(errorHandler);


export default app;