import express from "express";
import cors from "cors";
import productRoutes from "./routes/products.js";
import brandRoutes from "./routes/brands.js";
import healthRoutes from "./routes/health.js";

const app = express();

app.use(cors());
app.use(express.json());

// health route
app.use("/health", healthRoutes);

// API routes
app.use("/api/products", productRoutes);
app.use("/api/brands", brandRoutes);

export default app;
